// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import {ERC20Burnable} from "@openzeppelin/contracts/token/ERC20/extensions/ERC20Burnable.sol";

/// @title HAHA
/// @notice Standalone fixed-issuance token for the pre-Pons project phase.
/// No owner, mint, faucet, blacklist, transfer tax, or upgrade surface exists.
/// Initial supply is assigned once to the owner-selected operator wallet.
contract HAHA is ERC20, ERC20Burnable {
    uint256 public constant INITIAL_SUPPLY = 1_000_000_000 ether;

    error ZeroRecipient();

    constructor(address initialRecipient) ERC20("HAHA", "HAHA") {
        if (initialRecipient == address(0)) revert ZeroRecipient();
        _mint(initialRecipient, INITIAL_SUPPLY);
    }
}
