// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Math} from "@openzeppelin/contracts/utils/math/Math.sol";

interface IPriceFeedTest {
    function decimals() external view returns (uint8);
    function latestRoundData() external view returns (uint80, int256, uint256, uint256, uint80);
}

interface IAaveLendingPoolTest {
    function supply(address asset, uint256 amount, address onBehalfOf, uint16 referralCode) external;
    function withdraw(address asset, uint256 amount, address to) external returns (uint256);
}

interface IPancakeRouterTest {
    function swapExactETHForTokens(uint amountOutMin, address[] calldata path, address to, uint deadline) external payable returns (uint[] memory amounts);
}

interface IWBNBTest is IERC20 {
    function deposit() external payable;
    function withdraw(uint wad) external;
}

library AltexeraReferralScheduleTest {
    error InvalidRank();
    error InvalidLevel();

    function thresholdUsd6(uint8 rankId) internal pure returns (uint256) {
        if (rankId > 11) revert InvalidRank();
        if (rankId == 0) return 0;
        if (rankId == 1) return 25000_000000;
        if (rankId == 2) return 85000_000000;
        if (rankId == 3) return 250000_000000;
        if (rankId == 4) return 500000_000000;
        if (rankId == 5) return 1000000_000000;
        if (rankId == 6) return 3500000_000000;
        if (rankId == 7) return 5000000_000000;
        if (rankId == 8) return 10000000_000000;
        if (rankId == 9) return 25000000_000000;
        if (rankId == 10) return 50000000_000000;
        if (rankId == 11) return 100000000_000000;
        revert InvalidRank();
    }

    function communityTierRate(uint8 rankId, uint8 level) internal pure returns (uint16) {
        if (rankId > 11) revert InvalidRank();
        if (level == 0 || level > 30) revert InvalidLevel();
        if (rankId == 0) {
            uint16[30] memory rates = [uint16(500), uint16(300), uint16(100), uint16(100), uint16(100), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 1) {
            uint16[30] memory rates = [uint16(600), uint16(300), uint16(200), uint16(100), uint16(100), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 2) {
            uint16[30] memory rates = [uint16(700), uint16(400), uint16(200), uint16(200), uint16(100), uint16(100), uint16(50), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 3) {
            uint16[30] memory rates = [uint16(800), uint16(400), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 4) {
            uint16[30] memory rates = [uint16(900), uint16(400), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(50), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 5) {
            uint16[30] memory rates = [uint16(1000), uint16(400), uint16(300), uint16(300), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 6) {
            uint16[30] memory rates = [uint16(1100), uint16(400), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(30), uint16(30), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 7) {
            uint16[30] memory rates = [uint16(1200), uint16(500), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 8) {
            uint16[30] memory rates = [uint16(1300), uint16(600), uint16(400), uint16(300), uint16(200), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(50), uint16(50), uint16(30), uint16(30), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 9) {
            uint16[30] memory rates = [uint16(1400), uint16(700), uint16(400), uint16(400), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(50), uint16(50), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 10) {
            uint16[30] memory rates = [uint16(1400), uint16(700), uint16(400), uint16(400), uint16(300), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(50), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(0), uint16(0), uint16(0)];
            return rates[level - 1];
        }
        if (rankId == 11) {
            uint16[30] memory rates = [uint16(1500), uint16(700), uint16(400), uint16(400), uint16(300), uint16(300), uint16(300), uint16(200), uint16(200), uint16(200), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(100), uint16(50), uint16(50), uint16(40), uint16(30), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20), uint16(20)];
            return rates[level - 1];
        }
        revert InvalidRank();
    }
}

contract AltexeraSecureVaultTest is ReentrancyGuard {
    using SafeERC20 for IERC20;
    using SafeERC20 for IWBNBTest;

    address public immutable USDT;
    address public immutable WBNB;
    address public immutable A_USDT;
    address public immutable AAVE_POOL;
    address public immutable PANCAKE_ROUTER;
    address public immutable CHAINLINK_BNB_USD;

    uint256 public constant MAX_FEE_BPS = 1000;
    uint256 public constant ORACLE_MAX_AGE = 1 hours;
    uint256 public constant SLIPPAGE_BPS = 150;
    uint256 public constant BUFFER_BPS = 2000;

    struct Plan {
        uint128 minAmount;
        uint128 maxAmount;
        uint32 duration;
        uint16 targetApyBps;
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
    struct RankState { uint128 volume; uint64 volumeBlock; uint8 confirmedRank; uint8 nextRank; }

    mapping(uint256 => Plan) public plans;
    mapping(address => Stake[]) public userStakes;
    mapping(address => ReferralNode) internal _networkNodes;
    mapping(address => RankState) internal _rankState;
    mapping(address => uint256) public pendingCommunityBonuses;
    mapping(address => bool) public isWhitelistedBot;

    uint256 public totalPrincipalLiability;
    uint256 public totalStakingLiability;
    uint256 public totalCommunityLiability;
    uint256 public accumulatedTreasuryFees;

    address public immutable treasury;
    uint8 public constant MAX_LEVELS = 30;
    uint256 private constant DAY = 1 days;
    uint256 private constant WEEK = 7 days;

    error InvalidAmount();
    error NotRegistered();
    error AlreadyRegistered();
    error InvalidPlan();
    error StaleOracle();
    error InvalidOracle();
    error SlippageExceeded();
    error InvalidStake();
    error InactiveStake();
    error NotMature();
    error PayoutsClosed();
    error LongLocked();
    error BelowMinimum();
    error NothingToClaim();
    error AccountingInvariant();
    error Unauthorized();

    event Deposited(address indexed user, uint256 planId, uint256 amount);
    event StakeOpened(address indexed user, uint256 indexed index, uint256 lifetimeProfit);
    event StakingClaimed(address indexed user, uint256 stakeIndex, uint256 amount);
    event StakeClosed(address indexed user, uint256 stakeIndex, uint256 totalPayout);
    event ReferralRegistered(address indexed user, address indexed referrer);
    event RankScheduled(address indexed user, uint8 rank, uint256 volume, uint256 eligibleFromBlock);
    event FeeCollected(uint256 amount);
    event YieldHarvested(uint256 amount, uint256 fee);
    event ExternalFundReceived(address indexed bot, uint256 amount);

    constructor(
        address _treasury, 
        address[] memory _bots,
        address _usdt,
        address _aavePool,
        address _aUsdt,
        address _priceFeed
    ) {
        treasury = _treasury;
        for (uint i = 0; i < _bots.length; i++) {
            isWhitelistedBot[_bots[i]] = true;
        }
        USDT = _usdt;
        AAVE_POOL = _aavePool;
        A_USDT = _aUsdt;
        CHAINLINK_BNB_USD = _priceFeed;
        PANCAKE_ROUTER = address(0);
        WBNB = address(0);
        _initializePlans();
    }

    function collectTreasuryFees() external nonReentrant {
        uint256 fee = accumulatedTreasuryFees;
        if (fee == 0) revert NothingToClaim();
        accumulatedTreasuryFees = 0;
        IERC20(USDT).safeTransfer(treasury, fee);
        emit FeeCollected(fee);
    }

    function joinNetwork(address parent) external nonReentrant {
        if (_networkNodes[msg.sender].registered) revert AlreadyRegistered();
        if (parent == msg.sender || (parent != address(0) && !_networkNodes[parent].registered))
            revert InvalidAmount();
        _networkNodes[msg.sender] = ReferralNode(parent, true);
        emit ReferralRegistered(msg.sender, parent);
    }

    function isNetworkMember(address user) external view returns (bool) {
        return _networkNodes[user].registered;
    }

    function networkParent(address user) external view returns (address) {
        return _networkNodes[user].parent;
    }

    function deposit(uint256 planId, uint256 amount) external nonReentrant {
        if (!_networkNodes[msg.sender].registered) revert NotRegistered();
        Plan memory plan = plans[planId];
        if (plan.duration == 0) revert InvalidPlan();
        if (amount < plan.minAmount || amount > plan.maxAmount) revert InvalidAmount();

        uint128 start = uint128(block.timestamp);
        uint128 lifetimeProfit = uint128(_profit(amount, plan.targetApyBps, _businessSeconds(start, uint256(start) + plan.duration)));

        IERC20(USDT).safeTransferFrom(msg.sender, address(this), amount);

        uint256 buffer = (amount * BUFFER_BPS) / 10000;
        uint256 toSupply = amount - buffer;

        IERC20(USDT).forceApprove(AAVE_POOL, toSupply);
        IAaveLendingPoolTest(AAVE_POOL).supply(USDT, toSupply, address(this), 0);

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

        emit Deposited(msg.sender, planId, amount);
        emit StakeOpened(msg.sender, index, lifetimeProfit);
    }

    function claimStakingRewards(uint256 index) external nonReentrant {
        _requireWeekday();
        Stake storage s = _stake(msg.sender, index);
        if (!s.active) revert InactiveStake();
        Plan memory plan = plans[s.planId];
        if (plan.profitAtEnd) revert LongLocked();

        (uint256 principal, uint256 profitAmount) = _pending(s);
        if (plan.principalAtEnd) principal = 0;
        uint256 amount = principal + profitAmount;
        if (amount < 5e6) revert BelowMinimum();

        _recordPayment(s, principal, profitAmount);
        _ensureLiquidity(amount);
        IERC20(USDT).safeTransfer(msg.sender, amount);
        emit StakingClaimed(msg.sender, index, amount);
    }

    function closeStake(uint256 index) external nonReentrant {
        _requireWeekday();
        Stake storage s = _stake(msg.sender, index);
        if (!s.active) revert InactiveStake();
        if (block.timestamp < uint256(s.startTime) + plans[s.planId].duration) revert NotMature();

        (uint256 principal, uint256 profitAmount) = _pending(s);
        _recordPayment(s, principal, profitAmount);
        s.active = false;
        uint256 amount = principal + profitAmount;
        if (amount != 0) {
            _ensureLiquidity(amount);
            IERC20(USDT).safeTransfer(msg.sender, amount);
        }
        emit StakeClosed(msg.sender, index, amount);
    }

    function claimNetworkBonuses() external nonReentrant {
        _requireWeekday();
        uint256 amount = pendingCommunityBonuses[msg.sender];
        if (amount == 0) revert NothingToClaim();
        if (amount > totalCommunityLiability) revert AccountingInvariant();
        pendingCommunityBonuses[msg.sender] = 0;
        totalCommunityLiability -= amount;

        _ensureLiquidity(amount);
        IERC20(USDT).safeTransfer(msg.sender, amount);
    }

    function depositExternalProfit(uint256 amount) external nonReentrant {
        if (!isWhitelistedBot[msg.sender]) revert Unauthorized();
        if (amount == 0) revert InvalidAmount();
        IERC20(USDT).safeTransferFrom(msg.sender, address(this), amount);
        IERC20(USDT).forceApprove(AAVE_POOL, amount);
        IAaveLendingPoolTest(AAVE_POOL).supply(USDT, amount, address(this), 0);
        emit ExternalFundReceived(msg.sender, amount);
    }

    function harvestYield() external nonReentrant {
        uint256 aTokenBalance = IERC20(A_USDT).balanceOf(address(this));
        uint256 totalLiability = totalPrincipalLiability + totalStakingLiability + totalCommunityLiability;
        uint256 yieldAmount = aTokenBalance > totalLiability ? aTokenBalance - totalLiability : 0;

        if (yieldAmount > 0) {
            uint256 fee = (yieldAmount * MAX_FEE_BPS) / 10000;
            IAaveLendingPoolTest(AAVE_POOL).withdraw(USDT, fee, address(this));
            accumulatedTreasuryFees += fee;
            emit YieldHarvested(yieldAmount, fee);
        }
    }

    function swapBnbToUsdt(uint256 bnbAmount) external nonReentrant {
        uint256 bnbPrice = _getBnbPrice();
        uint256 expectedUsdt = (bnbAmount * bnbPrice) / 1e18;
        uint256 minUsdtOut = (expectedUsdt * (10000 - SLIPPAGE_BPS)) / 10000;
        if (minUsdtOut == 0) revert SlippageExceeded();

        address[] memory path = new address[](2);
        path[0] = WBNB;
        path[1] = USDT;

        IPancakeRouterTest(PANCAKE_ROUTER).swapExactETHForTokens{value: bnbAmount}(
            minUsdtOut, path, address(this), block.timestamp
        );
    }

    function _ensureLiquidity(uint256 amount) internal {
        uint256 currentBalance = IERC20(USDT).balanceOf(address(this));
        if (currentBalance < amount) {
            uint256 needed = amount - currentBalance;
            IAaveLendingPoolTest(AAVE_POOL).withdraw(USDT, needed, address(this));
        }
    }

    function _getBnbPrice() internal view returns (uint256) {
        (uint80 roundId, int256 price, , uint256 updatedAt, uint80 answeredInRound) = IPriceFeedTest(CHAINLINK_BNB_USD).latestRoundData();
        if (price <= 0 || answeredInRound < roundId) revert InvalidOracle();
        if (block.timestamp - updatedAt > ORACLE_MAX_AGE) revert StaleOracle();
        return uint256(price);
    }

    function _distributeNetwork(address user, uint256 amount) internal {
        address current = _networkNodes[user].parent;
        uint256 added;
        for (uint8 level = 1; level <= MAX_LEVELS && current != address(0); ++level) {
            uint8 eligibleRank = _updateRank(current, amount);
            uint256 reward = Math.mulDiv(amount, AltexeraReferralScheduleTest.communityTierRate(eligibleRank, level), 10_000);
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
            volumeBlock: uint64(block.number),
            confirmedRank: eligibleRank,
            nextRank: nextRank
        });
        if (nextRank > state.nextRank) {
            emit RankScheduled(user, nextRank, volume, block.number + 1);
        }
    }

    function _rankForVolume(uint256 volume) internal pure returns (uint8) {
        if (volume >= 100_000_000e6) return 11;
        if (volume >= 50_000_000e6) return 10;
        if (volume >= 25_000_000e6) return 9;
        if (volume >= 10_000_000e6) return 8;
        if (volume >= 5_000_000e6) return 7;
        if (volume >= 3_500_000e6) return 6;
        if (volume >= 1_000_000e6) return 5;
        if (volume >= 500_000e6) return 4;
        if (volume >= 250_000e6) return 3;
        if (volume >= 85_000e6) return 2;
        if (volume >= 25_000e6) return 1;
        return 0;
    }

    function _stake(address user, uint256 index) internal view returns (Stake storage s) {
        if (index >= userStakes[user].length) revert InvalidStake();
        return userStakes[user][index];
    }

    function _recordPayment(Stake storage s, uint256 principal, uint256 profitAmount) internal {
        uint256 paidPrincipal = uint256(s.paidPrincipal) + principal;
        uint256 paidProfit = uint256(s.sweptRewards) + profitAmount;
        uint256 amount = principal + profitAmount;
        if (paidPrincipal > s.amount || paidProfit > s.totalProfit ||
            principal > totalPrincipalLiability || amount > totalStakingLiability) {
            revert AccountingInvariant();
        }
        s.paidPrincipal = uint128(paidPrincipal);
        s.sweptRewards = uint128(paidProfit);
        totalPrincipalLiability -= principal;
        totalStakingLiability -= amount;
    }

    function _pending(Stake storage s) internal view returns (uint256 principal, uint256 profitAmount) {
        if (!s.active) return (0, 0);
        Plan memory plan = plans[s.planId];
        uint256 start = s.startTime;
        uint256 end = start + plan.duration;
        bool mature = block.timestamp >= end;
        uint256 until = mature ? end : block.timestamp;
        uint256 principalEntitled = plan.principalAtEnd
            ? (mature ? s.amount : 0)
            : Math.mulDiv(s.amount, until - start, plan.duration);
        uint256 profitEntitled = mature ? s.totalProfit :
            (plan.profitAtEnd ? 0 : _profit(s.amount, plan.targetApyBps, _businessSeconds(start, until)));
        if (principalEntitled > s.amount || profitEntitled > s.totalProfit ||
            s.paidPrincipal > principalEntitled || s.sweptRewards > profitEntitled) {
            revert AccountingInvariant();
        }
        principal = principalEntitled - s.paidPrincipal;
        profitAmount = profitEntitled - s.sweptRewards;
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
        plans[1] = Plan(100e18, 2999e18, 40 days, 75, true, false);
        plans[2] = Plan(3000e18, 19999e18, 55 days, 95, true, false);
        plans[3] = Plan(20000e18, 49999e18, 70 days, 125, true, false);
        plans[4] = Plan(50000e18, 399999e18, 85 days, 145, true, false);
        plans[5] = Plan(400000e18, 999999e18, 100 days, 165, true, false);
        plans[9] = Plan(5000e18, 1000000e18, 360 days, 310, true, true);
        plans[6] = Plan(600e6, 17000e6, 90 days, 200, true, false);
        plans[7] = Plan(18000e6, 145000e6, 110 days, 240, true, false);
        plans[8] = Plan(150000e6, 900000e6, 130 days, 280, true, false);
        plans[10] = Plan(3000e6, 900000e6, 360 days, 310, true, true);
    }
}
