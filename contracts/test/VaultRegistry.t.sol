// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {VaultRegistry} from "../src/VaultRegistry.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract VaultRegistryTest is HahaSetup {
    function test_PublishSnapshot() public {
        vm.prank(keeper);
        uint256 id = registry.publishSnapshot(1_000, 12_000_000_000, keccak256("vault-root"), "r2://vault/snap-1");
        assertEq(id, 0);
        assertEq(registry.snapshotCount(), 1);
        VaultRegistry.Snapshot memory s = registry.getSnapshot(0);
        assertEq(s.entryCount, 1_000);
        assertEq(s.replacementMicroUsd, 12_000_000_000, "micro-USD, never dollars");
        assertEq(s.merkleRoot, keccak256("vault-root"));
        assertEq(s.r2ManifestUri, "r2://vault/snap-1");
        assertGt(s.timestamp, 0);
    }

    function test_PublishOnlyPublisher() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, registry.PUBLISHER_ROLE()
            )
        );
        vm.prank(alice);
        registry.publishSnapshot(1, 1, bytes32(0), "");
    }

    function testFuzz_PublishMonotonicIds(uint8 n) public {
        uint256 count = bound(n, 1, 20);
        for (uint256 i = 0; i < count; i++) {
            vm.prank(keeper);
            uint256 id = registry.publishSnapshot(i, i * 1e6, keccak256(abi.encode(i)), "");
            assertEq(id, i);
        }
        assertEq(registry.snapshotCount(), count);
    }
}
