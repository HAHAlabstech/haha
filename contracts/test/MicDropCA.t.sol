// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {HahaSetup} from "./helpers/HahaSetup.sol";

contract MicDropCATest is HahaSetup {
    function test_BuybackIsExplicitlyHeldWithoutConfiguredRoute() public view {
        assertFalse(micDrop.hasBuybackRoute());
    }
    function test_ReserveRefreshChangesTimestampAndValue() public {
        vm.prank(keeper);
        micDrop.setPoolReserve(100_000_000);
        assertEq(micDrop.poolReserveUsdg(),100_000_000);
        assertEq(micDrop.reserveUpdatedAt(),block.timestamp);
    }
    function test_RegistrationRejectsEOA() public {
        vm.prank(keeper);
        vm.expectRevert();
        micDrop.proposeHahaToken(alice);
    }
    function test_RotationClearsOldPoolState() public {
        vm.startPrank(keeper);
        micDrop.setGraduated(true);
        micDrop.setPoolReserve(1_000_000_000);
        micDrop.proposeHahaToken(address(haha));
        vm.warp(block.timestamp + 48 hours);
        micDrop.confirmHahaToken();
        vm.stopPrank();
        assertFalse(micDrop.poolGraduated(), "old pool must not follow new CA");
        assertEq(micDrop.poolReserveUsdg(), 0);
    }
}
