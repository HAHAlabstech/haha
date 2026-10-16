// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal view of the Pons V2 fee escrow surface HAHA depends on.
/// @dev Exact upstream selectors MUST be re-verified on-chain at pre-flight
///      (DeployMainnet script aborts on mismatch). Names here follow the
///      HAHA implementation plan §5.1 (K1): sweep pre/post graduation, then
///      claim. `quoteFeeBalance` / `creatorTaxBalance` are the curve-side
///      claimable views; `pendingFees` / `pendingCreatorTax` the hook-side
///      not-yet-swept views.
interface IPonsFeeEscrow {
    function pendingFees(address recipient) external view returns (uint256);
    function pendingCreatorTax(address recipient) external view returns (uint256);
    function quoteFeeBalance(address recipient) external view returns (uint256);
    function creatorTaxBalance(address recipient) external view returns (uint256);
    function balanceOf(address recipient) external view returns (uint256);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
    function sweepFees(address recipient) external;
    function sweepPoolFees(address recipient) external;
    function claim() external;
    function claimToken(address token) external;
}
