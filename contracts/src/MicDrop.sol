// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBuybackAdapter} from "./interfaces/IBuybackAdapter.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @title MicDrop — graduation-gated buyback & burn (proportional cap, fee-aware)
/// @notice Pre-graduation: HOLD USDG (cap 50k; overflow reverts on `deposit`).
///         Post-graduation: keeper swaps USDG -> $HAHA via the structured
///         Robinhood Universal Router adapter (native ETH may be an intermediate)
///         and burns to 0xdead. No configured/quoted route means HOLD.
/// @dev Buyback cap is PROPORTIONAL, not nominal: amount <= 2% of pool reserve
///      AND implied price impact <= 1% (the tighter of the two binds).
///      `minHahaOut` must be computed from the current route quote including
///      pool/hook/creator fees. The creator recipient is whatever the Pons CA
///      recorded; it is not assumed to be FeeSplitter.
contract MicDrop is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public constant HOLD_CAP_MICRO = 50_000_000_000; // 50k USDG (6 dec)
    /// @notice Confirm timeout is CONSTRUCTOR-SET (not a constant): mainnet
    ///         deploy script passes 48h so mainnet semantics stay untouched,
    ///         while a testnet redeploy uses a short window for rehearsal —
    ///         same bytecode path, no code divergence between environments.
    uint256 public immutable confirmDelay;
    uint256 public constant MAX_BUYBACK_BPS = 200; // 2% of pool reserve
    uint256 public constant MAX_IMPACT_BPS = 100; // 1% price impact
    uint256 public constant EXPECTED_CREATOR_TAX_BPS = 200; // locked 2% (K2)
    address public constant BURN_ADDRESS = address(0x000000000000000000000000000000000000dEaD);

    IERC20 public immutable usdg;

    address public router;
    address public hahaToken;
    bool public poolGraduated;
    uint256 public poolReserveUsdg; // micro-USDG, refreshed by sync-chain cron
    uint256 public reserveUpdatedAt;
    uint256 public constant MAX_RESERVE_AGE = 15 minutes;
    bytes public buybackRoute;
    bytes public pendingRoute;
    uint256 public routeEta;
    address public pendingRouter;
    uint256 public routerEta;

    address public pendingHahaToken;
    bytes32 public pendingLaunchTxHash;
    uint256 public pendingHahaEta;

    event MicDropHeld(uint256 balanceMicro);
    event MicDropBurned(uint256 indexed amountUsdg, uint256 hahaOut);
    event HahaTokenProposed(address indexed token, bytes32 launchTxHash, uint256 eta);
    event HahaTokenConfirmed(address indexed token);
    event Graduated(bool graduated);
    event PoolReserveUpdated(uint256 reserveUsdg);

    error NotGraduated();
    error HahaTokenUnset();
    error HoldCapExceeded();
    error CapExceeded();
    error ImpactTooHigh();
    error TimelockNotReady();
    error NoPendingToken();
    error BadFeeRecipient();
    error BadPairToken();
    error BadCreatorTax();
    error BuybackMustBeOff();
    error ExemptNotEmpty();
    error DeadlineExpired();
    error ZeroAddress();
    error InvalidToken();
    error RouteUnset();
    error StaleReserve();
    error InvalidOutput();

    constructor(
        address usdg_,
        address router_,
        address admin_,
        address keeper_,
        uint256 confirmDelay_
    ) {
        if (usdg_ == address(0) || admin_ == address(0) || keeper_ == address(0)) {
            revert ZeroAddress();
        }
        usdg = IERC20(usdg_);
        router = router_;
        confirmDelay = confirmDelay_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(KEEPER_ROLE, keeper_);
    }

    modifier onlyAdminOrKeeper() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(KEEPER_ROLE, msg.sender), "not-admin-or-keeper"
        );
        _;
    }

    /// @notice Propose a token CA. Creator-fee settings are deliberately not
    ///         part of token identity; buyback remains disabled until a route is set.
    function proposeHahaToken(address token, bytes32 launchTxHash) public onlyAdminOrKeeper {
        if (token == address(0)) revert ZeroAddress();
        if (token.code.length == 0 || token == address(usdg)) revert InvalidToken();
        IERC20(token).totalSupply();
        if (IERC20Metadata(token).decimals() > 36) revert InvalidToken();
        pendingHahaToken = token;
        pendingLaunchTxHash = launchTxHash;
        pendingHahaEta = block.timestamp + confirmDelay;
        emit HahaTokenProposed(token, launchTxHash, pendingHahaEta);
    }

    /// @notice Convenience overload without launchTxHash.
    function proposeHahaToken(address token) external onlyAdminOrKeeper {
        proposeHahaToken(token, bytes32(0));
    }

    /// @notice Backwards-compatible overload. Legacy launch settings are ignored.
    function proposeHahaToken(
        address token,
        bytes32 launchTxHash,
        address,
        address,
        uint256,
        bool,
        uint256
    ) external onlyAdminOrKeeper {
        proposeHahaToken(token, launchTxHash);
    }

    function confirmHahaToken() external onlyAdminOrKeeper {
        if (pendingHahaToken == address(0)) revert NoPendingToken();
        if (block.timestamp < pendingHahaEta) revert TimelockNotReady();
        hahaToken = pendingHahaToken;
        poolGraduated = false;
        poolReserveUsdg = 0;
        reserveUpdatedAt = 0;
        delete buybackRoute;
        delete pendingRoute;
        routeEta = 0;
        emit HahaTokenConfirmed(pendingHahaToken);
        pendingHahaToken = address(0);
        pendingLaunchTxHash = bytes32(0);
        pendingHahaEta = 0;
    }

    /// @notice Called by the sync-chain cron with graduation proof (post pool graduation).
    function setGraduated(bool graduated) external onlyAdminOrKeeper {
        poolGraduated = graduated;
        emit Graduated(graduated);
    }

    function setPoolReserve(uint256 reserveUsdg) external onlyAdminOrKeeper {
        poolReserveUsdg = reserveUsdg;
        reserveUpdatedAt = block.timestamp;
        emit PoolReserveUpdated(reserveUsdg);
    }

    function proposeSetRouter(address router_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (router_.code.length == 0) revert RouteUnset();
        pendingRouter = router_;
        routerEta = block.timestamp + confirmDelay;
    }
    function confirmSetRouter() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if(routerEta == 0 || block.timestamp < routerEta) revert TimelockNotReady();
        if (router != address(0)) usdg.forceApprove(router, 0);
        router = pendingRouter;
        pendingRouter = address(0);
        routerEta = 0;
        delete buybackRoute;
        delete pendingRoute;
        routeEta = 0;
        poolReserveUsdg = 0;
        reserveUpdatedAt = 0;
    }
    function proposeBuybackRoute(bytes calldata route) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if(hahaToken == address(0) || router.code.length == 0 || !IBuybackAdapter(router).validateRoute(hahaToken, route)) revert RouteUnset();
        pendingRoute = route;
        routeEta = block.timestamp + confirmDelay;
    }
    function confirmBuybackRoute() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if(routeEta == 0 || block.timestamp < routeEta) revert TimelockNotReady();
        if(!IBuybackAdapter(router).validateRoute(hahaToken,pendingRoute)) revert RouteUnset();
        buybackRoute = pendingRoute;
        delete pendingRoute;
        routeEta = 0;
        poolReserveUsdg = 0;
        reserveUpdatedAt = 0;
    }

    function hasBuybackRoute() external view returns(bool) { return buybackRoute.length != 0; }
    function getBuybackRoute() external view returns(bytes memory) { return buybackRoute; }

    /// @notice Pull USDG in via transferFrom. Pre-graduation HOLD with 50k cap.
    function deposit(uint256 amountMicro) external nonReentrant {
        usdg.safeTransferFrom(msg.sender, address(this), amountMicro);
        if (!poolGraduated && usdg.balanceOf(address(this)) > HOLD_CAP_MICRO) revert HoldCapExceeded();
        emit MicDropHeld(usdg.balanceOf(address(this)));
    }

    /// @notice Swap USDG -> $HAHA and burn. Only post-graduation with token pinned.
    function executeBuyback(uint256 amountUsdg, uint256 minHahaOut, uint256 minHopPriceX36, uint256 deadline)
        external
        onlyRole(KEEPER_ROLE)
        nonReentrant
    {
        if (!poolGraduated) revert NotGraduated();
        if (hahaToken == address(0)) revert HahaTokenUnset();
        if (buybackRoute.length == 0 || router.code.length == 0) revert RouteUnset();
        if (reserveUpdatedAt == 0 || block.timestamp > reserveUpdatedAt + MAX_RESERVE_AGE) revert StaleReserve();
        if (amountUsdg == 0 || minHahaOut == 0) revert InvalidOutput();
        if (block.timestamp > deadline) revert DeadlineExpired();
        // Proportional cap: <= 2% of pool reserve ...
        if (amountUsdg * 10_000 > poolReserveUsdg * MAX_BUYBACK_BPS) revert CapExceeded();
        // ... AND price impact <= 1% (amount / (reserve + amount)).
        if (amountUsdg * 10_000 > (poolReserveUsdg + amountUsdg) * MAX_IMPACT_BPS) revert ImpactTooHigh();
        usdg.forceApprove(router, amountUsdg);
        uint256 beforeBalance = IERC20(hahaToken).balanceOf(address(this));
        uint256 inputBefore = usdg.balanceOf(address(this));
        IBuybackAdapter(router).swapExactInput(hahaToken,amountUsdg,minHahaOut,minHopPriceX36,deadline,buybackRoute);
        usdg.forceApprove(router,0);
        uint256 hahaOut = IERC20(hahaToken).balanceOf(address(this)) - beforeBalance;
        if(hahaOut < minHahaOut || inputBefore - usdg.balanceOf(address(this)) != amountUsdg) revert InvalidOutput();
        IERC20(hahaToken).safeTransfer(BURN_ADDRESS, hahaOut);
        emit MicDropBurned(amountUsdg, hahaOut);
    }
}
