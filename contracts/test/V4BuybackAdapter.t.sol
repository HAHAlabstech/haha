// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {Test} from "forge-std/Test.sol";
import {MockUSDG} from "../src/mocks/MockUSDG.sol";
import {MockHAHA} from "../src/mocks/MockHAHA.sol";
import {V4BuybackAdapter} from "../src/V4BuybackAdapter.sol";
import {MockPonsHook} from "../src/mocks/MockPoolManager.sol";

contract Permit2Fixture {
    mapping(address => mapping(address => uint160)) public allowance;
    function approve(address, address spender, uint160 amount, uint48) external { allowance[msg.sender][spender] = amount; }
    function transferFrom(address from, address to, uint160 amount, address token) external {
        require(allowance[from][msg.sender] >= amount, "scoped allowance");
        allowance[from][msg.sender] -= amount;
        MockUSDG(token).transferFrom(from, to, amount);
    }
}
contract Router211Fixture {
    struct PathKey { address intermediateCurrency; uint24 fee; int24 tickSpacing; address hooks; bytes hookData; }
    struct ExactInput { address currencyIn; PathKey[] path; uint256[] minHopPriceX36; uint128 amountIn; uint128 amountOutMinimum; }
    Permit2Fixture public permit;
    MockHAHA public haha;
    constructor(Permit2Fixture p, MockHAHA h) { permit=p; haha=h; }
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable {
        require(block.timestamp<=deadline && keccak256(commands)==keccak256(hex"10"), "command");
        (bytes memory actions, bytes[] memory params)=abi.decode(inputs[0],(bytes,bytes[]));
        require(keccak256(actions)==keccak256(hex"070c0f"), "actions");
        ExactInput memory swap=abi.decode(params[0],(ExactInput));
        require(swap.path.length==swap.minHopPriceX36.length, "hop floors");
        require(swap.path[swap.path.length-1].intermediateCurrency==address(haha), "output");
        (address input,uint256 maxInput)=abi.decode(params[1],(address,uint256));
        (address output,uint256 minOutput)=abi.decode(params[2],(address,uint256));
        require(input==swap.currencyIn && maxInput==swap.amountIn && output==address(haha) && minOutput==swap.amountOutMinimum, "settlement");
        permit.transferFrom(msg.sender,address(this),uint160(swap.amountIn),input);
        uint256 result=uint256(swap.amountIn)*1e12;
        require(result>=minOutput, "min output");
        haha.mint(msg.sender,result);
    }
}
contract V4BuybackAdapterTest is Test {
    MockUSDG usdg; MockHAHA haha; MockPonsHook ponsHook; Permit2Fixture permit; Router211Fixture router; V4BuybackAdapter adapter;
    function setUp() public {
        usdg=new MockUSDG(); haha=new MockHAHA(); ponsHook=new MockPonsHook(); permit=new Permit2Fixture(); router=new Router211Fixture(permit,haha);
        adapter=new V4BuybackAdapter(address(usdg),address(router),address(permit),address(ponsHook));
        usdg.mint(address(this),100_000_000); usdg.approve(address(adapter),type(uint256).max);
    }
    function route(bool nativeHop) internal view returns(bytes memory) {
        V4BuybackAdapter.PoolKey[] memory keys=new V4BuybackAdapter.PoolKey[](nativeHop?2:1);
        if(nativeHop) {
            keys[0]=V4BuybackAdapter.PoolKey(address(0),address(usdg),3000,60,address(0));
            keys[1]=V4BuybackAdapter.PoolKey(address(0),address(haha),10000,200,address(ponsHook));
        } else {
            (address a,address b)=address(usdg)<address(haha)?(address(usdg),address(haha)):(address(haha),address(usdg));
            keys[0]=V4BuybackAdapter.PoolKey(a,b,3000,60,address(ponsHook));
        }
        return abi.encode(keys);
    }
    function test_NativeIntermediateIsEncodedAndSettledWithoutETHCustody() public {
        uint256 before=haha.balanceOf(address(this));
        uint256 out=adapter.swapExactInput(address(haha),1_000_000,1e18,1,block.timestamp+60,route(true));
        assertEq(out,1e18);assertEq(haha.balanceOf(address(this))-before,1e18);
        assertEq(usdg.balanceOf(address(adapter)),0);assertEq(permit.allowance(address(adapter),address(router)),0);
        assertEq(usdg.allowance(address(adapter),address(permit)),0);
    }
    function test_DirectRouteAlsoUsesRouter211() public { assertEq(adapter.swapExactInput(address(haha),1_000_000,1e18,1,block.timestamp+60,route(false)),1e18); }
    function test_RejectedMinOutRollsBackPrincipal() public {
        uint256 before=usdg.balanceOf(address(this));
        vm.expectRevert(); adapter.swapExactInput(address(haha),1_000_000,2e18,1,block.timestamp+60,route(true));
        assertEq(usdg.balanceOf(address(this)),before);
    }
    function test_ZeroMinOutAndExpiredDeadlineReject() public {
        vm.expectRevert();adapter.swapExactInput(address(haha),1,0,0,block.timestamp+60,route(true));
        vm.expectRevert();adapter.swapExactInput(address(haha),1,1,0,block.timestamp-1,route(true));
    }
    function test_DisconnectedRouteRejects() public {
        V4BuybackAdapter.PoolKey[] memory keys=new V4BuybackAdapter.PoolKey[](1);
        keys[0]=V4BuybackAdapter.PoolKey(address(0),address(haha),3000,60,address(ponsHook));
        vm.expectRevert();adapter.swapExactInput(address(haha),1,1,0,block.timestamp+60,abi.encode(keys));
    }
}
