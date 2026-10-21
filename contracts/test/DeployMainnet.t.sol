// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {DeployMainnet} from "../script/DeployMainnet.s.sol";

/// @notice Exposes the deploy script's internal selector scan so the false
///         negative from Test 8 cannot regress silently.
contract DeployMainnetHarness is DeployMainnet {
    function hasSelector(address target, bytes4 selector) external view returns (bool) {
        return _hasSelector(target, selector);
    }

    function preflight()
        external
        view
        returns (address usdg, address escrow, address factory, address router, address poolManager, address hook)
    {
        Preflight memory p = _preflight();
        return (p.usdg, p.escrow, p.factory, p.router, p.poolManager, p.hook);
    }
}

contract DeployMainnetPreflightTest is HahaSetup {
    DeployMainnetHarness internal harness;

    function setUp() public override {
        super.setUp();
        harness = new DeployMainnetHarness();
    }

    function test_SelectorScanFindsStateChangingClaimSurface() public view {
        assertTrue(harness.hasSelector(address(escrow), bytes4(keccak256("claimToken(address)"))));
        assertTrue(harness.hasSelector(address(escrow), bytes4(keccak256("claim()"))));
        assertFalse(harness.hasSelector(address(registry), bytes4(keccak256("claimToken(address)"))));
    }

    function test_PreflightPassesAgainstMockChain4663() public {
        vm.chainId(4663);
        vm.setEnv("USDG_ADDRESS", vm.toString(address(usdg)));
        vm.setEnv("PONS_FEE_ESCROW_ADDRESS", vm.toString(address(escrow)));
        vm.setEnv("PONS_FACTORY_ADDRESS", vm.toString(address(factory)));
        vm.setEnv("UNIVERSAL_ROUTER_ADDRESS", vm.toString(address(router)));
        vm.setEnv("POOL_MANAGER_ADDRESS", vm.toString(address(poolManager)));
        vm.setEnv("PONS_MEME_HOOK_ADDRESS", vm.toString(address(hook)));
        vm.setEnv("ADMIN_COLD_ADDRESS", vm.toString(admin));
        vm.setEnv("COLD_TREASURY_ADDRESS", vm.toString(admin));
        vm.setEnv("HAHA_TOKEN_ADDRESS", vm.toString(address(0)));
        (address u, address e, address f, address r, address pm, address h) = harness.preflight();
        assertEq(u, address(usdg));
        assertEq(e, address(escrow));
        assertEq(f, address(factory));
        assertEq(r, address(router));
        assertEq(pm, address(poolManager));
        assertEq(h, address(hook));
    }

    function test_PreflightRejectsWrongChain() public {
        vm.chainId(46630);
        vm.setEnv("USDG_ADDRESS", vm.toString(address(usdg)));
        vm.expectRevert(abi.encodeWithSelector(DeployMainnet.PreflightFailed.selector, "chainid != 4663"));
        harness.preflight();
    }

    function test_StaticcallOfClaimSurfaceRevertsByDesign() public {
        // Give this test contract a real claimable balance, then prove why the
        // old gate's staticcall was invalid: the function exists and reverts
        // only because staticcall forbids the state writes it performs.
        escrow.simulateTradingFees(address(this), 1_000_000);
        escrow.sweepFees(address(this));
        (bool ok,) = address(escrow).staticcall(abi.encodeWithSignature("claimToken(address)", address(usdg)));
        assertFalse(ok, "state-changing claimToken must revert under staticcall");

        // The selector scan still identifies the surface.
        assertTrue(harness.hasSelector(address(escrow), bytes4(keccak256("claimToken(address)"))));
    }
}
