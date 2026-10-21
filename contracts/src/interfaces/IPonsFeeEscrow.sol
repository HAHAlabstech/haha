// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Minimal Pons V2 fee-escrow surface HAHA depends on.
/// @dev Verified against the live PonsV2FeeEscrow on Robinhood Chain mainnet
///      (`0xd3AFEB2a57f70eF218Aa82451c51B2fb0416Ac9e`): the escrow exposes a
///      claim ledger only. It has `balanceOf` / `balanceOfToken` and
///      `claim` / `claimToken`, but NO pending-fee views and NO sweep methods.
///      Sweeps live on the curve (`sweepFees`) and the hook (`sweepPoolFees`).
///      Do not reintroduce mock-only pending views into this interface.
interface IPonsFeeEscrow {
    function balanceOf(address recipient) external view returns (uint256);
    function balanceOfToken(address recipient, address token) external view returns (uint256);
    function claim() external returns (uint256 amount);
    function claimToken(address token) external returns (uint256 amount);
}
