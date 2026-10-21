// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {HahaSetup} from "./helpers/HahaSetup.sol";

contract FundingTest is HahaSetup {
    function test_TreasuryFundingGoesOnlyToTipJar() public {
        usdg.mint(alice, 100_000_000);
        vm.startPrank(alice);
        usdg.approve(address(gateway), 100_000_000);
        (bool ok,) = address(gateway).call(abi.encodeWithSignature("fundRewards(uint256)", 100_000_000));
        vm.stopPrank();
        assertTrue(ok, "explicit treasury funding missing");
        assertEq(usdg.balanceOf(address(tipJar)), 100_000_000);
        assertEq(usdg.balanceOf(admin), 0);
        assertEq(usdg.balanceOf(address(micDrop)), 0);
    }
}
