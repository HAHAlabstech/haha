// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {FeeSplitter} from "../src/FeeSplitter.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

/// @dev Mainnet-shaped escrow: only the live Pons V2 claim ledger, deliberately
///      no pending-fee views or sweep methods. A FeeSplitter that calls the old
///      mock-only surface must fail this test.
contract LiveShapeEscrow {
    MockUSDG public immutable usdg;
    mapping(address => uint256) public credit;

    constructor(MockUSDG usdg_) {
        usdg = usdg_;
    }

    function fund(address recipient, uint256 amount) external {
        usdg.mint(address(this), amount);
        credit[recipient] += amount;
    }

    function balanceOf(address) external pure returns (uint256) {
        return 0;
    }

    function balanceOfToken(address recipient, address token) external view returns (uint256) {
        return token == address(usdg) ? credit[recipient] : 0;
    }

    function claim() external pure returns (uint256) {
        return 0;
    }

    function claimToken(address token) external returns (uint256 amount) {
        require(token == address(usdg), "only-usdg");
        amount = credit[msg.sender];
        credit[msg.sender] = 0;
        if (amount > 0) usdg.transfer(msg.sender, amount);
    }
}

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
        FeeSplitter fresh =
            new FeeSplitter(address(usdg), address(escrow), address(tipJar), placeholderDrop, admin, keeper, 48 hours);
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

    function test_LiveShapeEscrow_HarvestWithoutPendingViews() public {
        LiveShapeEscrow liveEscrow = new LiveShapeEscrow(usdg);
        FeeSplitter liveSplitter = new FeeSplitter(
            address(usdg), address(liveEscrow), address(tipJar), placeholderDrop, admin, keeper, 48 hours
        );
        liveEscrow.fund(address(liveSplitter), 1_000_000_000);

        uint256 tipBefore = usdg.balanceOf(address(tipJar));
        uint256 dropBefore = usdg.balanceOf(placeholderDrop);
        vm.prank(keeper);
        liveSplitter.harvestAndSplit(0, block.timestamp + 1 hours);

        assertEq(usdg.balanceOf(address(tipJar)) - tipBefore, 700_000_000, "live escrow tip 70%");
        assertEq(usdg.balanceOf(placeholderDrop) - dropBefore, 300_000_000, "live escrow drop 30%");
        assertEq(liveEscrow.credit(address(liveSplitter)), 0, "live escrow drained");
    }

    function test_LiveShapeEscrow_StaleQuoteUsesClaimableLedger() public {
        LiveShapeEscrow liveEscrow = new LiveShapeEscrow(usdg);
        FeeSplitter liveSplitter = new FeeSplitter(
            address(usdg), address(liveEscrow), address(tipJar), placeholderDrop, admin, keeper, 48 hours
        );
        liveEscrow.fund(address(liveSplitter), 1_000_000_000);
        vm.warp(block.timestamp + 24 hours + 1);

        uint256 tipBefore = usdg.balanceOf(address(tipJar));
        liveSplitter.harvestStale(5_000_000_000, 0);
        assertEq(usdg.balanceOf(address(tipJar)) - tipBefore, 700_000_000, "stale live escrow tip");
    }
}
