// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Robinhood-modified Uniswap v4 swap surface: every swap struct
///         carries `minHopPriceX36` (standard Uniswap SDK calldata REVERTS).
///         Pools carrying the Pons hook also take a hook fee + creator tax,
///         so `minHahaOut` MUST be computed AFTER fees.
interface IUniversalRouter {
    struct ExactInputParams {
        uint256 amountIn;
        uint256 minHopPriceX36;
        uint256 minHahaOut;
        uint256 deadline;
    }

    function swapExactUsdgForHaha(ExactInputParams calldata params) external returns (uint256 hahaOut);
    function hookFeeBps() external view returns (uint256);
    function creatorTaxBps() external view returns (uint256);
}
