// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";

/// @title VaultRegistry — on-chain proof of Joke Vault dataset releases
/// @notice Weekly `publishSnapshot` anchors (entryCount, replacement cost in
///         MICRO-USD — never dollars — merkleRoot, R2 manifest URI).
///         Enough to emit the event; state is kept for explorers.
contract VaultRegistry is AccessControl {
    bytes32 public constant PUBLISHER_ROLE = keccak256("PUBLISHER_ROLE");

    struct Snapshot {
        uint256 entryCount;
        uint256 replacementMicroUsd;
        bytes32 merkleRoot;
        string r2ManifestUri;
        uint256 timestamp;
    }

    Snapshot[] private _snapshots;

    event VaultSnapshotPublished(
        uint256 indexed snapshotId,
        uint256 entryCount,
        uint256 replacementMicroUsd,
        bytes32 merkleRoot,
        string r2ManifestUri
    );

    constructor(address admin_, address publisher_) {
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PUBLISHER_ROLE, publisher_);
    }

    function publishSnapshot(
        uint256 entryCount,
        uint256 replacementMicroUsd,
        bytes32 merkleRoot,
        string calldata r2ManifestUri
    ) external onlyRole(PUBLISHER_ROLE) returns (uint256 snapshotId) {
        snapshotId = _snapshots.length;
        _snapshots.push(
            Snapshot({
                entryCount: entryCount,
                replacementMicroUsd: replacementMicroUsd,
                merkleRoot: merkleRoot,
                r2ManifestUri: r2ManifestUri,
                timestamp: block.timestamp
            })
        );
        emit VaultSnapshotPublished(snapshotId, entryCount, replacementMicroUsd, merkleRoot, r2ManifestUri);
    }

    function snapshotCount() external view returns (uint256) {
        return _snapshots.length;
    }

    function getSnapshot(uint256 snapshotId) external view returns (Snapshot memory) {
        return _snapshots[snapshotId];
    }
}
