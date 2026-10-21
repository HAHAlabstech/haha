// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;
import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {IBuybackAdapter} from "./interfaces/IBuybackAdapter.sol";

interface IRouter211 {
    function execute(bytes calldata commands, bytes[] calldata inputs, uint256 deadline) external payable;
}
interface IAllowanceTransfer {
    function approve(address token, address spender, uint160 amount, uint48 expiration) external;
}

/// @notice Structured USDG -> token or USDG -> native ETH -> token exact input.
/// Uses Universal Router 2.1.1, not the project's legacy mock helper ABI.
/// Intermediate native currency nets inside PoolManager; adapter never holds ETH.
contract V4BuybackAdapter is IBuybackAdapter, ReentrancyGuard {
    using SafeERC20 for IERC20;
    struct PoolKey { address currency0; address currency1; uint24 fee; int24 tickSpacing; address hooks; }
    struct PathKey { address intermediateCurrency; uint24 fee; int24 tickSpacing; address hooks; bytes hookData; }
    struct ExactInput { address currencyIn; PathKey[] path; uint256[] minHopPriceX36; uint128 amountIn; uint128 amountOutMinimum; }
    IERC20 public immutable usdg;
    address public immutable universalRouter;
    address public immutable permit2;
    address public immutable ponsHook;
    error InvalidRoute(); error InvalidAmount(); error Expired(); error BadBalanceDelta();
    constructor(address usdg_, address router_, address permit2_, address ponsHook_) {
        if(usdg_.code.length==0 || router_.code.length==0 || permit2_.code.length==0 || ponsHook_.code.length==0) revert InvalidRoute();
        usdg=IERC20(usdg_); universalRouter=router_; permit2=permit2_; ponsHook=ponsHook_;
    }
    function _path(address token, bytes memory route) internal view returns(PathKey[] memory path) {
        PoolKey[] memory keys=abi.decode(route,(PoolKey[]));
        if(keys.length==0 || keys.length>2 || token==address(0) || token==address(usdg)) revert InvalidRoute();
        path=new PathKey[](keys.length);
        address input=address(usdg);
        for(uint256 i=0;i<keys.length;i++) {
            PoolKey memory key=keys[i];
            if(key.currency0>=key.currency1 || key.tickSpacing<=0) revert InvalidRoute();
            address output;
            if(input==key.currency0) output=key.currency1;
            else if(input==key.currency1) output=key.currency0;
            else revert InvalidRoute();
            if(keys.length==2 && i==0 && output!=address(0)) revert InvalidRoute();
            path[i]=PathKey(output,key.fee,key.tickSpacing,key.hooks,hex"");
            input=output;
        }
        if(input!=token) revert InvalidRoute();
        if(path[path.length-1].hooks!=ponsHook) revert InvalidRoute();
    }
    function validateRoute(address token, bytes calldata route) external view returns(bool) { _path(token,route); return true; }
    function swapExactInput(address token, uint256 amountIn, uint256 minOut, uint256 minHopPriceX36, uint256 deadline, bytes calldata route) external nonReentrant returns(uint256 output) {
        if(block.timestamp>deadline || deadline>type(uint48).max) revert Expired();
        if(amountIn==0 || minOut==0 || amountIn>type(uint128).max || minOut>type(uint128).max) revert InvalidAmount();
        uint256 inputBefore=usdg.balanceOf(address(this));
        uint256 outputBefore=IERC20(token).balanceOf(address(this));
        usdg.safeTransferFrom(msg.sender,address(this),amountIn);
        if(usdg.balanceOf(address(this))-inputBefore!=amountIn) revert BadBalanceDelta();
        usdg.forceApprove(permit2,amountIn);
        IAllowanceTransfer(permit2).approve(address(usdg),universalRouter,uint160(amountIn),uint48(deadline));
        _executeRouter(token,amountIn,minOut,minHopPriceX36,deadline,route);
        IAllowanceTransfer(permit2).approve(address(usdg),universalRouter,0,0);
        usdg.forceApprove(permit2,0);
        if(usdg.balanceOf(address(this))!=inputBefore) revert BadBalanceDelta();
        output=IERC20(token).balanceOf(address(this))-outputBefore;
        if(output<minOut) revert BadBalanceDelta();
        IERC20(token).safeTransfer(msg.sender,output);
    }
    function _executeRouter(address token,uint256 amountIn,uint256 minOut,uint256 minHopPriceX36,uint256 deadline,bytes calldata route) internal {
        PathKey[] memory path=_path(token,route);
        uint256[] memory floors=new uint256[](path.length);
        floors[path.length-1]=minHopPriceX36;
        bytes[] memory params=new bytes[](3);
        params[0]=abi.encode(ExactInput(address(usdg),path,floors,uint128(amountIn),uint128(minOut)));
        params[1]=abi.encode(address(usdg),amountIn); // SETTLE_ALL from this caller
        params[2]=abi.encode(token,minOut); // TAKE_ALL to this caller
        bytes[] memory inputs=new bytes[](1);
        inputs[0]=abi.encode(hex"070c0f",params);
        IRouter211(universalRouter).execute(hex"10",inputs,deadline);
    }
}
