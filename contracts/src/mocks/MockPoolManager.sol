// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Testnet-only Pons hook stand-in (1% hook fee + failure injection).
contract MockPonsHook {
    uint256 public constant HOOK_FEE_BPS = 100;
    bool public failMode;

    error HookFailed();

    event FailModeUpdated(bool failMode);

    function setFailMode(bool fail) external {
        failMode = fail;
        emit FailModeUpdated(fail);
    }

    function hookFeeBps() external view returns (uint256) {
        if (failMode) revert HookFailed();
        return HOOK_FEE_BPS;
    }
}

/// @notice Testnet-only Uniswap v4 PoolManager stand-in (reserve stub + failure injection).
contract MockPoolManager {
    uint256 public reserveUsdg;
    bool public failMode;

    error PoolFailed();

    event ReserveUpdated(uint256 reserveUsdg);
    event FailModeUpdated(bool failMode);

    function setReserve(uint256 reserveUsdg_) external {
        reserveUsdg = reserveUsdg_;
        emit ReserveUpdated(reserveUsdg_);
    }

    function setFailMode(bool fail) external {
        failMode = fail;
        emit FailModeUpdated(fail);
    }

    function getReserveUsdg() external view returns (uint256) {
        if (failMode) revert PoolFailed();
        return reserveUsdg;
    }
}
