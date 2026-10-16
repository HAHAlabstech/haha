// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Pons V2 pre-graduation bonding curve sweep surface (per docs:
///         `sweepFees(minBuybackTokensOut)`; buyback OFF in HAHA so 0).
interface IPonsCurve {
    function sweepFees(uint256 minBuybackTokensOut) external;
}

/// @notice Pons V2 post-graduation hook sweep surface (per docs:
///         `sweepPoolFees(poolId, minConversionQuoteOut, minBuybackTokensOut)`).
interface IPonsHook {
    function sweepPoolFees(bytes32 poolId, uint256 minConversionQuoteOut, uint256 minBuybackTokensOut) external;
}
