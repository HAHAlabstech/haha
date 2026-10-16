// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {HahaSetup} from "./helpers/HahaSetup.sol";
import {TipJar} from "../src/TipJar.sol";
import {IAccessControl} from "@openzeppelin/contracts/access/IAccessControl.sol";

contract TipJarTest is HahaSetup {
    uint256 internal constant ALICE_CUM_1 = 400_000_000;
    uint256 internal constant ALICE_CUM_2 = 700_000_000;

    function _fundAndStageSingleLeaf(uint256 cum) internal returns (bytes32 root) {
        root = leaf(alice, cum);
        vm.prank(keeper);
        tipJar.proposeRoot(1, root, cum);
        vm.warp(block.timestamp + 10 minutes + 1);
        tipJar.activateRoot();
    }

    function test_LeafIsDoubleHash() public view {
        bytes32 got = tipJar.leafHash(alice, ALICE_CUM_1);
        assertEq(got, keccak256(bytes.concat(keccak256(abi.encode(alice, ALICE_CUM_1)))));
        assertTrue(got != keccak256(abi.encode(alice, ALICE_CUM_1)), "single-hash must differ");
    }

    function test_ProposeActivateFlow() public {
        bytes32 root = keccak256("root");
        vm.prank(keeper);
        tipJar.proposeRoot(1, root, 0);
        assertEq(tipJar.pendingEpoch(), 1);
        vm.expectRevert(TipJar.DelayNotElapsed.selector);
        tipJar.activateRoot();
        vm.warp(block.timestamp + 10 minutes + 1);
        tipJar.activateRoot();
        assertEq(tipJar.merkleRoot(), root);
        assertEq(tipJar.currentEpoch(), 1);
    }

    function test_ProposeOnlyProposer() public {
        vm.expectRevert(
            abi.encodeWithSelector(
                IAccessControl.AccessControlUnauthorizedAccount.selector, alice, tipJar.PROPOSER_ROLE()
            )
        );
        vm.prank(alice);
        tipJar.proposeRoot(1, bytes32(0), 0);
    }

    function test_VetoClearsPending() public {
        vm.prank(keeper);
        tipJar.proposeRoot(1, keccak256("r"), 0);
        vm.prank(admin);
        tipJar.vetoRoot();
        vm.expectRevert(TipJar.NoPendingRoot.selector);
        tipJar.activateRoot();
    }

    function test_VetoAfterEtaReverts() public {
        vm.prank(keeper);
        tipJar.proposeRoot(1, keccak256("r"), 0);
        vm.warp(block.timestamp + 10 minutes + 1);
        vm.expectRevert(TipJar.VetoWindowPassed.selector);
        vm.prank(admin);
        tipJar.vetoRoot();
    }

    function test_ActivateRejectsInsolventRoot() public {
        usdg.mint(address(tipJar), 100_000_000);
        vm.prank(keeper);
        tipJar.proposeRoot(1, keccak256("r"), 200_000_000);
        vm.warp(block.timestamp + 10 minutes + 1);
        vm.expectRevert(TipJar.InsolventRoot.selector);
        tipJar.activateRoot();
    }

    function test_ClaimHappyPath() public {
        usdg.mint(address(tipJar), 2_000_000_000);
        _fundAndStageSingleLeaf(ALICE_CUM_1);
        uint256 deadline = block.timestamp + 30 minutes;
        (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, deadline, 0);
        bytes32[] memory proof = new bytes32[](0);
        tipJar.claim(alice, alice, ALICE_CUM_1, deadline, 0, v, r, s, proof);
        assertEq(usdg.balanceOf(alice), ALICE_CUM_1);
        assertEq(tipJar.cumulativeClaimed(alice), ALICE_CUM_1);
        assertEq(tipJar.nonces(alice), 1);
    }

    function test_ClaimMultiEpochCumulative() public {
        usdg.mint(address(tipJar), 2_000_000_000);
        _fundAndStageSingleLeaf(ALICE_CUM_1);
        uint256 deadline = block.timestamp + 30 minutes;
        (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, deadline, 0);
        tipJar.claim(alice, alice, ALICE_CUM_1, deadline, 0, v, r, s, new bytes32[](0));

        // Epoch 2: cumulative grows; payout is the delta only.
        bytes32 root2 = leaf(alice, ALICE_CUM_2);
        vm.prank(keeper);
        tipJar.proposeRoot(2, root2, ALICE_CUM_2);
        vm.warp(block.timestamp + 10 minutes + 1);
        tipJar.activateRoot();
        uint256 deadline2 = block.timestamp + 30 minutes;
        (uint8 v2, bytes32 r2, bytes32 s2) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_2, deadline2, 1);
        tipJar.claim(alice, alice, ALICE_CUM_2, deadline2, 1, v2, r2, s2, new bytes32[](0));
        assertEq(usdg.balanceOf(alice), ALICE_CUM_2, "total paid == latest cumulative");
    }

    function test_ClaimToAlternateRecipient() public {
        usdg.mint(address(tipJar), 2_000_000_000);
        _fundAndStageSingleLeaf(ALICE_CUM_1);
        uint256 deadline = block.timestamp + 30 minutes;
        (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, bob, ALICE_CUM_1, deadline, 0);
        tipJar.claim(alice, bob, ALICE_CUM_1, deadline, 0, v, r, s, new bytes32[](0));
        assertEq(usdg.balanceOf(bob), ALICE_CUM_1);
        assertEq(usdg.balanceOf(alice), 0);
    }

    function test_ClaimTwoLeafTree() public {
        // Mirrors OZ StandardMerkleTree.of: double-hash leaves, sorted pairs.
        usdg.mint(address(tipJar), 2_000_000_000);
        bytes32 leafA = leaf(alice, ALICE_CUM_1);
        bytes32 leafB = leaf(bob, 100_000_000);
        bytes32 root = hashPair(leafA, leafB);
        vm.prank(keeper);
        tipJar.proposeRoot(1, root, ALICE_CUM_1 + 100_000_000);
        vm.warp(block.timestamp + 10 minutes + 1);
        tipJar.activateRoot();
        uint256 deadline = block.timestamp + 30 minutes;
        (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, deadline, 0);
        bytes32[] memory proof = new bytes32[](1);
        proof[0] = leafB;
        tipJar.claim(alice, alice, ALICE_CUM_1, deadline, 0, v, r, s, proof);
        assertEq(usdg.balanceOf(alice), ALICE_CUM_1);
    }

    function test_ClaimReverts() public {
        usdg.mint(address(tipJar), 2_000_000_000);
        _fundAndStageSingleLeaf(ALICE_CUM_1);

        // Wrong cumulative -> invalid proof.
        {
            uint256 deadline = block.timestamp + 30 minutes;
            (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, 1, deadline, 0);
            vm.expectRevert(TipJar.InvalidProof.selector);
            tipJar.claim(alice, alice, 1, deadline, 0, v, r, s, new bytes32[](0));
        }
        // Wrong signer.
        {
            uint256 deadline = block.timestamp + 30 minutes;
            (uint8 v, bytes32 r, bytes32 s) = signClaim(BOB_PK, alice, alice, ALICE_CUM_1, deadline, 0);
            vm.expectRevert(TipJar.InvalidSignature.selector);
            tipJar.claim(alice, alice, ALICE_CUM_1, deadline, 0, v, r, s, new bytes32[](0));
        }
        // Expired + too-far deadlines.
        {
            (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, block.timestamp - 1, 0);
            vm.expectRevert(TipJar.ExpiredDeadline.selector);
            tipJar.claim(alice, alice, ALICE_CUM_1, block.timestamp - 1, 0, v, r, s, new bytes32[](0));
        }
        {
            uint256 far = block.timestamp + 2 hours;
            (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, far, 0);
            vm.expectRevert(TipJar.DeadlineTooFar.selector);
            tipJar.claim(alice, alice, ALICE_CUM_1, far, 0, v, r, s, new bytes32[](0));
        }
        // Success then replay (nonce) + double-claim (cumulative).
        {
            uint256 deadline = block.timestamp + 30 minutes;
            (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, deadline, 0);
            tipJar.claim(alice, alice, ALICE_CUM_1, deadline, 0, v, r, s, new bytes32[](0));
            vm.expectRevert(TipJar.BadNonce.selector);
            tipJar.claim(alice, alice, ALICE_CUM_1, deadline, 0, v, r, s, new bytes32[](0));
            uint256 deadline2 = block.timestamp + 30 minutes;
            (uint8 v2, bytes32 r2, bytes32 s2) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, deadline2, 1);
            vm.expectRevert(TipJar.NothingToClaim.selector);
            tipJar.claim(alice, alice, ALICE_CUM_1, deadline2, 1, v2, r2, s2, new bytes32[](0));
        }
    }

    function test_ClaimPerTxCap() public {
        usdg.mint(address(tipJar), 2_000_000_000);
        _fundAndStageSingleLeaf(ALICE_CUM_1);
        vm.prank(admin);
        tipJar.setMaxClaimBps(100); // 1% of balance = 10 USDG < 400 payout
        uint256 deadline = block.timestamp + 30 minutes;
        (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, ALICE_CUM_1, deadline, 0);
        vm.expectRevert(TipJar.ClaimTooLarge.selector);
        tipJar.claim(alice, alice, ALICE_CUM_1, deadline, 0, v, r, s, new bytes32[](0));
    }

    function testFuzz_LeafPreimageDistinct(address a, address b, uint256 x, uint256 y) public view {
        vm.assume(a != b || x != y);
        assertTrue(tipJar.leafHash(a, x) != tipJar.leafHash(b, y));
    }

    function testFuzz_CumulativePayoutsSum(uint96 d1, uint96 d2, uint96 d3) public {
        uint256 c1 = bound(d1, 1, 300_000_000);
        uint256 c2 = bound(d2, 1, 300_000_000);
        uint256 c3 = bound(d3, 1, 300_000_000);
        uint256 cum1 = c1;
        uint256 cum2 = c1 + c2;
        uint256 cum3 = c1 + c2 + c3;
        usdg.mint(address(tipJar), cum3 * 5); // keep every delta under the 25%/tx cap
        uint256 epoch = 0;
        uint256[3] memory cums = [cum1, cum2, cum3];
        for (uint256 i = 0; i < 3; i++) {
            epoch++;
            vm.prank(keeper);
            tipJar.proposeRoot(epoch, leaf(alice, cums[i]), cums[i]);
            vm.warp(block.timestamp + 10 minutes + 1);
            tipJar.activateRoot();
            uint256 deadline = block.timestamp + 30 minutes;
            (uint8 v, bytes32 r, bytes32 s) = signClaim(ALICE_PK, alice, alice, cums[i], deadline, i);
            tipJar.claim(alice, alice, cums[i], deadline, i, v, r, s, new bytes32[](0));
        }
        assertEq(usdg.balanceOf(alice), cum3, "payouts sum to final cumulative");
        assertEq(tipJar.totalPaidOut(), cum3);
    }
}
