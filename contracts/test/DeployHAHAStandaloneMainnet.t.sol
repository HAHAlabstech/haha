// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Test} from "forge-std/Test.sol";
import {DeployHAHAStandaloneMainnet} from "../script/DeployHAHAStandaloneMainnet.s.sol";

contract DeployHAHAHarness is DeployHAHAStandaloneMainnet {
    function checkExpected(address predicted,address expected) external pure { _checkExpected(predicted,expected); }
}
contract DeployHAHAStandaloneMainnetTest is Test {
    function test_ExpectedCreateAddressMustMatch() public {
        DeployHAHAHarness h=new DeployHAHAHarness();address a=address(0x1234);
        h.checkExpected(a,a);
    }
    function test_DeploymentRefusesUnpinnedAddress() public {
        DeployHAHAHarness h=new DeployHAHAHarness();
        vm.expectRevert(DeployHAHAStandaloneMainnet.ExpectedAddressMismatch.selector);
        h.checkExpected(address(0x1234),address(0x5678));
        vm.expectRevert(DeployHAHAStandaloneMainnet.ExpectedAddressMismatch.selector);
        h.checkExpected(address(0x1234),address(0));
    }
}
