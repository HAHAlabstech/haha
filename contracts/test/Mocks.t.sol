// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {IUniversalRouter} from "../src/interfaces/IUniversalRouter.sol";
import {MockUniversalRouter} from "../src/mocks/MockUniversalRouter.sol";
import {MockPonsHook, MockPoolManager} from "../src/mocks/MockPoolManager.sol";
import {MockPonsFactory} from "../src/mocks/MockPonsFactory.sol";

/// @notice Mock-suite behavior: escrow lifecycle, factory launch, router
///         hook-fee pricing, and PoolManager/Hook failure injection.
contract MocksTest is HahaSetup {
    function _swapParams(uint256 amountIn, uint256 minHop, uint256 minOut, uint256 deadline)
        internal
        pure
        returns (IUniversalRouter.ExactInputParams memory)
    {
        return IUniversalRouter.ExactInputParams({
            amountIn: amountIn,
            minHopPriceX36: minHop,
            minHahaOut: minOut,
            deadline: deadline
        });
    }

    function test_EscrowLifecycle() public {
        address recipient = address(splitter);
        escrow.simulateTradingFees(recipient, 600_000_000);
        escrow.simulateCreatorTax(recipient, 400_000_000);
        assertEq(escrow.pendingFees(recipient), 600_000_000);
        assertEq(escrow.pendingCreatorTax(recipient), 400_000_000);

        escrow.sweepFees(recipient);
        assertEq(escrow.pendingFees(recipient), 0);
        assertEq(escrow.quoteFeeBalance(recipient), 600_000_000);

        escrow.sweepPoolFees(recipient);
        assertEq(escrow.creatorTaxBalance(recipient), 400_000_000);
        assertEq(escrow.balanceOf(recipient), 1_000_000_000);
        assertEq(escrow.balanceOfToken(recipient, address(usdg)), 1_000_000_000);
        assertEq(escrow.balanceOfToken(recipient, address(haha)), 0);

        uint256 before = usdg.balanceOf(recipient);
        vm.prank(recipient);
        escrow.claimToken(address(usdg));
        assertEq(usdg.balanceOf(recipient) - before, 1_000_000_000);
    }

    function test_EscrowClaimNativeIsSafeNoop() public {
        // USDG-only path leaves the native variant untouched; claim() must not brick harvest.
        vm.prank(address(splitter));
        escrow.claim();
    }

    function test_EscrowClaimEmptyReverts() public {
        vm.expectRevert("nothing-to-claim");
        vm.prank(alice);
        escrow.claimToken(address(usdg));
    }

    function test_FactoryLaunchAndCanLaunch() public {
        assertTrue(factory.canLaunch(alice));
        address[] memory exempt = new address[](0);
        uint256 id = factory.launch(address(haha), address(splitter), address(usdg), 200, false, exempt);
        assertEq(id, 0);
        assertEq(factory.launchCount(), 1);
        MockPonsFactory.Launch memory l = factory.getLaunchedToken(0);
        assertEq(l.token, address(haha));
        assertEq(l.feeRecipient, address(splitter));
        assertEq(l.pairToken, address(usdg));
        assertEq(l.creatorTaxBps, 200);
        assertFalse(l.buybackEnabled);
        assertEq(l.exempt.length, 0);
    }

    function test_RouterPricingAndHopFloor() public {
        uint256 amountIn = 1_000_000_000;
        uint256 gross = amountIn * 100 * 1e12;
        uint256 expected = gross - (gross * 300) / 10_000; // 1% hook + 2% tax
        assertEq(router.getAmountOut(amountIn), expected);

        usdg.mint(bob, amountIn);
        vm.startPrank(bob);
        usdg.approve(address(router), amountIn);
        // minHahaOut above net-of-fees reverts.
        vm.expectRevert(MockUniversalRouter.MinHahaOut.selector);
        router.swapExactUsdgForHaha(_swapParams(amountIn, 0, expected + 1, block.timestamp + 1 hours));
        // minHopPriceX36 above the quoted hop price reverts.
        uint256 hopPrice = (expected * (uint256(1) << 36)) / amountIn;
        vm.expectRevert(MockUniversalRouter.MinHopPrice.selector);
        router.swapExactUsdgForHaha(_swapParams(amountIn, hopPrice + 1, expected, block.timestamp + 1 hours));
        // Exact quote succeeds; 2% tax lands on the splitter.
        uint256 out =
            router.swapExactUsdgForHaha(_swapParams(amountIn, hopPrice, expected, block.timestamp + 1 hours));
        vm.stopPrank();
        assertEq(out, expected);
        assertEq(haha.balanceOf(bob), expected);
        assertEq(haha.balanceOf(address(splitter)), (gross * 200) / 10_000);
    }

    function test_HookAndPoolManagerFailureInjection() public {
        assertEq(hook.hookFeeBps(), 100);
        poolManager.setReserve(50_000_000_000);
        assertEq(poolManager.getReserveUsdg(), 50_000_000_000);
        hook.setFailMode(true);
        vm.expectRevert(MockPonsHook.HookFailed.selector);
        hook.hookFeeBps();
        poolManager.setFailMode(true);
        vm.expectRevert(MockPoolManager.PoolFailed.selector);
        poolManager.getReserveUsdg();
    }
}
