// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

/// @notice Testnet-only Pons V2 launch factory stand-in: launch event + canLaunch.
contract MockPonsFactory {
    struct Launch {
        address token;
        address feeRecipient;
        address pairToken;
        uint256 creatorTaxBps;
        bool buybackEnabled;
        address[] exempt;
    }

    Launch[] private _launches;

    event Launched(
        address indexed token,
        address indexed feeRecipient,
        address pairToken,
        uint256 creatorTaxBps,
        bool buybackEnabled
    );

    function canLaunch(address) external pure returns (bool) {
        return true;
    }

    function launch(
        address token,
        address feeRecipient,
        address pairToken,
        uint256 creatorTaxBps,
        bool buybackEnabled,
        address[] calldata exempt
    ) external returns (uint256 launchId) {
        launchId = _launches.length;
        _launches.push(
            Launch({
                token: token,
                feeRecipient: feeRecipient,
                pairToken: pairToken,
                creatorTaxBps: creatorTaxBps,
                buybackEnabled: buybackEnabled,
                exempt: exempt
            })
        );
        emit Launched(token, feeRecipient, pairToken, creatorTaxBps, buybackEnabled);
    }

    function getLaunchedToken(uint256 launchId) external view returns (Launch memory) {
        return _launches[launchId];
    }

    function launchCount() external view returns (uint256) {
        return _launches.length;
    }
}
