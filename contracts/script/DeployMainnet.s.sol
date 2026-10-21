// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {Script, console} from "forge-std/Script.sol";
import {TipJar} from "../src/TipJar.sol";
import {MicDrop} from "../src/MicDrop.sol";
import {FeeSplitter} from "../src/FeeSplitter.sol";
import {CrowdStaking} from "../src/CrowdStaking.sol";
import {VaultRegistry} from "../src/VaultRegistry.sol";
import {ProducerGateway} from "../src/ProducerGateway.sol";

interface IDecimals {
    function decimals() external view returns (uint8);
}

/// @notice Mainnet (4663) deployment + read-only preflight.
///
/// SAFETY MODEL
/// - `forge script DeployMainnet --fork-url $RPC_URL_MAINNET` only simulates.
/// - A real broadcast requires BOTH `--broadcast` AND
///   `MAINNET_DEPLOY_CONFIRM=DEPLOY_HAHA_MAINNET_4663`.
/// - Without the phrase this script stops after preflight and prints addresses
///   it WOULD deploy. That is the intended "prepare, do not deploy" mode.
///
/// PREFLIGHT FIX (21 Oct 2026): the previous gate called the state-changing
/// `claimToken(address)` and `claim()` through `staticcall`. Any real escrow
/// writes balances, so the EVM reverts with StateChangeDuringStaticCall even
/// when the functions exist. That produced a false negative. This gate now:
///   1. staticcalls ONLY view functions, and
///   2. checks the dispatcher bytecode for the claim selectors.
/// Selector presence is a heuristic, not a substitute for the 72h fork test.
contract DeployMainnet is Script {
    error PreflightFailed(string check);

    uint256 internal constant MAINNET_CHAIN_ID = 4663;
    uint256 internal constant TIPJAR_ROOT_DELAY = 24 hours;
    uint256 internal constant TIMELOCK = 48 hours;
    bytes32 internal constant DEPLOY_PHRASE_HASH =
        keccak256("DEPLOY_HAHA_MAINNET_4663");

    function run() external {
        Preflight memory p = _preflight();

        string memory confirm = vm.envOr("MAINNET_DEPLOY_CONFIRM", string(""));
        if (keccak256(bytes(confirm)) != DEPLOY_PHRASE_HASH) {
            console.log("PREFLIGHT OK - no broadcast (confirmation phrase absent)");
            console.log("Set MAINNET_DEPLOY_CONFIRM=DEPLOY_HAHA_MAINNET_4663 and pass --broadcast to deploy.");
            return;
        }

        _deploy(p);
    }

    struct Preflight {
        address usdg;
        address escrow;
        address factory;
        address router;
        address poolManager;
        address hook;
        address cold;
        address treasury;
        address haha;
    }

    function _preflight() internal view returns (Preflight memory p) {
        if (block.chainid != MAINNET_CHAIN_ID) {
            revert PreflightFailed("chainid != 4663");
        }

        p.usdg = vm.envAddress("USDG_ADDRESS");
        p.escrow = vm.envAddress("PONS_FEE_ESCROW_ADDRESS");
        p.factory = vm.envAddress("PONS_FACTORY_ADDRESS");
        p.router = vm.envAddress("UNIVERSAL_ROUTER_ADDRESS");
        p.poolManager = vm.envAddress("POOL_MANAGER_ADDRESS");
        p.hook = vm.envAddress("PONS_MEME_HOOK_ADDRESS");
        p.cold = vm.envAddress("ADMIN_COLD_ADDRESS");
        p.treasury = vm.envAddress("COLD_TREASURY_ADDRESS");
        p.haha = vm.envOr("HAHA_TOKEN_ADDRESS", address(0));

        _requireCode(p.usdg, "usdg-no-code");
        _requireCode(p.escrow, "escrow-no-code");
        _requireCode(p.factory, "factory-no-code");
        _requireCode(p.router, "router-no-code");
        _requireCode(p.poolManager, "poolmanager-no-code");
        _requireCode(p.hook, "hook-no-code");

        if (p.cold == address(0)) revert PreflightFailed("cold-admin-zero");
        if (p.treasury == address(0)) revert PreflightFailed("treasury-zero");

        // USDG must be 6 decimals — never hardcode 18.
        if (IDecimals(p.usdg).decimals() != 6) {
            revert PreflightFailed("USDG.decimals != 6");
        }

        // View surface only. These are safe under staticcall.
        _mustRespond(p.escrow, abi.encodeWithSignature("pendingFees(address)", address(this)), "escrow.pendingFees");
        _mustRespond(
            p.escrow,
            abi.encodeWithSignature("pendingCreatorTax(address)", address(this)),
            "escrow.pendingCreatorTax"
        );
        _mustRespond(
            p.escrow,
            abi.encodeWithSignature("quoteFeeBalance(address)", address(this)),
            "escrow.quoteFeeBalance"
        );
        _mustRespond(
            p.escrow,
            abi.encodeWithSignature("creatorTaxBalance(address)", address(this)),
            "escrow.creatorTaxBalance"
        );
        _mustRespond(p.escrow, abi.encodeWithSignature("balanceOf(address)", address(this)), "escrow.balanceOf");

        // State-changing claim surface cannot be staticcalled. Verify the
        // selectors exist in the deployed dispatcher instead.
        if (!_hasSelector(p.escrow, bytes4(keccak256("claimToken(address)")))) {
            revert PreflightFailed("escrow.claimToken-selector-missing");
        }
        if (!_hasSelector(p.escrow, bytes4(keccak256("claim()")))) {
            revert PreflightFailed("escrow.claim-selector-missing");
        }

        console.log("PREFLIGHT OK - chain 4663, USDG 6dp, escrow surface found");
    }

    function _deploy(Preflight memory p) internal {
        uint256 pk = vm.envUint("OPERATOR_PRIVATE_KEY");
        address deployer = vm.addr(pk);
        uint256 extraBitStake = vm.envOr("EXTRA_BIT_STAKE_WEI", uint256(10 ether));

        vm.startBroadcast(pk);

        TipJar tipJar = new TipJar(p.usdg, p.cold, deployer, p.cold, TIPJAR_ROOT_DELAY);

        // Construction cycle: FeeSplitter needs a MicDrop, MicDrop needs the
        // splitter. Deploy a temporary MicDrop, then rotate the splitter to the
        // real one after TIMELOCK (cold-admin action in the runbook).
        MicDrop placeholder = new MicDrop(p.usdg, deployer, p.router, p.cold, deployer, TIMELOCK);
        FeeSplitter splitter =
            new FeeSplitter(p.usdg, p.escrow, address(tipJar), address(placeholder), p.cold, deployer, TIMELOCK);
        MicDrop micDrop = new MicDrop(p.usdg, address(splitter), p.router, p.cold, deployer, TIMELOCK);

        VaultRegistry registry = new VaultRegistry(p.cold, deployer);

        uint256[4] memory prices =
            [uint256(2_500_000_000), uint256(1_000_000_000), uint256(500_000_000), uint256(500_000_000)];
        ProducerGateway gateway =
            new ProducerGateway(p.usdg, p.treasury, address(tipJar), address(micDrop), p.cold, prices);

        address staking = address(0);
        if (p.haha != address(0)) {
            staking = address(new CrowdStaking(p.haha, address(tipJar), p.cold, deployer, extraBitStake));
        }

        vm.stopBroadcast();

        console.log("TipJar:", address(tipJar));
        console.log("FeeSplitter:", address(splitter));
        console.log("MicDropPlaceholder:", address(placeholder));
        console.log("MicDrop:", address(micDrop));
        console.log("VaultRegistry:", address(registry));
        console.log("ProducerGateway:", address(gateway));
        if (staking != address(0)) console.log("CrowdStaking:", staking);
        else console.log("CrowdStaking: SKIPPED (HAHA_TOKEN_ADDRESS is zero; deploy after $HAHA launch)");

        console.log("PHASE 2 (cold admin):");
        console.log("1. FeeSplitter.proposeSetMicDrop(MicDrop) then confirm after 48h");
        console.log("2. MicDrop.proposeHahaToken(...) then confirm after 48h");
        console.log("3. FeeSplitter.proposeSetLaunchRefs(curve,hook,poolId) then confirm after 48h");
        console.log("4. Write every address into VPS env; keep WORKER_CHAIN_WRITES=off until roles verified");
    }

    /// @dev staticcall must not revert (returndata ignored — views may return 0 pre-launch).
    function _mustRespond(address target, bytes memory callData, string memory check) internal view {
        (bool ok,) = target.staticcall(callData);
        if (!ok) revert PreflightFailed(check);
    }

    function _requireCode(address target, string memory check) internal view {
        if (target == address(0) || target.code.length == 0) {
            revert PreflightFailed(check);
        }
    }

    /// @dev Heuristic dispatcher scan. A selector may also appear in push data,
    /// so this is paired with the fork-test runbook; it is not a proof of ABI.
    function _hasSelector(address target, bytes4 selector) internal view returns (bool) {
        bytes memory code = target.code;
        if (code.length < 4) return false;
        for (uint256 i = 0; i + 4 <= code.length; i++) {
            if (
                code[i] == selector[0] && code[i + 1] == selector[1] && code[i + 2] == selector[2]
                    && code[i + 3] == selector[3]
            ) {
                return true;
            }
        }
        return false;
    }
}
