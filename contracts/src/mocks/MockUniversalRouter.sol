// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IUniversalRouter} from "../interfaces/IUniversalRouter.sol";
import {MockUSDG} from "./MockUSDG.sol";
import {MockHAHA} from "./MockHAHA.sol";

/// @notice Testnet-only Universal Router stand-in with the Robinhood-modified
///         struct (`minHopPriceX36`) and the Pons hook fee model.
/// @dev Pricing: 1 USDG = 100 $HAHA gross. Hook fee 1% is not minted (kept by
///      the pool); creator tax 2% is minted to the FeeSplitter. `minHahaOut`
///      is therefore enforced AFTER fees. Hop price = hahaOut * 2**36 / amountIn.
contract MockUniversalRouter is IUniversalRouter {
    using SafeERC20 for IERC20;

    MockUSDG public immutable usdg;
    MockHAHA public immutable haha;
    address public feeSplitter;

    uint256 public constant HOOK_FEE_BPS = 100; // 1% Pons hook
    uint256 public constant CREATOR_TAX_BPS = 200; // 2% back to FeeSplitter
    uint256 public constant HAHA_PER_USDG = 100; // gross, pre-fee

    error MinHahaOut();
    error MinHopPrice();
    error DeadlineExpired();

    event Swapped(address indexed buyer, uint256 amountIn, uint256 hahaOut, uint256 taxToSplitter);

    constructor(address usdg_, address haha_, address feeSplitter_) {
        usdg = MockUSDG(usdg_);
        haha = MockHAHA(haha_);
        feeSplitter = feeSplitter_;
    }

    function hookFeeBps() external pure returns (uint256) {
        return HOOK_FEE_BPS;
    }

    function creatorTaxBps() external pure returns (uint256) {
        return CREATOR_TAX_BPS;
    }

    /// @notice Net $HAHA out (18 dec) for `amountIn` micro-USDG, after fees.
    function getAmountOut(uint256 amountIn) public pure returns (uint256) {
        uint256 gross = amountIn * HAHA_PER_USDG * 1e12;
        uint256 fee = (gross * (HOOK_FEE_BPS + CREATOR_TAX_BPS)) / 10_000;
        return gross - fee;
    }

    function swapExactUsdgForHaha(ExactInputParams calldata params) external returns (uint256 hahaOut) {
        if (block.timestamp > params.deadline) revert DeadlineExpired();
        usdg.transferFrom(msg.sender, address(this), params.amountIn);
        uint256 gross = params.amountIn * HAHA_PER_USDG * 1e12;
        uint256 hookFee = (gross * HOOK_FEE_BPS) / 10_000;
        uint256 tax = (gross * CREATOR_TAX_BPS) / 10_000;
        hahaOut = gross - hookFee - tax;
        if (hahaOut < params.minHahaOut) revert MinHahaOut();
        // Hop-price floor, X36 fixed point: price = hahaOut * 2**36 / amountIn.
        uint256 hopPriceX36 = (hahaOut * (uint256(1) << 36)) / params.amountIn;
        if (hopPriceX36 < params.minHopPriceX36) revert MinHopPrice();
        haha.mint(feeSplitter, tax);
        haha.mint(msg.sender, hahaOut);
        emit Swapped(msg.sender, params.amountIn, hahaOut, tax);
    }
}
