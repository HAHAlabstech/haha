// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {AccessControl} from "@openzeppelin/contracts/access/AccessControl.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

/// @title CrowdStaking — juror $HAHA staking (3-day cooldown, escrowed slash)
/// @notice Slash never burns directly: slashed stake sits in escrow for 14
///         days and is recoverable on a successful retrial (`recoverSlash`);
///         after expiry anyone with SLASHER_ROLE routes it to the TipJar
///         (`resolveSlash`). Auto-slash policy (off-chain cron): only when
///         Plants accuracy < 60% over >= 20 samples with 1 prior warning.
/// @dev Extra-bit anti-spam stake: above-quota Comedians lock `extraBitStake`
///      per bitId; withdrawable except when the bit is `heckled_off`, in which
///      case the slasher seizes it to the TipJar (never burned).
contract CrowdStaking is AccessControl, ReentrancyGuard {
    using SafeERC20 for IERC20;

    bytes32 public constant SLASHER_ROLE = keccak256("SLASHER_ROLE");

    uint256 public constant UNSTAKE_COOLDOWN = 3 days;
    uint256 public constant SLASH_RECOVERY_WINDOW = 14 days;

    IERC20 public immutable haha;
    address public tipJar;
    uint256 public extraBitStake;

    mapping(address => uint256) public stakes;
    mapping(address => uint256) public unstakeAvailableAt;
    mapping(address => uint256) public slashEscrow;
    mapping(address => uint256) public slashReleaseAt;
    mapping(bytes32 => mapping(address => uint256)) public extraStakes;
    mapping(bytes32 => mapping(address => bool)) public extraSeized;

    event Staked(address indexed juror, uint256 amount);
    event UnstakeInitiated(address indexed juror, uint256 availableAt);
    event UnstakeCompleted(address indexed juror, uint256 amount);
    event Slashed(address indexed juror, uint256 amount, string reason);
    event SlashRecovered(address indexed juror, uint256 amount);
    event SlashResolved(address indexed juror, uint256 amount);
    event ExtraBitStaked(bytes32 indexed bitId, address indexed comedian, uint256 amount);
    event ExtraBitWithdrawn(bytes32 indexed bitId, address indexed comedian, uint256 amount);
    event ExtraBitSeized(bytes32 indexed bitId, address indexed comedian, uint256 amount);

    error CooldownNotElapsed();
    error NoUnstakeInitiated();
    error InsufficientStake();
    error NoEscrow();
    error RecoveryExpired();
    error RecoveryWindowOpen();
    error AlreadySeized();
    error NoExtraStake();
    error ZeroAmount();

    constructor(address haha_, address tipJar_, address admin_, address slasher_, uint256 extraBitStake_) {
        haha = IERC20(haha_);
        tipJar = tipJar_;
        extraBitStake = extraBitStake_;
        _grantRole(DEFAULT_ADMIN_ROLE, admin_);
        _grantRole(SLASHER_ROLE, slasher_);
    }

    function stake(uint256 amount) external nonReentrant {
        if (amount == 0) revert ZeroAmount();
        // Any pending unstake intent is voided by fresh stake.
        unstakeAvailableAt[msg.sender] = 0;
        stakes[msg.sender] += amount;
        haha.safeTransferFrom(msg.sender, address(this), amount);
        emit Staked(msg.sender, amount);
    }

    function initiateUnstake() external {
        if (stakes[msg.sender] == 0) revert InsufficientStake();
        unstakeAvailableAt[msg.sender] = block.timestamp + UNSTAKE_COOLDOWN;
        emit UnstakeInitiated(msg.sender, unstakeAvailableAt[msg.sender]);
    }

    function completeUnstake() external nonReentrant {
        uint256 availableAt = unstakeAvailableAt[msg.sender];
        if (availableAt == 0) revert NoUnstakeInitiated();
        if (block.timestamp < availableAt) revert CooldownNotElapsed();
        uint256 amount = stakes[msg.sender];
        stakes[msg.sender] = 0;
        unstakeAvailableAt[msg.sender] = 0;
        haha.safeTransfer(msg.sender, amount);
        emit UnstakeCompleted(msg.sender, amount);
    }

    /// @notice Slash into escrow (recoverable 14 days), never a direct burn.
    function slash(address juror, uint256 amount, string calldata reason)
        external
        onlyRole(SLASHER_ROLE)
    {
        if (stakes[juror] < amount) revert InsufficientStake();
        stakes[juror] -= amount;
        slashEscrow[juror] += amount;
        slashReleaseAt[juror] = block.timestamp + SLASH_RECOVERY_WINDOW;
        emit Slashed(juror, amount, reason);
    }

    /// @notice Retrial won within 14 days: escrow returns to the juror's stake.
    function recoverSlash(address juror) external onlyRole(SLASHER_ROLE) {
        uint256 escrowed = slashEscrow[juror];
        if (escrowed == 0) revert NoEscrow();
        if (block.timestamp > slashReleaseAt[juror]) revert RecoveryExpired();
        slashEscrow[juror] = 0;
        slashReleaseAt[juror] = 0;
        stakes[juror] += escrowed;
        emit SlashRecovered(juror, escrowed);
    }

    /// @notice After the 14-day window: route expired escrow to the TipJar.
    function resolveSlash(address juror) external onlyRole(SLASHER_ROLE) {
        uint256 escrowed = slashEscrow[juror];
        if (escrowed == 0) revert NoEscrow();
        if (block.timestamp <= slashReleaseAt[juror]) revert RecoveryWindowOpen();
        slashEscrow[juror] = 0;
        slashReleaseAt[juror] = 0;
        haha.safeTransfer(tipJar, escrowed);
        emit SlashResolved(juror, escrowed);
    }

    /// @notice Lock anti-spam stake for one above-quota bit.
    function stakeForExtraBit(bytes32 bitId) external nonReentrant {
        if (extraBitStake == 0) revert ZeroAmount();
        extraStakes[bitId][msg.sender] += extraBitStake;
        haha.safeTransferFrom(msg.sender, address(this), extraBitStake);
        emit ExtraBitStaked(bitId, msg.sender, extraBitStake);
    }

    function withdrawExtraBit(bytes32 bitId) external nonReentrant {
        if (extraSeized[bitId][msg.sender]) revert AlreadySeized();
        uint256 amount = extraStakes[bitId][msg.sender];
        if (amount == 0) revert NoExtraStake();
        extraStakes[bitId][msg.sender] = 0;
        haha.safeTransfer(msg.sender, amount);
        emit ExtraBitWithdrawn(bitId, msg.sender, amount);
    }

    /// @notice `heckled_off` verdict: seize the extra-bit stake to the TipJar.
    function seizeExtraBit(bytes32 bitId, address comedian) external onlyRole(SLASHER_ROLE) {
        if (extraSeized[bitId][comedian]) revert AlreadySeized();
        uint256 amount = extraStakes[bitId][comedian];
        if (amount == 0) revert NoExtraStake();
        extraSeized[bitId][comedian] = true;
        extraStakes[bitId][comedian] = 0;
        haha.safeTransfer(tipJar, amount);
        emit ExtraBitSeized(bitId, comedian, amount);
    }

    function setTipJar(address tipJar_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        tipJar = tipJar_;
    }

    function setExtraBitStake(uint256 extraBitStake_) external onlyRole(DEFAULT_ADMIN_ROLE) {
        extraBitStake = extraBitStake_;
    }

    function stakeOf(address juror) external view returns (uint256) {
        return stakes[juror];
    }
}
