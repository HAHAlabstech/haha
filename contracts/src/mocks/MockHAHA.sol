// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Testnet-only $HAHA stand-in: 18 decimals, 1B fixed supply to deployer.
contract MockHAHA is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 1_000 ether;

    constructor() ERC20("HAHA", "HAHA") {
        _mint(msg.sender, 1_000_000_000 ether);
    }

    function mintTest() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
