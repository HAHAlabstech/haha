// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {ProducerGateway} from "../src/ProducerGateway.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract ProducerGatewayTest is HahaSetup {
    bytes32 internal constant ORDER = keccak256("order-1");

    function _buyAs(address buyer, uint8 plan, uint256 amount, bytes32 batchId) internal returns (bytes32) {
        usdg.mint(buyer, amount);
        vm.startPrank(buyer);
        usdg.approve(address(gateway), amount);
        bytes32 derived = gateway.purchasePlan(plan, amount, ORDER, batchId);
        vm.stopPrank();
        return derived;
    }

    function test_SnapshotSplit40_30_10_20() public {
        // Plan Test 7: $2,500 Snapshot -> 1000 / 750+250 / 500.
        bytes32 batch = _buyAs(bob, 0, 2_500_000_000, bytes32(0));
        assertTrue(batch != bytes32(0), "batchId derived");
        assertEq(usdg.balanceOf(admin), 1_000_000_000, "40% cold treasury");
        assertEq(usdg.balanceOf(address(tipJar)), 1_000_000_000, "30% general + 10% royalty");
        assertEq(usdg.balanceOf(address(micDrop)), 500_000_000, "20% mic drop");
    }

    function test_UnderpricedReverts() public {
        usdg.mint(bob, 2_499_000_000);
        vm.startPrank(bob);
        usdg.approve(address(gateway), 2_499_000_000);
        vm.expectRevert(ProducerGateway.Underpriced.selector);
        gateway.purchasePlan(0, 2_499_000_000, ORDER, bytes32(0));
        vm.stopPrank();
    }

    function test_UnknownPlanReverts() public {
        vm.expectRevert(ProducerGateway.UnknownPlan.selector);
        gateway.purchasePlan(4, 1_000_000_000, ORDER, bytes32(0));
    }

    function test_ExplicitBatchIdPassthrough() public {
        bytes32 batch = _buyAs(bob, 2, 500_000_000, keccak256("explicit"));
        assertEq(batch, keccak256("explicit"));
    }

    function test_OverpaySplitsProportionally() public {
        _buyAs(bob, 1, 3_000_000_000, bytes32(0)); // subscription floor 1,000, overpay ok
        assertEq(usdg.balanceOf(admin), 1_200_000_000);
        assertEq(usdg.balanceOf(address(tipJar)), 1_200_000_000);
        assertEq(usdg.balanceOf(address(micDrop)), 600_000_000);
    }

    function test_SetPlanPriceAdminOnly() public {
        vm.prank(admin);
        gateway.setPlanPrice(2, 600_000_000);
        assertEq(gateway.planPriceMicro(2), 600_000_000);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector,
                bob,
                gateway.DEFAULT_ADMIN_ROLE()
            )
        );
        vm.prank(bob);
        gateway.setPlanPrice(2, 1);
    }

    function testFuzz_SplitsAlwaysSum(uint96 amountMicro, uint8 plan) public {
        uint8 p = uint8(bound(plan, 0, 3));
        uint256 floor = gateway.planPriceMicro(p);
        uint256 amount = bound(amountMicro, floor, 1_000_000_000_000_000);
        uint256 t0 = usdg.balanceOf(admin);
        uint256 j0 = usdg.balanceOf(address(tipJar));
        uint256 m0 = usdg.balanceOf(address(micDrop));
        _buyAs(bob, p, amount, bytes32(0));
        uint256 op = usdg.balanceOf(admin) - t0;
        uint256 tip = usdg.balanceOf(address(tipJar)) - j0;
        uint256 drop = usdg.balanceOf(address(micDrop)) - m0;
        assertEq(op, (amount * 40) / 100);
        assertEq(tip, (amount * 30) / 100 + (amount * 10) / 100);
        assertEq(op + tip + drop, amount, "no leakage");
    }
}
