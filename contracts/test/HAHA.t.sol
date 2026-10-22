// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Test} from "forge-std/Test.sol";
import {HAHA} from "../src/HAHA.sol";

contract HAHATokenTest is Test {
    address internal recipient=address(0xA11CE);
    function test_DeployMintsOneBillionFixedSupplyToSelectedWallet() public {
        HAHA token=new HAHA(recipient);
        assertEq(token.name(),"HAHA");assertEq(token.symbol(),"HAHA");assertEq(token.decimals(),18);
        assertEq(token.totalSupply(),1_000_000_000 ether);assertEq(token.balanceOf(recipient),1_000_000_000 ether);
        assertEq(token.balanceOf(address(this)),0);
    }
    function test_NoPublicMintEntrypoints() public {
        HAHA token=new HAHA(recipient);
        (bool mintOk,)=address(token).call(abi.encodeWithSignature("mint(address,uint256)",address(this),1));
        (bool testMintOk,)=address(token).call(abi.encodeWithSignature("mintTest()"));
        assertFalse(mintOk);assertFalse(testMintOk);assertEq(token.totalSupply(),1_000_000_000 ether);
    }
    function test_HolderCanBurnOnlyOwnBalanceAndNoMintReturns() public {
        HAHA token=new HAHA(recipient);
        vm.prank(recipient);token.burn(1 ether);
        assertEq(token.totalSupply(),999_999_999 ether);
        assertEq(token.balanceOf(recipient),999_999_999 ether);
    }
    function test_ZeroSupplyRecipientRejected() public {
        vm.expectRevert(HAHA.ZeroRecipient.selector);new HAHA(address(0));
    }
}
