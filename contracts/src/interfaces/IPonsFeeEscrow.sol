// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal view of the Pons V2 fee escrow surface HAHA depends on.
/// @dev Sweeps do NOT live here (verified vs Pons docs): they live on the
///      curve (`sweepFees`, see IPonsSweep) and the hook (`sweepPoolFees`).
///      This interface is views + claims only. Exact upstream selectors
///      MUST be re-verified on-chain at pre-flight.
interface IPonsFeeEscrow {
    function pendingFees(address recipient) external view returns (uint256);
    function pendingCreatorTax(address recipient) external view returns (uint256);
    function quoteFeeBalance(address recipient) external view returns (uint256);
    function creatorTaxBalance(address recipient) external view returns (uint256);
    function balanceOf(address recipient) external view returns (uint256);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
    function claim() external;
    function claimToken(address token) external;
}
