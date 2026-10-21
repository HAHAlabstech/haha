// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Script, console} from "forge-std/Script.sol";
import {CrowdStaking} from "../src/CrowdStaking.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

/// @notice Separate post-CA deployment. The current temporary public-mint
/// MockHAHA is expressly rejected and must never become the staking asset.
contract DeployCrowdStakingMainnet is Script {
    error WrongChain(); error MissingToken(); error TemporaryMockToken(); error MissingTipJar(); error InvalidToken();
    uint256 constant MAINNET = 4663;
    bytes32 public constant PUBLIC_MINT_MOCK_RUNTIME = 0xbc808f3f3bc3784fdea230e037db0fb1a0b63bf239dbd752e203f8c29522def9;
    function isTemporaryMock(address token) external view returns(bool) { return token.codehash==PUBLIC_MINT_MOCK_RUNTIME; }
    function run() external {
        if(block.chainid != MAINNET) revert WrongChain();
        address token=vm.envAddress("HAHA_TOKEN_ADDRESS");
        address tipJar=vm.envAddress("TIPJAR_ADDRESS");
        address cold=vm.envAddress("ADMIN_COLD_ADDRESS");
        uint256 pk=vm.envUint("OPERATOR_PRIVATE_KEY");
        if(token.code.length==0) revert MissingToken();
        if(token.codehash==PUBLIC_MINT_MOCK_RUNTIME) revert TemporaryMockToken();
        if(IERC20Metadata(token).decimals()!=18) revert InvalidToken();
        if(tipJar.code.length==0) revert MissingTipJar();
        uint256 extra=vm.envOr("EXTRA_BIT_STAKE_WEI",uint256(10 ether));
        vm.startBroadcast(pk);
        CrowdStaking staking=new CrowdStaking(token,tipJar,cold,vm.addr(pk),extra);
        vm.stopBroadcast();
        console.log("CrowdStaking:",address(staking));
        console.log("Actual Pons token:",token);
        console.log("TipJar:",tipJar);
    }
}
