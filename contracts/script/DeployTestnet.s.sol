// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockHAHA} from "../src/mocks/MockHAHA.sol";
import {MockPonsFeeEscrow} from "../src/mocks/MockPonsFeeEscrow.sol";
import {MockPonsCurve, MockPonsHookSweep} from "../src/mocks/MockPonsSweep.sol";
import {MockPonsFactory} from "../src/mocks/MockPonsFactory.sol";
import {MockUniversalRouter} from "../src/mocks/MockUniversalRouter.sol";
import {MockPoolManager, MockPonsHook} from "../src/mocks/MockPoolManager.sol";
import {FeeSplitter} from "../src/FeeSplitter.sol";
import {TipJar} from "../src/TipJar.sol";
import {MicDrop} from "../src/MicDrop.sol";
import {CrowdStaking} from "../src/CrowdStaking.sol";
import {VaultRegistry} from "../src/VaultRegistry.sol";
import {ProducerGateway} from "../src/ProducerGateway.sol";

/// @notice Testnet (46630) deploy: 6 production + mock suite. Testnet root
///         delay is 10 minutes (mainnet: 24h).
/// @dev FeeSplitter's tipJar/micDrop are immutable while MicDrop needs the
///      splitter address — a construction cycle. Testnet-safe resolution:
///      deploy the splitter against TipJar + a throwaway MicDrop placeholder,
///      then timelock-rotate (48h) to the real MicDrop.
contract DeployTestnet is Script {
    MockUSDG internal usdg;
    MockHAHA internal haha;
    address internal deployer;
    address internal cold;

    function run() external {
        deployer = vm.addr(vm.envUint("OPERATOR_PRIVATE_KEY"));
        cold = vm.envAddress("ADMIN_COLD_ADDRESS");
        vm.startBroadcast(vm.envUint("OPERATOR_PRIVATE_KEY"));
        _deployMocks();
        TipJar tipJar = new TipJar(address(usdg), cold, deployer, cold, 10 minutes);
        MicDrop placeholder = new MicDrop(address(usdg), address(tipJar), address(0), cold, deployer, 10 minutes);
        FeeSplitter splitter = new FeeSplitter(
            address(usdg), address(_escrow()), address(tipJar), address(placeholder), cold, deployer, 10 minutes
        );
        // Bind sweep refs to testnet mock curve/hook (prod: real Pons curve+poolId).
        MockPonsCurve mockCurve = new MockPonsCurve(address(_escrow()), address(splitter));
        MockPonsHookSweep mockSweepHook = new MockPonsHookSweep(address(_escrow()), address(splitter));
        _deployRest(address(usdg), address(haha), address(splitter), address(tipJar), cold, deployer);
        vm.stopBroadcast();
        console.log("MockPonsCurve:", address(mockCurve));
        console.log("MockPonsHookSweep:", address(mockSweepHook));
        // Testnet rehearsal: propose launch refs now (10m timelock; confirm later).
        vm.startBroadcast(vm.envUint("OPERATOR_PRIVATE_KEY"));
        splitter.proposeSetLaunchRefs(address(mockCurve), address(mockSweepHook), bytes32(uint256(1)));
        vm.stopBroadcast();
        console.log("NOTE: confirmSetLaunchRefs after 10m; MicDrop rotation also 10m (testnet TIMELOCK).");
        console.log("FeeSplitter:", address(splitter));
        console.log("TipJar:", address(tipJar));
        console.log("NOTE: splitter.micDrop is a placeholder; proposeSetMicDrop -> confirm after 48h");
    }

    MockPonsFeeEscrow internal _escrowStore;

    function _escrow() internal view returns (MockPonsFeeEscrow) {
        return _escrowStore;
    }

    function _deployMocks() internal {
        usdg = new MockUSDG();
        haha = new MockHAHA();
        _escrowStore = new MockPonsFeeEscrow(address(usdg));
        MockPonsFactory factory = new MockPonsFactory();
        MockPoolManager poolManager = new MockPoolManager();
        MockPonsHook hook = new MockPonsHook();
        console.log("MockUSDG:", address(usdg));
        console.log("MockHAHA:", address(haha));
        console.log("MockPonsFeeEscrow:", address(_escrowStore));
        console.log("MockPonsFactory:", address(factory));
        console.log("MockPoolManager:", address(poolManager));
        console.log("MockPonsHook:", address(hook));
    }

    function _deployRest(
        address usdgAddr,
        address hahaAddr,
        address splitterAddr,
        address tipJarAddr,
        address coldAddr,
        address deployerAddr
    ) internal {
        MockUniversalRouter router = new MockUniversalRouter(usdgAddr, hahaAddr, splitterAddr);
        // Testnet rehearsal uses the SHORT confirm window; DeployMainnet passes 48h.
        MicDrop micDrop = new MicDrop(usdgAddr, splitterAddr, address(router), coldAddr, deployerAddr, 10 minutes);
        CrowdStaking staking = new CrowdStaking(hahaAddr, tipJarAddr, coldAddr, deployerAddr, 10 ether);
        VaultRegistry registry = new VaultRegistry(coldAddr, deployerAddr);
        uint256[4] memory prices =
            [uint256(2_500_000_000), uint256(1_000_000_000), uint256(500_000_000), uint256(500_000_000)];
        ProducerGateway gateway =
            new ProducerGateway(usdgAddr, coldAddr, tipJarAddr, address(micDrop), coldAddr, prices);
        micDrop.setRouter(address(router));
        console.log("MockUniversalRouter:", address(router));
        console.log("MicDrop:", address(micDrop));
        console.log("CrowdStaking:", address(staking));
        console.log("VaultRegistry:", address(registry));
        console.log("ProducerGateway:", address(gateway));
    }
}
