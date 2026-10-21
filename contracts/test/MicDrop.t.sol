// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {MicDrop} from "../src/MicDrop.sol";
import {IUniversalRouter} from "../src/interfaces/IUniversalRouter.sol";

contract MicDropTest is HahaSetup {
    bytes32 internal constant LAUNCH_TX = keccak256("pons-launch-tx");

    function _pinToken() internal {
        vm.prank(keeper);
        micDrop.proposeHahaToken(
            address(haha), LAUNCH_TX, address(splitter), address(usdg), 200, false, 0
        );
        vm.warp(block.timestamp + 48 hours);
        vm.prank(keeper);
        micDrop.confirmHahaToken();
        vm.prank(admin);
        micDrop.proposeBuybackRoute(hex"01");
        vm.warp(block.timestamp + 48 hours);
        vm.prank(admin);
        micDrop.confirmBuybackRoute();
        vm.prank(keeper);
        micDrop.setGraduated(true);
        vm.prank(keeper);
        micDrop.setPoolReserve(100_000_000_000); // 100k USDG
    }

    function test_PreGraduationExecuteReverts() public {
        vm.prank(keeper);
        vm.expectRevert(MicDrop.NotGraduated.selector);
        micDrop.executeBuyback(1_000_000, 1, 0, block.timestamp + 1 hours);
    }

    function test_DepositHoldCap50k() public {
        usdg.mint(alice, 60_000_000_000);
        vm.startPrank(alice);
        usdg.approve(address(micDrop), 60_000_000_000);
        micDrop.deposit(50_000_000_000);
        vm.expectRevert(MicDrop.HoldCapExceeded.selector);
        micDrop.deposit(1);
        vm.stopPrank();
    }

    function test_ProposeValidatesLaunch() public {
        // Zero address rejects
        vm.prank(keeper);
        vm.expectRevert(MicDrop.ZeroAddress.selector);
        micDrop.proposeHahaToken(address(0), LAUNCH_TX);

        // Valid address accepted
        vm.prank(keeper);
        micDrop.proposeHahaToken(address(haha), LAUNCH_TX);
        assertEq(micDrop.pendingHahaToken(), address(haha));
    }

    function test_ConfirmTimelock48h() public {
        vm.prank(keeper);
        micDrop.proposeHahaToken(address(haha), LAUNCH_TX, address(splitter), address(usdg), 200, false, 0);
        vm.expectRevert(MicDrop.TimelockNotReady.selector);
        vm.prank(keeper);
        micDrop.confirmHahaToken();
        vm.warp(block.timestamp + 48 hours);
        vm.prank(keeper);
        micDrop.confirmHahaToken();
        assertEq(micDrop.hahaToken(), address(haha));
    }

    function test_ExecuteBuybackBurns() public {
        _pinToken(); // reserve 100k -> impact cap binds near ~1010 USDG
        usdg.mint(address(micDrop), 1_000_000_000);
        uint256 minOut = router.getAmountOut(1_000_000_000);
        address burn = address(0x000000000000000000000000000000000000dEaD);
        uint256 burnBefore = haha.balanceOf(burn);

        vm.prank(keeper);
        micDrop.executeBuyback(1_000_000_000, minOut, 0, block.timestamp + 1 hours);

        assertEq(haha.balanceOf(burn) - burnBefore, minOut, "burned net-of-fees");
        assertGt(haha.balanceOf(address(splitter)), 0, "2% creator tax back to splitter");
        assertEq(usdg.balanceOf(address(micDrop)), 0);
    }

    function test_ExecuteBuybackEnforcesMinHahaOut() public {
        _pinToken();
        usdg.mint(address(micDrop), 1_000_000_000);
        uint256 minOut = router.getAmountOut(1_000_000_000);
        vm.prank(keeper);
        vm.expectRevert();
        micDrop.executeBuyback(1_000_000_000, minOut + 1, 0, block.timestamp + 1 hours);
    }

    function test_ExecuteBuybackMinHopPrice() public {
        _pinToken();
        usdg.mint(address(micDrop), 1_000_000_000);
        uint256 minOut = router.getAmountOut(1_000_000_000);
        // Exact hop price passes; anything higher reverts in the router.
        uint256 hopPrice = (minOut * (uint256(1) << 36)) / 1_000_000_000;
        vm.prank(keeper);
        micDrop.executeBuyback(1_000_000_000, minOut, hopPrice, block.timestamp + 1 hours);
        assertEq(usdg.balanceOf(address(micDrop)), 0);
    }

    function test_CapTwoPercentOfReserve() public {
        _pinToken(); // reserve 100k -> max 2k
        vm.prank(keeper);
        vm.expectRevert(MicDrop.CapExceeded.selector);
        micDrop.executeBuyback(2_000_000_001, 1, 0, block.timestamp + 1 hours);
    }

    function test_ImpactCapOnePercent() public {
        _pinToken();
        vm.prank(keeper);
        micDrop.setPoolReserve(100_000_000); // 100 USDG reserve
        // 2 USDG is exactly 2% of reserve (passes Cap) but 2/102 = 1.96% impact.
        vm.prank(keeper);
        vm.expectRevert(MicDrop.ImpactTooHigh.selector);
        micDrop.executeBuyback(2_000_000, 1, 0, block.timestamp + 1 hours);
    }

    function testFuzz_CapAlwaysRevertsAbove2Pct(uint96 reserveMicro, uint96 overMicro) public {
        _pinToken();
        assertEq(micDrop.buybackRoute(), hex"01");
        uint256 reserve = bound(reserveMicro, 1_000_000, 1_000_000_000_000);
        vm.prank(keeper);
        micDrop.setPoolReserve(reserve);
        uint256 maxAllowed = (reserve * 200) / 10_000;
        uint256 over = bound(overMicro, maxAllowed + 1, maxAllowed + 1_000_000_000);
        vm.prank(keeper);
        vm.expectRevert(MicDrop.CapExceeded.selector);
        micDrop.executeBuyback(over, 1, 0, block.timestamp + 1 hours);
    }
}
