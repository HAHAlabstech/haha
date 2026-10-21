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
