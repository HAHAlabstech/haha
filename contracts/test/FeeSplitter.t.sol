// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {FeeSplitter} from "../src/FeeSplitter.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract FeeSplitterTest is HahaSetup {
    function test_HarvestAndSplit_Exact70_30Micro() public {
        // Plan Test 5a: 1000.000000 USDG trading fees, no ETH involved.
        escrow.simulateTradingFees(address(splitter), 1_000_000_000);
        assertEq(escrow.pendingFees(address(splitter)), 1_000_000_000);

        vm.prank(keeper);
        splitter.harvestAndSplit(1_000_000_000, block.timestamp + 1 hours);

        assertEq(usdg.balanceOf(address(tipJar)), 700_000_000, "tipJar 70%");
        assertEq(usdg.balanceOf(placeholderDrop), 300_000_000, "micDrop 30%");
        assertEq(usdg.balanceOf(address(splitter)), 0, "no residue");
        assertEq(escrow.pendingFees(address(splitter)), 0, "pending swept");
        assertEq(escrow.balanceOf(address(splitter)), 0, "escrow drained");
    }

    function test_HarvestSweepsBothCurveAndTax() public {
        escrow.simulateTradingFees(address(splitter), 600_000_000);
        escrow.simulateCreatorTax(address(splitter), 400_000_000);

        vm.prank(keeper);
        splitter.harvestAndSplit(0, block.timestamp + 1 hours);

        assertEq(usdg.balanceOf(address(tipJar)), 700_000_000);
        assertEq(usdg.balanceOf(placeholderDrop), 300_000_000);
    }

    function test_HarvestKeeperOnly() public {
        escrow.simulateTradingFees(address(splitter), 100);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, splitter.KEEPER_ROLE()
            )
        );
        vm.prank(alice);
        splitter.harvestAndSplit(0, block.timestamp + 1 hours);
    }

    function test_HarvestDeadline() public {
        vm.prank(keeper);
        vm.expectRevert(FeeSplitter.DeadlineExpired.selector);
        splitter.harvestAndSplit(0, block.timestamp - 1);
    }

    function test_HarvestStale_Gated24h() public {
        // Fresh splitter (no time elapsed since lastHarvest): gate holds.
        FeeSplitter fresh = new FeeSplitter(
            address(usdg), address(escrow), address(tipJar), placeholderDrop, admin, keeper
        );
        vm.expectRevert(FeeSplitter.NotStaleYet.selector);
        fresh.harvestStale(5_000_000_000, 200);
        // Bound splitter (48h elapsed in setUp): stale path works.
        vm.warp(block.timestamp + 24 hours + 1);
        escrow.simulateTradingFees(address(splitter), 1_000_000_000);
        splitter.harvestStale(5_000_000_000, 200);
        assertEq(usdg.balanceOf(address(tipJar)), 700_000_000);
    }

    function test_HarvestStale_CapsAtMaxAndLeavesRemainder() public {
        vm.warp(block.timestamp + 24 hours + 1);
        escrow.simulateTradingFees(address(splitter), 6_000_000_000);
        splitter.harvestStale(5_000_000_000, 200);
        assertEq(usdg.balanceOf(address(tipJar)), 3_500_000_000);
        assertEq(usdg.balanceOf(placeholderDrop), 1_500_000_000);
        assertEq(usdg.balanceOf(address(splitter)), 1_000_000_000, "remainder stays");
    }

    function test_HarvestStale_RevertsOnBadParams() public {
        vm.warp(block.timestamp + 24 hours + 1);
        vm.expectRevert(FeeSplitter.StaleAmountTooLarge.selector);
        splitter.harvestStale(5_000_000_001, 200);
        vm.expectRevert(FeeSplitter.MinOutBpsTooLarge.selector);
        splitter.harvestStale(5_000_000_000, 201);
    }

    function test_KeeperRotation_Timelock48h() public {
        address newKeeper = makeAddr("keeper2");
        vm.prank(admin);
        splitter.proposeSetKeeper(newKeeper);
        vm.expectRevert(FeeSplitter.TimelockNotReady.selector);
        vm.prank(admin);
        splitter.confirmSetKeeper();
        vm.warp(block.timestamp + 48 hours);
        vm.prank(admin);
        splitter.confirmSetKeeper();
        assertTrue(splitter.hasRole(splitter.KEEPER_ROLE(), newKeeper));
    }

    function test_RotateMicDropToReal() public {
        rotateMicDrop();
        escrow.simulateTradingFees(address(splitter), 1_000_000_000);
        vm.prank(keeper);
        splitter.harvestAndSplit(0, block.timestamp + 1 hours);
        assertEq(usdg.balanceOf(address(micDrop)), 300_000_000, "real MicDrop funded");
    }

    function test_SweepViaCurveAndHookRefs() public {
        // K1 mainnet path: sweeps live on curve/hook (bound via 48h timelock),
        // escrow only holds claimable. Pending drains to zero, split exact.
        bindSweepRefs();
        assertEq(address(splitter.sweepCurve()), address(sweepCurve));
        escrow.simulateTradingFees(address(splitter), 600_000_000);
        escrow.simulateCreatorTax(address(splitter), 400_000_000);
        vm.prank(keeper);
        splitter.harvestAndSplit(1_000_000_000, block.timestamp + 1 hours);
        assertEq(usdg.balanceOf(address(tipJar)), 700_000_000, "tipJar 70%");
        assertEq(usdg.balanceOf(placeholderDrop), 300_000_000, "micDrop 30%");
        assertEq(escrow.pendingFees(address(splitter)), 0, "curve swept");
        assertEq(escrow.pendingCreatorTax(address(splitter)), 0, "hook swept");
    }

    function test_SweepRefsTimelock48h() public {
        vm.prank(admin);
        splitter.proposeSetLaunchRefs(address(sweepCurve), address(sweepHook), bytes32(uint256(7)));
        vm.prank(admin);
        vm.expectRevert(FeeSplitter.TimelockNotReady.selector);
        splitter.confirmSetLaunchRefs();
        vm.warp(block.timestamp + 48 hours);
        vm.prank(admin);
        splitter.confirmSetLaunchRefs();
        assertEq(splitter.sweepPoolId(), bytes32(uint256(7)));
    }

    function testFuzz_SplitAlwaysExact(uint96 amountMicro) public {
        uint256 amount = bound(amountMicro, 1, 50_000_000_000_000);
        escrow.simulateTradingFees(address(splitter), amount);
        vm.prank(keeper);
        splitter.harvestAndSplit(0, block.timestamp + 1 hours);
        uint256 tip = usdg.balanceOf(address(tipJar));
        uint256 drop = usdg.balanceOf(placeholderDrop);
        assertEq(tip, (amount * 7000) / 10000, "tip floor-exact");
        assertEq(drop, amount - tip, "drop takes dust");
        assertEq(tip + drop, amount, "micro-exact, no leakage");
        assertEq(usdg.balanceOf(address(splitter)), 0);
    }

    function testFuzz_StaleCap(uint96 pendingMicro, uint64 maxMicro) public {
        uint256 pending = bound(pendingMicro, 1, 20_000_000_000);
        uint256 max = bound(maxMicro, 1, 5_000_000_000);
        vm.warp(block.timestamp + 24 hours + 1);
        escrow.simulateTradingFees(address(splitter), pending);
        splitter.harvestStale(max, 200);
        uint256 processed = pending > max ? max : pending;
        assertEq(usdg.balanceOf(address(tipJar)) + usdg.balanceOf(placeholderDrop), processed);
        assertEq(usdg.balanceOf(address(splitter)), pending - processed);
    }
}
