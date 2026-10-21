// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {HahaSetup} from "./helpers/HahaSetup.sol";
import {DeployCrowdStakingMainnet} from "../script/DeployCrowdStakingMainnet.s.sol";

contract DeployCrowdStakingHarness is DeployCrowdStakingMainnet {}
contract DeployCrowdStakingMainnetTest is HahaSetup {
    function test_RejectsCurrentPublicMintMockByRuntimeHash() public {
        DeployCrowdStakingHarness h=new DeployCrowdStakingHarness();
        assertTrue(h.isTemporaryMock(address(haha)));
        assertEq(address(haha).codehash,h.PUBLIC_MINT_MOCK_RUNTIME());
    }
}
