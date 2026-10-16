// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IPonsFeeEscrow} from "../interfaces/IPonsFeeEscrow.sol";
import {MockUSDG} from "./MockUSDG.sol";

/// @notice Testnet-only Pons V2 fee escrow stand-in.
/// @dev Lifecycle per recipient: pending (pre-sweep, hook-side) ->
///      sweepFees/sweepPoolFees -> claimable -> claimToken(USDC).
///      `claim()` is the native/base variant and is a safe no-op when no
///      native fees were simulated. These mocks prove ACCOUNTING only —
///      the Uniswap v4 hook path must be fork-tested against mainnet.
contract MockPonsFeeEscrow is IPonsFeeEscrow {
    using SafeERC20 for IERC20;

    MockUSDG public immutable usdg;

    mapping(address => uint256) public pendingFee;
    mapping(address => uint256) public pendingTax;
    mapping(address => uint256) public claimableFee;
    mapping(address => uint256) public claimableTax;
    mapping(address => uint256) public claimableNative;

    event TradingFeesSimulated(address indexed recipient, uint256 amount, bool isCreatorTax);
    event Swept(address indexed recipient, uint256 fee, uint256 tax);
    event Claimed(address indexed recipient, uint256 amount);

    constructor(address usdg_) {
        usdg = MockUSDG(usdg_);
    }

    /// @notice Simulate quote-asset trading fees accruing to `recipient`.
    function simulateTradingFees(address recipient, uint256 amount) external {
        usdg.mint(address(this), amount);
        pendingFee[recipient] += amount;
        emit TradingFeesSimulated(recipient, amount, false);
    }

    /// @notice Simulate creator-tax accrual (hook side).
    function simulateCreatorTax(address recipient, uint256 amount) external {
        usdg.mint(address(this), amount);
        pendingTax[recipient] += amount;
        emit TradingFeesSimulated(recipient, amount, true);
    }

    function pendingFees(address recipient) external view returns (uint256) {
        return pendingFee[recipient];
    }

    function pendingCreatorTax(address recipient) external view returns (uint256) {
        return pendingTax[recipient];
    }

    function quoteFeeBalance(address recipient) external view returns (uint256) {
        return claimableFee[recipient];
    }

    function creatorTaxBalance(address recipient) external view returns (uint256) {
        return claimableTax[recipient];
    }

    function balanceOf(address recipient) external view returns (uint256) {
        return claimableFee[recipient] + claimableTax[recipient];
    }

    function balanceOfToken(address recipient, address token) external view returns (uint256) {
        if (token != address(usdg)) return 0;
        return claimableFee[recipient] + claimableTax[recipient];
    }

    function sweepFees(address recipient) external {
        uint256 fee = pendingFee[recipient];
        pendingFee[recipient] = 0;
        claimableFee[recipient] += fee;
        emit Swept(recipient, fee, 0);
    }

    function sweepPoolFees(address recipient) external {
        uint256 tax = pendingTax[recipient];
        pendingTax[recipient] = 0;
        claimableTax[recipient] += tax;
        emit Swept(recipient, 0, tax);
    }

    function claim() external {
        uint256 amount = claimableNative[msg.sender];
        claimableNative[msg.sender] = 0;
        if (amount > 0) {
            (bool ok,) = msg.sender.call{value: amount}("");
            require(ok, "native-send-failed");
        }
    }

    function claimToken(address token) external {
        require(token == address(usdg), "only-usdg");
        uint256 amount = claimableFee[msg.sender] + claimableTax[msg.sender];
        require(amount > 0, "nothing-to-claim");
        claimableFee[msg.sender] = 0;
        claimableTax[msg.sender] = 0;
        usdg.transfer(msg.sender, amount);
        emit Claimed(msg.sender, amount);
    }

    receive() external payable {}
}
