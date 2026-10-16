// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

/// @notice Testnet-only USDG stand-in: 6 decimals + open faucet.
contract MockUSDG is ERC20 {
    uint256 public constant FAUCET_AMOUNT = 10_000_000_000; // 10,000 USDG (6 dec)

    constructor() ERC20("Global Dollar", "USDG") {}

    function decimals() public pure override returns (uint8) {
        return 6;
    }

    /// @notice Testnet faucet: mints 10,000 USDG to the caller.
    function mintTest() external {
        _mint(msg.sender, FAUCET_AMOUNT);
    }

    /// @notice Open mint for settlement/fee simulation in tests.
    function mint(address to, uint256 amount) external {
        _mint(to, amount);
    }
}
