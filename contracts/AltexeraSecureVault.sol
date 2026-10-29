// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface IPriceFeed {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

interface IAaveLendingPool {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

contract AltexeraSecureVault is ReentrancyGuard {
    using SafeERC20 for IERC20;

    IERC20 public immutable USDT;
    address public immutable AAVE_POOL;
    address public immutable CHAINLINK_BNB_USD;
    address public immutable treasury;
    mapping(address => bool) public isWhitelistedBot;

    uint128 public constant MAX_LEVELS = 30;
    uint256 private constant DAY = 1 days;
    uint256 private constant WEEK = 7 days;

    struct Plan {
        uint128 minAmount;
        uint128 maxAmount;
        uint32 duration;
        uint16 targetApyBps;
        bool isBnb;
        bool principalAtEnd;
        bool profitAtEnd;
    }

    struct Stake {
        uint128 amount;
        uint128 paidPrincipal;
        uint128 sweptRewards;
        uint128 totalProfit;
        uint128 startTime;
        uint8 planId;
        bool active;
    }

    struct ReferralNode { address parent; bool registered; }
    struct RankState { uint128 volume; uint128 volumeBlock; uint8 confirmedRank; uint8 nextRank; }

    mapping(uint256 => Plan) public plans;
    mapping(address => Stake[]) public userStakes;
    mapping(address => ReferralNode) internal _networkNodes;
    mapping(address => RankState) internal _rankState;
    mapping(address => uint256) public pendingCommunityBonuses;

    uint256 public totalPrincipalLiability;
    uint256 public totalStakingLiability;
    uint256 public totalCommunityLiability;
    uint256 public accumulatedTreasuryFees;

    error InvalidAmount();
    error NotRegistered();
    error AlreadyRegistered();
    error InvalidPlan();
    error InvalidStake();
    error InactiveStake();
    error NotMature();
    error PayoutsClosed();
    error LongLocked();
    error BelowMinimum();
    error NothingToClaim();
    error Unauthorized();
    error AccountingInvariant();

    constructor(address _treasury, address[] memory _bots, address _usdt, address _aavePool, address _priceFeed) {
        treasury = _treasury;
        USDT = IERC20(_usdt);
        AAVE_POOL = _aavePool;
        CHAINLINK_BNB_USD = _priceFeed;
        for (uint i = 0; i < _bots.length; i++) {
            isWhitelistedBot[_bots[i]] = true;
        }
        _initializePlans();
    }

    function joinNetwork(address parent) external {
        if (_networkNodes[msg.sender].registered) revert AlreadyRegistered();
        if (parent == msg.sender || (parent != address(0) && !_networkNodes[parent].registered)) revert InvalidAmount();
        _networkNodes[msg.sender] = ReferralNode(parent, true);
    }

    function deposit(uint256 planId, uint256 amount) external nonReentrant {
        Plan memory plan = plans[planId];
        if (plan.duration == 0 || plan.isBnb) revert InvalidPlan();
        if (amount < plan.minAmount || amount > plan.maxAmount) revert InvalidAmount();
        if (!_networkNodes[msg.sender].registered) revert NotRegistered();

        uint128 start = uint128(block.timestamp);
        uint128 lifetimeProfit = uint128(_profit(amount, plan.targetApyBps, _businessSeconds(start, uint256(start) + plan.duration)));

        IERC20(USDT).safeTransferFrom(msg.sender, address(this), amount);
        uint256 buffer = (amount * 2000) / 10000;
        uint256 toSupply = amount - buffer;
        IERC20(USDT).forceApprove(AAVE_POOL, toSupply);
        IAaveLendingPool(AAVE_POOL).supply(address(USDT), toSupply, address(this), 0);

        totalPrincipalLiability += amount;
        totalStakingLiability += amount + lifetimeProfit;
        _distributeNetwork(msg.sender, amount);

        uint256 index = userStakes[msg.sender].length;
        userStakes[msg.sender].push(Stake({
            amount: uint128(amount),
            paidPrincipal: 0,
            sweptRewards: 0,
            totalProfit: lifetimeProfit,
            startTime: start,
            planId: uint8(planId),
            active: true
        }));
    }

    function depositBNB(uint256 planId) external payable nonReentrant {
        Plan memory plan = plans[planId];
        if (plan.duration == 0 || !plan.isBnb) revert InvalidPlan();
        if (msg.value < plan.minAmount || msg.value > plan.maxAmount) revert InvalidAmount();
        if (!_networkNodes[msg.sender].registered) revert NotRegistered();

        uint128 start = uint128(block.timestamp);
        uint128 lifetimeProfit = uint128(_profit(msg.value, plan.targetApyBps, _businessSeconds(start, uint256(start) + plan.duration)));

        totalPrincipalLiability += msg.value;
        totalStakingLiability += msg.value + lifetimeProfit;
        _distributeNetwork(msg.sender, msg.value);

        uint256 index = userStakes[msg.sender].length;
        userStakes[msg.sender].push(Stake({
            amount: uint128(msg.value),
            paidPrincipal: 0,
            sweptRewards: 0,
            totalProfit: lifetimeProfit,
            startTime: start,
            planId: uint8(planId),
            active: true
        }));
    }

    function claimStakingRewards(uint256 index) external nonReentrant {
        _requireWeekday();
        Stake storage s = _stake(msg.sender, index);
        if (!s.active) revert InactiveStake();
        Plan memory plan = plans[s.planId];
        if (plan.profitAtEnd) revert LongLocked();

        (uint256 principal, uint256 profit) = _pending(s);
        if (plan.principalAtEnd) principal = 0;
        uint256 amount = principal + profit;
        if (amount < 5e18) revert BelowMinimum();

        _recordPayment(s, principal, profit);
        _sendExact(msg.sender, amount, plan.isBnb);
    }

    function closeStake(uint256 index) external nonReentrant {
        _requireWeekday();
        Stake storage s = _stake(msg.sender, index);
        if (!s.active) revert InactiveStake();
        if (block.timestamp < uint256(s.startTime) + plans[s.planId].duration) revert NotMature();

        (uint256 principal, uint256 profit) = _pending(s);
        _recordPayment(s, principal, profit);
        s.active = false;
        uint256 amount = principal + profit;
        if (amount != 0) _sendExact(msg.sender, amount, plans[s.planId].isBnb);
    }

    function claimNetworkBonuses() external nonReentrant {
        _requireWeekday();
        uint256 amount = pendingCommunityBonuses[msg.sender];
        if (amount == 0) revert NothingToClaim();
        pendingCommunityBonuses[msg.sender] = 0;
        totalCommunityLiability -= amount;
        _sendExact(msg.sender, amount, false);
    }

        function collectTreasuryFees() external nonReentrant {
        uint256 fee = accumulatedTreasuryFees;
        if (fee == 0) revert NothingToClaim();
        accumulatedTreasuryFees = 0;
        IERC20(USDT).safeTransfer(treasury, fee);
    }

    function depositExternalProfit(uint256 amount) external nonReentrant {
        if (!isWhitelistedBot[msg.sender]) revert Unauthorized();
        if (amount == 0) revert InvalidAmount();
        IERC20(USDT).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(USDT).forceApprove(AAVE_POOL, amount);
        IAaveLendingPool(AAVE_POOL).supply(address(USDT), amount, address(this), 0);
    }

    function _sendExact(address to, uint256 amount, bool isBnb) internal {
        if (isBnb) {
            (bool ok, ) = payable(to).call{value: amount}("");
            require(ok, "BNB transfer failed");
        } else {
            uint256 currentBalance = USDT.balanceOf(address(this));
            if (currentBalance < amount) {
                IAaveLendingPool(AAVE_POOL).withdraw(address(USDT), amount - currentBalance, address(this));
            }
            USDT.safeTransfer(to, amount);
        }
    }

    function _distributeNetwork(address user, uint256 amount) internal {
        address current = _networkNodes[user].parent;
        uint256 added;
        for (uint8 level = 1; level <= MAX_LEVELS && current != address(0); ++level) {
            uint8 eligibleRank = _updateRank(current, amount);
            uint256 reward = Math.mulDiv(amount, _getLevelRate(eligibleRank, level), 10_000);
            if (reward != 0) {
                pendingCommunityBonuses[current] += reward;
                added += reward;
            }
            current = _networkNodes[current].parent;
        }
        totalCommunityLiability += added;
    }

    function _updateRank(address user, uint256 amount) internal returns (uint8 eligibleRank) {
        RankState memory state = _rankState[user];
        eligibleRank = block.number > state.volumeBlock ? state.nextRank : state.confirmedRank;
        uint128 volume = uint128(uint256(state.volume) + amount);
        uint8 nextRank = _rankForVolume(volume);
        _rankState[user] = RankState({
            volume: volume,
            volumeBlock: uint128(block.number),
            confirmedRank: eligibleRank,
            nextRank: nextRank
        });
    }

    function _rankForVolume(uint256 volume) internal pure returns (uint8) {
        if (volume >= 100_000_000e18) return 11;
        if (volume >= 50_000_000e18) return 10;
        if (volume >= 25_000_000e18) return 9;
        if (volume >= 10_000_000e18) return 8;
        if (volume >= 5_000_000e18) return 7;
        if (volume >= 3_500_000e18) return 6;
        if (volume >= 1_000_000e18) return 5;
        if (volume >= 500_000e18) return 4;
        if (volume >= 250_000e18) return 3;
        if (volume >= 85_000e18) return 2;
        if (volume >= 25_000e18) return 1;
        return 0;
    }

    function _stake(address user, uint256 index) internal view returns (Stake storage s) {
        if (index >= userStakes[user].length) revert InvalidStake();
        return userStakes[user][index];
    }

    function _recordPayment(Stake storage s, uint256 principal, uint256 profit) internal {
        uint256 paidPrincipal = uint256(s.paidPrincipal) + principal;
        uint256 paidProfit = uint256(s.sweptRewards) + profit;
        uint256 amount = principal + profit;
        if (paidPrincipal > s.amount || paidProfit > s.totalProfit || principal > totalPrincipalLiability || amount > totalStakingLiability) revert AccountingInvariant();
        s.paidPrincipal = uint128(paidPrincipal);
        s.sweptRewards = uint128(paidProfit);
        totalPrincipalLiability -= principal;
        totalStakingLiability -= amount;
    }

    function _pending(Stake storage s) internal view returns (uint256 principal, uint256 profit) {
        if (!s.active) return (0, 0);
        Plan memory plan = plans[s.planId];
        uint256 start = s.startTime;
        uint256 end = start + plan.duration;
        bool mature = block.timestamp >= end;
        uint256 until = mature ? end : block.timestamp;
        uint256 principalEntitled = plan.principalAtEnd ? (mature ? s.amount : 0) : Math.mulDiv(s.amount, until - start, plan.duration);
        uint256 profitEntitled = mature ? s.totalProfit : (plan.profitAtEnd ? 0 : _profit(s.amount, plan.targetApyBps, _businessSeconds(start, until)));
        if (principalEntitled > s.amount || profitEntitled > s.totalProfit || s.paidPrincipal > principalEntitled || s.sweptRewards > profitEntitled) revert AccountingInvariant();
        principal = principalEntitled - s.paidPrincipal;
        profit = profitEntitled - s.sweptRewards;
    }

    function _getLevelRate(uint8 rank, uint8 level) internal pure returns (uint256) {
        if (rank > 11 || level == 0 || level > 30) return 0;
        if (rank == 0) { uint16[30] memory r = [uint16(500), uint16(300), uint16(100), uint16(100), uint16(100), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 1) { uint16[30] memory r = [uint16(600), uint16(300), uint16(200), uint16(100), uint16(100), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 2) { uint16[30] memory r = [uint16(700), uint16(400), uint16(200), uint16(200), uint16(100), uint16(100), uint16(50), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 3) { uint16[30] memory r = [uint16(800), uint16(400), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 4) { uint16[30] memory r = [uint16(900), uint16(400), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 5) { uint16[30] memory r = [uint16(1000), uint16(400), uint16(300), uint16(300), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 6) { uint16[30] memory r = [uint16(1100), uint16(400), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(30), uint16(30), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 7) { uint16[30] memory r = [uint16(1200), uint16(500), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 8) { uint16[30] memory r = [uint16(1300), uint16(600), uint16(400), uint16(300), uint16(200), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(50), uint16(50), uint16(30), uint16(30), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 9) { uint16[30] memory r = [uint16(1400), uint16(700), uint16(400), uint16(400), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(50), uint16(50), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 10) { uint16[30] memory r = [uint16(1400), uint16(700), uint16(400), uint16(400), uint16(300), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0)]; return r[level-1]; }
        if (rank == 11) { uint16[30] memory r = [uint16(1500), uint16(700), uint16(400), uint16(400), uint16(300), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(40), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20)]; return r[level-1]; }
        return 0;
    }

    function _profit(uint256 amount, uint256 rate, uint256 businessSeconds_) internal pure returns (uint256) {
        return Math.mulDiv(amount, rate * businessSeconds_, 10000 * DAY);
    }

    function _weekdayPrefix(uint256 timestamp) internal pure returns (uint256) {
        uint256 w = timestamp / WEEK;
        uint256 remainder = timestamp % WEEK + 3 * DAY;
        uint256 extraWeeks = remainder / WEEK;
        remainder %= WEEK;
        if (remainder > 5 * DAY) remainder = 5 * DAY;
        return (w + extraWeeks) * (5 * DAY) + remainder;
    }

    function _businessSeconds(uint256 from, uint256 to) internal pure returns (uint256) {
        if (to < from) revert InvalidAmount();
        return _weekdayPrefix(to) - _weekdayPrefix(from);
    }

    function isPayoutDay() public view returns (bool) {
        return (block.timestamp / DAY + 3) % 7 < 5;
    }

    function _requireWeekday() internal view {
        if (!isPayoutDay()) revert PayoutsClosed();
    }

    function _initializePlans() internal {
        plans[1] = Plan(100e18, 2999e18, 40 days, 75, false, true, false);
        plans[2] = Plan(3000e18, 19999e18, 55 days, 95, false, true, false);
        plans[3] = Plan(20000e18, 49999e18, 70 days, 125, false, true, false);
        plans[4] = Plan(50000e18, 399999e18, 85 days, 145, false, true, false);
        plans[5] = Plan(400000e18, 999999e18, 100 days, 165, false, true, false);
        plans[6] = Plan(1 ether, 29 ether, 90 days, 200, true, false, false);
        plans[7] = Plan(30 ether, 249 ether, 110 days, 240, true, false, false);
        plans[8] = Plan(250 ether, 1500 ether, 130 days, 280, true, false, false);
        plans[9] = Plan(5000e18, 1000000e18, 360 days, 310, false, true, true);
        plans[10] = Plan(5 ether, 1500 ether, 360 days, 310, true, true, true);
    }
}
