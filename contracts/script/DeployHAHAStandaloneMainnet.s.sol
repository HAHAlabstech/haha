// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Script,console} from "forge-std/Script.sol";
import {HAHA} from "../src/HAHA.sol";

/// @notice Deploy exactly the separately approved fixed-supply HAHA token.
/// A real chain write requires BOTH `--broadcast` and
/// `HAHA_TOKEN_DEPLOY_CONFIRM=DEPLOY_FIXED_HAHA_MAINNET_4663`.
contract DeployHAHAStandaloneMainnet is Script {
    error WrongChain(); error ConfirmPredictedAddress(address predicted); error ExpectedAddressMismatch();
    bytes32 constant PHRASE=keccak256("DEPLOY_FIXED_HAHA_MAINNET_4663");
    function run() external {
        if(block.chainid!=4663)revert WrongChain();
        uint256 pk=vm.envUint("OPERATOR_PRIVATE_KEY");
        address recipient=vm.addr(pk);
        uint64 nonce=vm.getNonce(recipient);
        address predicted=vm.computeCreateAddress(recipient,nonce);
        if(predicted.code.length!=0)revert ConfirmPredictedAddress(predicted);
        _checkExpected(predicted,vm.envAddress("EXPECTED_HAHA_TOKEN_ADDRESS"));
        string memory confirm=vm.envOr("HAHA_TOKEN_DEPLOY_CONFIRM",string(""));
        if(keccak256(bytes(confirm))!=PHRASE){
            console.log("READ-ONLY PRECHECK OK; no token deployment simulated or broadcast.");
            console.log("Operator recipient:",recipient);
            console.log("Next CREATE address:",predicted);
            console.log("Set HAHA_TOKEN_DEPLOY_CONFIRM=DEPLOY_FIXED_HAHA_MAINNET_4663 to simulate.");
            return;
        }
        vm.startBroadcast(pk);
        HAHA token=new HAHA(recipient);
        vm.stopBroadcast();
        console.log("HAHA fixed-supply token:",address(token));
        console.log("Initial recipient:",recipient);
        console.log("Fixed initial supply:",token.totalSupply());
    }
    function _checkExpected(address predicted,address expected) internal pure {
        if(expected==address(0)||predicted!=expected)revert ExpectedAddressMismatch();
    }
}
