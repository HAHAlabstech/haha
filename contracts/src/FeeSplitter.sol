// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IPonsFeeEscrow} from "./interfaces/IPonsFeeEscrow.sol";
import {IPonsCurve, IPonsHook} from "./interfaces/IPonsSweep.sol";

/// @title FeeSplitter — USDG-ONLY creator-fee splitter (70% TipJar / 30% MicDrop)
/// @notice The Pons V2 launch pair is USDG, so creator fees always arrive as
///         USDG. The ETH swap path is deliberately REMOVED (plan §5.1 T10):
///         this contract never handles native ETH and has no swap logic.
///         Harvest ordering is sweep-then-claim (K1 explicit dependency).
///         Sweeps live on the CURVE (`sweepFees`, pre-graduation) and the HOOK
///         (`sweepPoolFees`, post-graduation) — NOT on the escrow (verified
///         against Pons docs 16 Okt 2026; the escrow only holds claimable
///         balances). Curve/hook refs + poolId are bound via 48h timelock
///         after the $HAHA launch is verified (confirmSetLaunchRefs), then
///         `claimToken(USDC)` pulls USDG strictly from escrow.
/// @dev All splits are micro-exact: tipShare = total * 70 / 100 (floor),
///      dropShare = total - tipShare, so tipShare + dropShare == total always.
///      Gas is funded out-of-band from the 40% B2B ops share — this contract
///      takes NO gas cut, keeping the 70/30 split exact.
contract FeeSplitter is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant KEEPER_ROLE = keccak256("KEEPER_ROLE");

    uint256 public constant TIP_BPS = 7000;
    uint256 public constant BPS_DENOM = 10000;
    uint256 public constant STALE_AFTER = 24 hours;
    uint256 public constant TIMELOCK = 48 hours;
    uint256 public constant MAX_STALE_AMOUNT_MICRO = 5_000_000_000; // 5,000 USDG (6 dec)
    uint256 public constant MAX_MIN_OUT_BPS = 200; // 2% max slippage on stale harvest

    IERC20 public immutable usdg;
    IPonsFeeEscrow public immutable feeEscrow;

    address public tipJar;
    address public micDrop;
    /// @notice Reserved router slot (USDG-only: unused). Kept so the 48h
    ///         timelock setter surface matches the plan; always address(0).
    address public router;
    /// @notice Pons V2 sweep refs, bound post-launch via 48h timelock
    ///         (confirmSetLaunchRefs). Zero pre-launch: sweeps skipped.
    IPonsCurve public sweepCurve;
    IPonsHook public sweepHook;
    bytes32 public sweepPoolId;
    uint256 public lastHarvest;

    address public pendingKeeper;
    uint256 public keeperEta;
    address public pendingRouter;
    uint256 public routerEta;
    address public pendingTipJar;
    uint256 public tipJarEta;
    address public pendingMicDrop;
    uint256 public micDropEta;
    address public pendingSweepCurve;
    address public pendingSweepHook;
    bytes32 public pendingSweepPoolId;
    uint256 public sweepRefsEta;

    event FeeSplitExecuted(uint256 indexed totalMicro, uint256 tipShare, uint256 dropShare);
    event KeeperProposed(address indexed keeper, uint256 eta);
    event KeeperConfirmed(address indexed keeper);
    event RouterProposed(address indexed router, uint256 eta);
    event RouterConfirmed(address indexed router);
    event TipJarProposed(address indexed tipJar, uint256 eta);
    event TipJarConfirmed(address indexed tipJar);
    event MicDropProposed(address indexed micDrop, uint256 eta);
    event MicDropConfirmed(address indexed micDrop);
    event SweepRefsProposed(address indexed curve, address indexed hook, bytes32 poolId, uint256 eta);
    event SweepRefsConfirmed(address indexed curve, address indexed hook, bytes32 poolId);

    error DeadlineExpired();
    error BelowMinOut();
    error NotStaleYet();
    error StaleAmountTooLarge();
    error MinOutBpsTooLarge();
    error TimelockNotReady();
    error NoPendingChange();
    error ZeroAddress();

    constructor(
        address usdg_,
        address feeEscrow_,
        address tipJar_,
        address micDrop_,
        address admin_,
        address keeper_
    ) {
        if (
            usdg_ == address(0) || feeEscrow_ == address(0) || tipJar_ == address(0) || micDrop_ == address(0)
                || admin_ == address(0) || keeper_ == address(0)
        ) revert ZeroAddress();
        usdg = IERC20(usdg_);
        feeEscrow = IPonsFeeEscrow(feeEscrow_);
        tipJar = tipJar_;
        micDrop = micDrop_;
        lastHarvest = block.timestamp;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(KEEPER_ROLE, keeper_);
    }

    /// @notice Keeper harvest: sweep escrow, claim USDG, split 70/30 exact.
    function harvestAndSplit(uint256 minUsdgOut, uint256 deadline)
        external
        onlyRole(KEEPER_ROLE)
        nonReentrant
    {
        if (block.timestamp > deadline) revert DeadlineExpired();
        _sweepAndClaim();
        uint256 total = usdg.balanceOf(address(this));
        if (total < minUsdgOut) revert BelowMinOut();
        _split(total);
    }

    /// @notice Permissionless fallback when the keeper is stale (>24h).
    /// @param maxAmountMicro Upper bound processed this call (<= 5,000 USDG).
    /// @param minOutBps Max acceptable shortfall of received-vs-quoted (<= 200 = 2%).
    function harvestStale(uint256 maxAmountMicro, uint256 minOutBps) external nonReentrant {
        if (block.timestamp <= lastHarvest + STALE_AFTER) revert NotStaleYet();
        if (maxAmountMicro > MAX_STALE_AMOUNT_MICRO) revert StaleAmountTooLarge();
        if (minOutBps > MAX_MIN_OUT_BPS) revert MinOutBpsTooLarge();
        uint256 quoted = feeEscrow.pendingFees(address(this)) + feeEscrow.pendingCreatorTax(address(this))
            + feeEscrow.quoteFeeBalance(address(this)) + feeEscrow.creatorTaxBalance(address(this));
        uint256 before = usdg.balanceOf(address(this));
        _sweepAndClaim();
        uint256 balance = usdg.balanceOf(address(this));
        // Slippage guard on the newly received delta (not the capped amount):
        // a cap that processes less than quoted pending is legitimate.
        uint256 received = balance - before;
        if (quoted > 0 && received * BPS_DENOM < quoted * (BPS_DENOM - minOutBps)) revert BelowMinOut();
        uint256 amount = balance > maxAmountMicro ? maxAmountMicro : balance;
        _split(amount);
    }

    // ---- 48h-timelock setters (admin = cold) ----

    function proposeSetKeeper(address keeper_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (keeper_ == address(0)) revert ZeroAddress();
        pendingKeeper = keeper_;
        keeperEta = block.timestamp + TIMELOCK;
        emit KeeperProposed(keeper_, keeperEta);
    }

    function confirmSetKeeper() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pendingKeeper == address(0)) revert NoPendingChange();
        if (block.timestamp < keeperEta) revert TimelockNotReady();
        _grantRole(KEEPER_ROLE, pendingKeeper);
        emit KeeperConfirmed(pendingKeeper);
        pendingKeeper = address(0);
        keeperEta = 0;
    }

    function proposeSetRouter(address router_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pendingRouter = router_;
        routerEta = block.timestamp + TIMELOCK;
        emit RouterProposed(router_, routerEta);
    }

    function confirmSetRouter() external onlyRole(DEFAULT_ADMIN_ROLE) {
        // Router slot is reserved/unused under USDG-only; confirmation is a
        // no-op record unless a future ETH path is explicitly enabled.
        if (block.timestamp < routerEta || routerEta == 0) revert TimelockNotReady();
        router = pendingRouter;
        emit RouterConfirmed(pendingRouter);
        pendingRouter = address(0);
        routerEta = 0;
    }

    function proposeSetTipJar(address tipJar_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (tipJar_ == address(0)) revert ZeroAddress();
        pendingTipJar = tipJar_;
        tipJarEta = block.timestamp + TIMELOCK;
        emit TipJarProposed(tipJar_, tipJarEta);
    }

    function confirmSetTipJar() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pendingTipJar == address(0)) revert NoPendingChange();
        if (block.timestamp < tipJarEta) revert TimelockNotReady();
        tipJar = pendingTipJar;
        emit TipJarConfirmed(pendingTipJar);
        pendingTipJar = address(0);
        tipJarEta = 0;
    }

    function proposeSetMicDrop(address micDrop_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (micDrop_ == address(0)) revert ZeroAddress();
        pendingMicDrop = micDrop_;
        micDropEta = block.timestamp + TIMELOCK;
        emit MicDropProposed(micDrop_, micDropEta);
    }

    function confirmSetMicDrop() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (pendingMicDrop == address(0)) revert NoPendingChange();
        if (block.timestamp < micDropEta) revert TimelockNotReady();
        micDrop = pendingMicDrop;
        emit MicDropConfirmed(pendingMicDrop);
        pendingMicDrop = address(0);
        micDropEta = 0;
    }

    /// @notice Bind the $HAHA launch sweep refs after post-launch verification
    ///         (Lampiran A). Zero curve/hook pre-launch: sweeps are skipped.
    function proposeSetLaunchRefs(address curve_, address hook_, bytes32 poolId_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        pendingSweepCurve = curve_;
        pendingSweepHook = hook_;
        pendingSweepPoolId = poolId_;
        sweepRefsEta = block.timestamp + TIMELOCK;
        emit SweepRefsProposed(curve_, hook_, poolId_, sweepRefsEta);
    }

    function confirmSetLaunchRefs() external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (sweepRefsEta == 0) revert NoPendingChange();
        if (block.timestamp < sweepRefsEta) revert TimelockNotReady();
        sweepCurve = IPonsCurve(pendingSweepCurve);
        sweepHook = IPonsHook(pendingSweepHook);
        sweepPoolId = pendingSweepPoolId;
        emit SweepRefsConfirmed(pendingSweepCurve, pendingSweepHook, pendingSweepPoolId);
        pendingSweepCurve = address(0);
        pendingSweepHook = address(0);
        pendingSweepPoolId = bytes32(0);
        sweepRefsEta = 0;
    }

    // ---- internals ----

    /// @dev Sweep-then-claim. Sweeps live on the curve (pre-graduation) and the
    ///      hook (post-graduation) with min-outs of 0 (buyback OFF, HAHA pair
    ///      is USDG so no conversion leg exists); each is best-effort since
    ///      only one applies per graduation state. The escrow token claim is
    ///      best-effort on an EMPTY escrow so leftover balances stay
    ///      harvestable, while `minUsdgOut` (keeper) and the received-vs-quoted
    ///      check (stale) still enforce value.
    function _sweepAndClaim() internal {
        if (address(sweepCurve) != address(0)) {
            try sweepCurve.sweepFees(0) {} catch {}
        }
        if (address(sweepHook) != address(0)) {
            try sweepHook.sweepPoolFees(sweepPoolId, 0, 0) {} catch {}
        }
        try feeEscrow.claimToken(address(usdg)) {} catch {}
        // Native/base variant, best-effort (USDG-only escrows: no-op).
        try feeEscrow.claim() {} catch {}
    }

    function _split(uint256 total) internal {
        uint256 tipShare = (total * TIP_BPS) / BPS_DENOM;
        uint256 dropShare = total - tipShare;
        lastHarvest = block.timestamp;
        if (tipShare > 0) usdg.safeTransfer(tipJar, tipShare);
        if (dropShare > 0) usdg.safeTransfer(micDrop, dropShare);
        emit FeeSplitExecuted(total, tipShare, dropShare);
    }
}
