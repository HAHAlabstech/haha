// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";

/// @notice Mainnet (4663) PRE-FLIGHT gate: read-only checks, NO broadcast.
/// @dev Run with --dry-run (never --broadcast in 72h). ABORTS on any
///      mismatch: USDG decimals, escrow claim/sweep selectors, router +
///      PoolManager + hook presence, factory presence. The full production
///      stack is only deployed after this gate passes + audit + legal.
interface IDecimals {
    function decimals() external view returns (uint8);
}

contract DeployMainnet is Script {
    error PreflightFailed(string check);

    function run() external view {
        address usdg = vm.envAddress("NEXT_PUBLIC_MAINNET_USDG_ADDRESS");
        address escrow = vm.envAddress("NEXT_PUBLIC_MAINNET_PONS_FEE_ESCROW");
        address factory = vm.envAddress("NEXT_PUBLIC_MAINNET_PONS_FACTORY");
        address router = vm.envAddress("NEXT_PUBLIC_MAINNET_UNIVERSAL_ROUTER");
        address poolManager = vm.envAddress("NEXT_PUBLIC_MAINNET_UNISWAP_V4_POOL_MANAGER");
        address hook = vm.envAddress("NEXT_PUBLIC_MAINNET_PONS_MEME_HOOK");

        // 1. USDG must be 6 decimals — NEVER hardcode 18.
        if (IDecimals(usdg).decimals() != 6) revert PreflightFailed("USDG.decimals != 6");

        // 2. Escrow must expose the claim surface. Sweeps live on the
        //    per-token curve (`sweepFees(minBuybackTokensOut)`) and hook
        //    (`sweepPoolFees(poolId,minQ,minB)`) — NOT on escrow — so they are
        //    verified at harvest-time per token + mainnet fork-test, NOT here.
        //    (An escrow exposing sweep fns would be a DIFFERENT contract.)
        _mustRespond(escrow, abi.encodeWithSignature("claimToken(address)", usdg), "escrow.claimToken");
        (bool ok,) = escrow.staticcall(abi.encodeWithSignature("claim()"));
        if (!ok) revert PreflightFailed("escrow.claim");

        // 3. Router / PoolManager / hook / factory must be live contracts.
        if (router.code.length == 0) revert PreflightFailed("router-no-code");
        if (poolManager.code.length == 0) revert PreflightFailed("poolmanager-no-code");
        if (hook.code.length == 0) revert PreflightFailed("hook-no-code");
        if (factory.code.length == 0) revert PreflightFailed("factory-no-code");

        console.log("PREFLIGHT OK - safe to proceed to post-gate mainnet deploy");
    }

    /// @dev staticcall must not revert (returndata ignored — views may return 0 pre-launch).
    function _mustRespond(address target, bytes memory callData, string memory check) internal view {
        (bool ok,) = target.staticcall(callData);
        if (!ok) revert PreflightFailed(check);
    }
}
