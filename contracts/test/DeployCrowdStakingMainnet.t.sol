// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {HahaSetup} from "./helpers/HahaSetup.sol";
import {DeployCrowdStakingMainnet} from "../script/DeployCrowdStakingMainnet.s.sol";

contract DeployCrowdStakingHarness is DeployCrowdStakingMainnet {
    function checkExpected(address predicted,address expected) external pure { _checkExpected(predicted,expected); }
}
contract DeployCrowdStakingMainnetTest is HahaSetup {
    function test_RejectsCurrentPublicMintMockByRuntimeHash() public {
        DeployCrowdStakingHarness h=new DeployCrowdStakingHarness();
        assertTrue(h.isTemporaryMock(address(haha)));
        assertEq(address(haha).codehash,h.PUBLIC_MINT_MOCK_RUNTIME());
    }
    function test_StakingDeploymentAddressIsPinned() public {
        DeployCrowdStakingHarness h=new DeployCrowdStakingHarness();address predicted=address(0x1234);
        h.checkExpected(predicted,predicted);
        vm.expectRevert(DeployCrowdStakingMainnet.ExpectedAddressMismatch.selector);
        h.checkExpected(predicted,address(0x5678));
    }
}
