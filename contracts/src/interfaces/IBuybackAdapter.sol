// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
interface IBuybackAdapter {
    function validateRoute(address token, bytes calldata route) external view returns (bool);
    function swapExactInput(address token, uint256 amountIn, uint256 minOut, uint256 minHopPriceX36, uint256 deadline, bytes calldata route) external returns (uint256);
}
