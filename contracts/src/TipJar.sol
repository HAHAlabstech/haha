// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {EIP712} from "@openzeppelin/contracts/utils/cryptography/EIP712.sol";
import {ECDSA} from "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import {MerkleProof} from "@openzeppelin/contracts/utils/cryptography/MerkleProof.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title TipJar — cumulative Merkle USDG rewards (double-hash leaves)
/// @notice Leaf MUST be double-hashed on BOTH sides (on-chain + backend):
///         keccak256(bytes.concat(keccak256(abi.encode(account, cumulativeMicro))))
///         Single-hash leaves ALWAYS fail verification. Backend must build the
///         tree with the same double-hash (OZ StandardMerkleTree.of equivalent).
/// @dev Economics: 70% of creator fees + 30% of B2B inflow land here as USDG
///      (micro units, uint256). Backend computes the 5%/account/epoch cap —
///      the contract only sees cumulative totals across epochs. `activateRoot`
///      enforces the solvency invariant: totalCumulative <= balance + paidOut.
contract TipJar is AccessControl, EIP712, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant PROPOSER_ROLE = keccak256("PROPOSER_ROLE"); // hot
    bytes32 public constant GUARDIAN_ROLE = keccak256("GUARDIAN_ROLE"); // cold (veto)

    bytes32 private constant CLAIM_TYPEHASH =
        keccak256("Claim(address account,address recipient,uint256 cumulativeMicro,uint256 deadline,uint256 nonce)");

    uint256 public constant MAX_DEADLINE_WINDOW = 1 hours;

    IERC20 public immutable usdg;

    bytes32 public merkleRoot;
    uint256 public currentEpoch;
    mapping(address => uint256) public cumulativeClaimed;
    mapping(address => uint256) public nonces;

    bytes32 public pendingRoot;
    uint256 public pendingEpoch;
    uint256 public pendingTotal;
    uint256 public pendingEta;
    uint256 public rootDelay;
    uint256 public maxClaimBps; // per-tx cap as % of jar balance (default 25%)
    uint256 public totalPaidOut; // lifetime USDG paid via claim()

    event RootProposed(uint256 indexed epoch, bytes32 root, uint256 totalCumulative, uint256 eta);
    event RootActivated(uint256 indexed epoch, bytes32 root);
    event RootVetoed(uint256 indexed epoch, bytes32 root);
    event Claimed(address indexed account, address indexed recipient, uint256 payout, uint256 cumulativeMicro);
    event RootDelayUpdated(uint256 rootDelay);
    event MaxClaimBpsUpdated(uint256 maxClaimBps);

    error NoPendingRoot();
    error PendingExists();
    error DelayNotElapsed();
    error VetoWindowPassed();
    error EpochNotIncreasing();
    error InsolventRoot();
    error ExpiredDeadline();
    error DeadlineTooFar();
    error BadNonce();
    error InvalidSignature();
    error InvalidProof();
    error NothingToClaim();
    error ClaimTooLarge();

    constructor(
        address usdg_,
        address admin_,
        address proposer_,
        address guardian_,
        uint256 rootDelay_
    ) EIP712("HAHA-TipJar", "1") {
        usdg = IERC20(usdg_);
        rootDelay = rootDelay_;
        maxClaimBps = 2500;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(PROPOSER_ROLE, proposer_);
        _grantRole(GUARDIAN_ROLE, guardian_);
        emit RootDelayUpdated(rootDelay_);
    }

    /// @notice Canonical double-hash leaf. MUST match the backend tree builder.
    function leafHash(address account, uint256 cumulativeMicro) public pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, cumulativeMicro))));
    }

    /// @notice Hot proposer stages a new epoch root (24h delay mainnet / 10m testnet).
    function proposeRoot(uint256 epoch, bytes32 newRoot, uint256 totalCumulative)
        external
        onlyRole(PROPOSER_ROLE)
    {
        if (pendingEta != 0) revert PendingExists();
        if (epoch <= currentEpoch) revert EpochNotIncreasing();
        pendingRoot = newRoot;
        pendingEpoch = epoch;
        pendingTotal = totalCumulative;
        pendingEta = block.timestamp + rootDelay;
        emit RootProposed(epoch, newRoot, totalCumulative, pendingEta);
    }

    /// @notice Anyone may activate once the delay elapses. Reverts if the
    ///         root claims more cumulative value than the jar ever received.
    function activateRoot() external {
        if (pendingEta == 0) revert NoPendingRoot();
        if (block.timestamp < pendingEta) revert DelayNotElapsed();
        if (pendingTotal > usdg.balanceOf(address(this)) + totalPaidOut) revert InsolventRoot();
        merkleRoot = pendingRoot;
        currentEpoch = pendingEpoch;
        emit RootActivated(pendingEpoch, pendingRoot);
        pendingRoot = bytes32(0);
        pendingEpoch = 0;
        pendingTotal = 0;
        pendingEta = 0;
    }

    /// @notice Cold guardian vetoes a staged root any time before activation.
    function vetoRoot() external onlyRole(GUARDIAN_ROLE) {
        if (pendingEta == 0) revert NoPendingRoot();
        if (block.timestamp >= pendingEta) revert VetoWindowPassed();
        emit RootVetoed(pendingEpoch, pendingRoot);
        pendingRoot = bytes32(0);
        pendingEpoch = 0;
        pendingTotal = 0;
        pendingEta = 0;
    }

    function setRootDelay(uint256 rootDelay_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        rootDelay = rootDelay_;
        emit RootDelayUpdated(rootDelay_);
    }

    function setMaxClaimBps(uint256 bps) external onlyRole(DEFAULT_ADMIN_ROLE) {
        require(bps <= 10_000, "bps>100%");
        maxClaimBps = bps;
        emit MaxClaimBpsUpdated(bps);
    }

    /// @notice Claim the delta between the Merkle cumulative and already-claimed.
    /// @param account Earner whose cumulative is in the tree (signature + nonce owner).
    /// @param recipient Payout destination (may differ from account — e.g. frozen wallet).
    function claim(
        address account,
        address recipient,
        uint256 cumulativeMicro,
        uint256 deadline,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s,
        bytes32[] calldata proof
    ) external nonReentrant {
        _checkDeadline(deadline);
        _consumeAuth(account, recipient, cumulativeMicro, deadline, nonce, v, r, s);
        if (!MerkleProof.verify(proof, merkleRoot, leafHash(account, cumulativeMicro))) revert InvalidProof();
        _payout(account, recipient, cumulativeMicro);
    }

    function _checkDeadline(uint256 deadline) internal view {
        if (deadline < block.timestamp) revert ExpiredDeadline();
        if (deadline > block.timestamp + MAX_DEADLINE_WINDOW) revert DeadlineTooFar();
    }

    function _consumeAuth(
        address account,
        address recipient,
        uint256 cumulativeMicro,
        uint256 deadline,
        uint256 nonce,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) internal {
        if (nonces[account] != nonce) revert BadNonce();
        bytes32 structHash =
            keccak256(abi.encode(CLAIM_TYPEHASH, account, recipient, cumulativeMicro, deadline, nonce));
        if (ECDSA.recover(_hashTypedDataV4(structHash), v, r, s) != account) revert InvalidSignature();
        nonces[account] = nonce + 1;
    }

    function _payout(address account, address recipient, uint256 cumulativeMicro) internal {
        uint256 paid = cumulativeClaimed[account];
        if (cumulativeMicro <= paid) revert NothingToClaim();
        uint256 payout = cumulativeMicro - paid;
        if (payout * 10_000 > usdg.balanceOf(address(this)) * maxClaimBps) revert ClaimTooLarge();
        cumulativeClaimed[account] = cumulativeMicro;
        totalPaidOut += payout;
        usdg.safeTransfer(recipient, payout);
        emit Claimed(account, recipient, payout, cumulativeMicro);
    }
}
