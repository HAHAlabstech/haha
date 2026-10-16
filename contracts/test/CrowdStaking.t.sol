// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {CrowdStaking} from "../src/CrowdStaking.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract CrowdStakingTest is HahaSetup {
    bytes32 internal constant BIT_1 = keccak256("bit-1");

    function _stakeAlice(uint256 amount) internal {
        haha.mint(alice, amount);
        vm.startPrank(alice);
        haha.approve(address(staking), amount);
        staking.stake(amount);
        vm.stopPrank();
    }

    function test_StakeAndUnstakeCooldown() public {
        _stakeAlice(100 ether);
        assertEq(staking.stakeOf(alice), 100 ether);
        vm.prank(alice);
        staking.initiateUnstake();
        vm.prank(alice);
        vm.expectRevert(CrowdStaking.CooldownNotElapsed.selector);
        staking.completeUnstake();
        vm.warp(block.timestamp + 3 days);
        vm.prank(alice);
        staking.completeUnstake();
        assertEq(haha.balanceOf(alice), 100 ether);
        assertEq(staking.stakeOf(alice), 0);
    }

    function test_UnstakeWithoutInitiateReverts() public {
        _stakeAlice(10 ether);
        vm.expectRevert(CrowdStaking.NoUnstakeInitiated.selector);
        vm.prank(alice);
        staking.completeUnstake();
    }

    function test_SlashToEscrowAndRecover() public {
        _stakeAlice(100 ether);
        vm.prank(keeper);
        staking.slash(alice, 40 ether, "plants<60%");
        assertEq(staking.stakeOf(alice), 60 ether);
        assertEq(staking.slashEscrow(alice), 40 ether);
        // Retrial won within 14 days: escrow returns to stake.
        vm.prank(keeper);
        staking.recoverSlash(alice);
        assertEq(staking.stakeOf(alice), 100 ether);
        assertEq(staking.slashEscrow(alice), 0);
    }

    function test_SlashResolveAfterExpiryGoesToTipJar() public {
        _stakeAlice(100 ether);
        vm.prank(keeper);
        staking.slash(alice, 40 ether, "plants<60%");
        vm.warp(block.timestamp + 14 days + 1);
        vm.expectRevert(CrowdStaking.RecoveryExpired.selector);
        vm.prank(keeper);
        staking.recoverSlash(alice);
        vm.prank(keeper);
        staking.resolveSlash(alice);
        assertEq(haha.balanceOf(address(tipJar)), 40 ether);
        assertEq(staking.slashEscrow(alice), 0);
    }

    function test_ResolveBeforeExpiryReverts() public {
        _stakeAlice(100 ether);
        vm.prank(keeper);
        staking.slash(alice, 40 ether, "x");
        vm.expectRevert(CrowdStaking.RecoveryWindowOpen.selector);
        vm.prank(keeper);
        staking.resolveSlash(alice);
    }

    function test_SlashOnlySlasher() public {
        _stakeAlice(100 ether);
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, staking.SLASHER_ROLE()
            )
        );
        vm.prank(alice);
        staking.slash(alice, 1 ether, "x");
    }

    function test_ExtraBitStakeWithdrawAndSeize() public {
        _stakeAlice(100 ether);
        haha.mint(alice, 20 ether); // extra-bit stakes are funded separately
        // Stake + withdraw (clean bit).
        vm.startPrank(alice);
        haha.approve(address(staking), 20 ether);
        staking.stakeForExtraBit(BIT_1);
        staking.withdrawExtraBit(BIT_1);
        // Stake again, then heckled_off -> seize to TipJar.
        haha.approve(address(staking), 10 ether);
        staking.stakeForExtraBit(BIT_1);
        vm.stopPrank();
        vm.prank(keeper);
        staking.seizeExtraBit(BIT_1, alice);
        assertEq(haha.balanceOf(address(tipJar)), 10 ether);
        vm.expectRevert(CrowdStaking.AlreadySeized.selector);
        vm.prank(alice);
        staking.withdrawExtraBit(BIT_1);
    }

    function testFuzz_SlashAccounting(uint96 stakeAmt, uint96 slashAmt) public {
        uint256 staked = bound(stakeAmt, 1 ether, 1_000_000 ether);
        _stakeAlice(staked);
        uint256 slashed = bound(slashAmt, 1, staked);
        vm.prank(keeper);
        staking.slash(alice, slashed, "fuzz");
        assertEq(staking.stakeOf(alice) + staking.slashEscrow(alice), staked);
        assertEq(haha.balanceOf(address(staking)), staked);
    }
}
