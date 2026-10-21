// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Test} from "forge-std/Test.sol";
import {MockUSDG} from "../../src/mocks/MockUSDG.sol";
import {MockHAHA} from "../../src/mocks/MockHAHA.sol";
import {MockPonsFeeEscrow} from "../../src/mocks/MockPonsFeeEscrow.sol";
import {MockPonsFactory} from "../../src/mocks/MockPonsFactory.sol";
import {MockPonsCurve, MockPonsHookSweep} from "../../src/mocks/MockPonsSweep.sol";
import {MockUniversalRouter} from "../../src/mocks/MockUniversalRouter.sol";
import {MockPoolManager, MockPonsHook} from "../../src/mocks/MockPoolManager.sol";
import {FeeSplitter} from "../../src/FeeSplitter.sol";
import {TipJar} from "../../src/TipJar.sol";
import {MicDrop} from "../../src/MicDrop.sol";
import {CrowdStaking} from "../../src/CrowdStaking.sol";
import {VaultRegistry} from "../../src/VaultRegistry.sol";
import {ProducerGateway} from "../../src/ProducerGateway.sol";

/// @notice Shared Foundry setup: full mock suite + wired production stack.
/// @dev FeeSplitter is deployed against an EOA placeholder micDrop (ERC20
///      transfers to EOAs succeed); `rotateMicDrop()` timelock-rotates the
///      splitter to the real MicDrop when a test needs the full money path.
contract HahaSetup is Test {
    uint256 internal constant ALICE_PK = 0xa11ce;
    uint256 internal constant BOB_PK = 0xb0b;
    uint256 internal constant CAROL_PK = 0xca401;

    address internal admin; // cold: DEFAULT_ADMIN + guardian + treasury
    address internal keeper; // hot: proposer/keeper/slasher/publisher
    address internal alice;
    address internal bob;
    address internal carol;
    address internal placeholderDrop;

    MockUSDG internal usdg;
    MockHAHA internal haha;
    MockPonsFeeEscrow internal escrow;
    MockPonsFactory internal factory;
    MockPonsCurve internal sweepCurve;
    MockPonsHookSweep internal sweepHook;
    MockUniversalRouter internal router;
    MockPoolManager internal poolManager;
    MockPonsHook internal hook;
    FeeSplitter internal splitter;
    TipJar internal tipJar;
    MicDrop internal micDrop;
    CrowdStaking internal staking;
    VaultRegistry internal registry;
    ProducerGateway internal gateway;

    bytes32 internal constant CLAIM_TYPEHASH =
        keccak256("Claim(address account,address recipient,uint256 cumulativeMicro,uint256 deadline,uint256 nonce)");
    bytes32 internal constant EIP712_TYPEHASH =
        keccak256("EIP712Domain(string name,string version,uint256 chainId,address verifyingContract)");

    function setUp() public virtual {
        admin = makeAddr("cold-admin");
        keeper = makeAddr("hot-keeper");
        alice = vm.addr(ALICE_PK);
        bob = vm.addr(BOB_PK);
        carol = vm.addr(CAROL_PK);
        placeholderDrop = makeAddr("placeholder-drop");

        usdg = new MockUSDG();
        haha = new MockHAHA();
        escrow = new MockPonsFeeEscrow(address(usdg));
        factory = new MockPonsFactory();
        poolManager = new MockPoolManager();
        hook = new MockPonsHook();

        // Testnet root delay: 10 minutes (mainnet: 24h).
        tipJar = new TipJar(address(usdg), admin, keeper, admin, 10 minutes);
        splitter = new FeeSplitter(
            address(usdg), address(escrow), address(tipJar), placeholderDrop, admin, keeper, 48 hours
        );
        sweepCurve = new MockPonsCurve(address(escrow), address(splitter));
        sweepHook = new MockPonsHookSweep(address(escrow), address(splitter));
        // Production-representative: sweep refs bound (post-Lampiran-A).
        // Tests needing the zero-refs path assert on a fresh splitter instead.
        vm.prank(admin);
        splitter.proposeSetLaunchRefs(address(sweepCurve), address(sweepHook), bytes32(uint256(1)));
        vm.warp(block.timestamp + 48 hours);
        vm.prank(admin);
        splitter.confirmSetLaunchRefs();
        router = new MockUniversalRouter(address(usdg), address(haha), address(splitter));
        micDrop = new MicDrop(address(usdg), address(router), admin, keeper, 48 hours);
        staking = new CrowdStaking(address(haha), address(tipJar), admin, keeper, 10 ether);
        registry = new VaultRegistry(admin, keeper);
        uint256[4] memory prices =
            [uint256(2_500_000_000), uint256(1_000_000_000), uint256(500_000_000), uint256(500_000_000)];
        gateway =
            new ProducerGateway(address(usdg), admin, address(tipJar), address(micDrop), admin, prices);
    }

    /// @notice Bind splitter sweep refs to the mock curve/hook (48h timelock).
    function bindSweepRefs() internal {
        vm.prank(admin);
        splitter.proposeSetLaunchRefs(address(sweepCurve), address(sweepHook), bytes32(uint256(1)));
        vm.warp(block.timestamp + 48 hours);
        vm.prank(admin);
        splitter.confirmSetLaunchRefs();
    }

    /// @notice Timelock-rotate the splitter from the placeholder to the real MicDrop.
    function rotateMicDrop() internal {
        vm.prank(admin);
        splitter.proposeSetMicDrop(address(micDrop));
        vm.warp(block.timestamp + 48 hours);
        vm.prank(admin);
        splitter.confirmSetMicDrop();
        assertEq(splitter.micDrop(), address(micDrop));
    }

    /// @notice EIP-712 digest for TipJar.claim (mirrors OZ EIP712("HAHA-TipJar","1")).
    function claimDigest(
        address account,
        address recipient,
        uint256 cumulativeMicro,
        uint256 deadline,
        uint256 nonce
    ) internal view returns (bytes32) {
        bytes32 domain = keccak256(
            abi.encode(EIP712_TYPEHASH, keccak256("HAHA-TipJar"), keccak256("1"), block.chainid, address(tipJar))
        );
        bytes32 structHash =
            keccak256(abi.encode(CLAIM_TYPEHASH, account, recipient, cumulativeMicro, deadline, nonce));
        return keccak256(abi.encodePacked("\x19\x01", domain, structHash));
    }

    function signClaim(uint256 pk, address account, address recipient, uint256 cum, uint256 deadline, uint256 nonce)
        internal
        view
        returns (uint8 v, bytes32 r, bytes32 s)
    {
        (v, r, s) = vm.sign(pk, claimDigest(account, recipient, cum, deadline, nonce));
    }

    /// @notice OZ MerkleProof commutative pair hash (a < b strict).
    function hashPair(bytes32 a, bytes32 b) internal pure returns (bytes32) {
        return a < b ? keccak256(abi.encode(a, b)) : keccak256(abi.encode(b, a));
    }

    function leaf(address account, uint256 cum) internal pure returns (bytes32) {
        return keccak256(bytes.concat(keccak256(abi.encode(account, cum))));
    }
}
