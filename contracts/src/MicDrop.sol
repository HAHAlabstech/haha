// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IUniversalRouter} from "./interfaces/IUniversalRouter.sol";

/// @title MicDrop — graduation-gated buyback & burn (proportional cap, fee-aware)
/// @notice Pre-graduation: HOLD USDG (cap 50k; overflow reverts on `deposit`).
///         Post-graduation: keeper swaps USDG -> $HAHA via the Robinhood
///         Universal Router (minHopPriceX36 calldata) and burns to 0xdead.
/// @dev Buyback cap is PROPORTIONAL, not nominal: amount <= 2% of pool reserve
///      AND implied price impact <= 1% (the tighter of the two binds).
///      `minHahaOut` must be computed AFTER the hook fee (1%) + creator tax
///      (2% back to the FeeSplitter) — the mock router enforces this.
contract MicDrop is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public constant HOLD_CAP_MICRO = 50_000_000_000; // 50k USDG (6 dec)
    uint256 public constant CONFIRM_DELAY = 48 hours;
    uint256 public constant MAX_BUYBACK_BPS = 200; // 2% of pool reserve
    uint256 public constant MAX_IMPACT_BPS = 100; // 1% price impact
    uint256 public constant EXPECTED_CREATOR_TAX_BPS = 200; // locked 2% (K2)
    address public constant BURN_ADDRESS = address(0x000000000000000000000000000000000000dEaD);

    IERC20 public immutable usdg;
    address public immutable feeSplitter;

    address public router;
    address public hahaToken;
    bool public poolGraduated;
    uint256 public poolReserveUsdg; // micro-USDG, refreshed by sync-chain cron

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

    constructor(address usdg_, address feeSplitter_, address router_, address admin_, address keeper_) {
        if (usdg_ == address(0) || feeSplitter_ == address(0) || admin_ == address(0) || keeper_ == address(0)) {
            revert ZeroAddress();
        }
        usdg = IERC20(usdg_);
        feeSplitter = feeSplitter_;
        router = router_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(KEEPER_ROLE, keeper_);
    }

    modifier onlyAdminOrKeeper() {
        require(
            hasRole(DEFAULT_ADMIN_ROLE, msg.sender) || hasRole(KEEPER_ROLE, msg.sender), "not-admin-or-keeper"
        );
        _;
    }

    /// @notice Propose the Pons-launched $HAHA with on-chain launch guardrails.
    /// @dev Anti-spoof: launchTxHash pins the Pons launch tx; feeRecipient must
    ///      be the FeeSplitter, pair USDG, tax exactly 200bps, Pons buyback OFF
    ///      (else sweep needs the Pons operator), and zero extra exempts.
    function proposeHahaToken(
        address token,
        bytes32 launchTxHash,
        address feeRecipient,
        address pairToken,
        uint256 creatorTaxBps,
        bool buybackEnabled,
        uint256 exemptCount
    ) external onlyAdminOrKeeper {
        if (token == address(0)) revert ZeroAddress();
        if (feeRecipient != feeSplitter) revert BadFeeRecipient();
        if (pairToken != address(usdg)) revert BadPairToken();
        if (creatorTaxBps != EXPECTED_CREATOR_TAX_BPS) revert BadCreatorTax();
        if (buybackEnabled) revert BuybackMustBeOff();
        if (exemptCount != 0) revert ExemptNotEmpty();
        pendingHahaToken = token;
        pendingLaunchTxHash = launchTxHash;
        pendingHahaEta = block.timestamp + CONFIRM_DELAY;
        emit HahaTokenProposed(token, launchTxHash, pendingHahaEta);
    }

    function confirmHahaToken() external onlyAdminOrKeeper {
        if (pendingHahaToken == address(0)) revert NoPendingToken();
        if (block.timestamp < pendingHahaEta) revert TimelockNotReady();
        hahaToken = pendingHahaToken;
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
        emit PoolReserveUpdated(reserveUsdg);
    }

    function setRouter(address router_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        router = router_;
    }

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
        if (block.timestamp > deadline) revert DeadlineExpired();
        // Proportional cap: <= 2% of pool reserve ...
        if (amountUsdg * 10_000 > poolReserveUsdg * MAX_BUYBACK_BPS) revert CapExceeded();
        // ... AND price impact <= 1% (amount / (reserve + amount)).
        if (amountUsdg * 10_000 > (poolReserveUsdg + amountUsdg) * MAX_IMPACT_BPS) revert ImpactTooHigh();
        usdg.forceApprove(router, amountUsdg);
        uint256 hahaOut = IUniversalRouter(router).swapExactUsdgForHaha(
            IUniversalRouter.ExactInputParams({
                amountIn: amountUsdg,
                minHopPriceX36: minHopPriceX36,
                minHahaOut: minHahaOut,
                deadline: deadline
            })
        );
        IERC20(hahaToken).safeTransfer(BURN_ADDRESS, hahaOut);
        emit MicDropBurned(amountUsdg, hahaOut);
    }
}
