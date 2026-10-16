// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title ProducerGateway — B2B checkout (40/30/10/20, micro-USDG, on-chain proof)
/// @notice Buyers pay USDG (approve-then-purchase). Split, enforced on-chain:
///         40% -> coldTreasury (ops & compute — NEVER the hot VPS key),
///         30% -> TipJar (general epoch pool),
///         10% -> TipJar (royalty for this orderId's contributors, separate
///                transfer so indexers can split it; backend allocates pro-rata),
///         20% -> MicDrop.
/// @dev Prices are micro-USDG in `planPriceMicro[planType]`; the backend
///      rejects `amount < price` and the contract does too (Underpriced).
///      Plans: 0 snapshot ($2,500) / 1 subscription ($1,000) /
///             2 eval ($500) / 3 theme_night (min $500).
contract ProducerGateway is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    uint8 public constant PLAN_SNAPSHOT = 0;
    uint8 public constant PLAN_SUBSCRIPTION = 1;
    uint8 public constant PLAN_EVAL = 2;
    uint8 public constant PLAN_THEME_NIGHT = 3;
    uint8 public constant PLAN_COUNT = 4;

    IERC20 public immutable usdg;

    address public coldTreasury;
    address public tipJar;
    address public micDrop;
    mapping(uint8 => uint256) public planPriceMicro;

    event ProducerPurchase(
        bytes32 indexed orderId,
        bytes32 indexed batchId,
        address indexed buyer,
        uint8 planType,
        uint256 operatorShare,
        uint256 tipJarGeneralShare,
        uint256 royaltyShare,
        uint256 micDropShare
    );
    event PlanPriceUpdated(uint8 indexed planType, uint256 priceMicro);

    error UnknownPlan();
    error Underpriced();
    error ZeroAddress();

    constructor(
        address usdg_,
        address coldTreasury_,
        address tipJar_,
        address micDrop_,
        address admin_,
        uint256[4] memory pricesMicro
    ) {
        if (usdg_ == address(0) || coldTreasury_ == address(0) || tipJar_ == address(0) || micDrop_ == address(0)) {
            revert ZeroAddress();
        }
        usdg = IERC20(usdg_);
        coldTreasury = coldTreasury_;
        tipJar = tipJar_;
        micDrop = micDrop_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        for (uint8 i = 0; i < PLAN_COUNT; i++) {
            planPriceMicro[i] = pricesMicro[i];
            emit PlanPriceUpdated(i, pricesMicro[i]);
        }
    }

    function setPlanPrice(uint8 planType, uint256 priceMicro) external onlyRole(DEFAULT_ADMIN_ROLE) {
        if (planType >= PLAN_COUNT) revert UnknownPlan();
        planPriceMicro[planType] = priceMicro;
        emit PlanPriceUpdated(planType, priceMicro);
    }

    function setRecipients(address coldTreasury_, address tipJar_, address micDrop_)
        external
        onlyRole(DEFAULT_ADMIN_ROLE)
    {
        if (coldTreasury_ == address(0) || tipJar_ == address(0) || micDrop_ == address(0)) revert ZeroAddress();
        coldTreasury = coldTreasury_;
        tipJar = tipJar_;
        micDrop = micDrop_;
    }

    /// @notice Pay `amountMicroUsdg` (>= plan price) for `planType`.
    /// @param batchId Pass bytes32(0) to derive keccak(orderId, buyer, timestamp).
    function purchasePlan(uint8 planType, uint256 amountMicroUsdg, bytes32 orderId, bytes32 batchId)
        external
        nonReentrant
        returns (bytes32 derivedBatchId)
    {
        if (planType >= PLAN_COUNT) revert UnknownPlan();
        if (amountMicroUsdg < planPriceMicro[planType]) revert Underpriced();
        derivedBatchId = batchId == bytes32(0)
            ? keccak256(abi.encode(orderId, msg.sender, block.timestamp))
            : batchId;
        usdg.safeTransferFrom(msg.sender, address(this), amountMicroUsdg);
        uint256 operatorShare = (amountMicroUsdg * 40) / 100;
        uint256 tipJarGeneralShare = (amountMicroUsdg * 30) / 100;
        uint256 royaltyShare = (amountMicroUsdg * 10) / 100;
        uint256 micDropShare = amountMicroUsdg - operatorShare - tipJarGeneralShare - royaltyShare;
        usdg.safeTransfer(coldTreasury, operatorShare);
        usdg.safeTransfer(tipJar, tipJarGeneralShare);
        usdg.safeTransfer(tipJar, royaltyShare);
        usdg.safeTransfer(micDrop, micDropShare);
        emit ProducerPurchase(
            orderId, derivedBatchId, msg.sender, planType, operatorShare, tipJarGeneralShare, royaltyShare, micDropShare
        );
    }
}
