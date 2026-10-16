// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IPonsCurve, IPonsHook} from "../interfaces/IPonsSweep.sol";
import {MockPonsFeeEscrow} from "./MockPonsFeeEscrow.sol";

/// @notice Testnet-only Pons V2 pre-graduation curve stand-in.
/// @dev Real signature: `sweepFees(minBuybackTokensOut)` (buyback OFF here,
///      so the arg is accepted and ignored). Credits the bound fee recipient
///      in the escrow mock, mirroring docs ("sweep moves value into escrow
///      accounting; claim pulls it").
contract MockPonsCurve is IPonsCurve {
    MockPonsFeeEscrow public immutable escrow;
    address public immutable feeRecipient;

    constructor(address escrow_, address feeRecipient_) {
        escrow = MockPonsFeeEscrow(payable(escrow_));
        feeRecipient = feeRecipient_;
    }

    function sweepFees(uint256) external override {
        escrow.sweepFees(feeRecipient);
    }
}

/// @notice Testnet-only Pons V2 post-graduation hook stand-in.
/// @dev Real signature: `sweepPoolFees(poolId, minConversionQuoteOut,
///      minBuybackTokensOut)`. Pool/min-outs accepted and ignored here.
contract MockPonsHookSweep is IPonsHook {
    MockPonsFeeEscrow public immutable escrow;
    address public immutable feeRecipient;

    constructor(address escrow_, address feeRecipient_) {
        escrow = MockPonsFeeEscrow(payable(escrow_));
        feeRecipient = feeRecipient_;
    }

    function sweepPoolFees(bytes32, uint256, uint256) external override {
        escrow.sweepPoolFees(feeRecipient);
    }
}
