// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import "@openzeppelin/contracts-upgradeable/utils/ReentrancyGuardUpgradeable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import "./interfaces/IProductivityEscrow.sol";
import "./libraries/ScoreVerifier.sol";
import "./RewardToken.sol";

/**
 * @title ProductivityEscrow
 * @notice Per-project escrow that holds budget, manages milestones, score submissions,
 *         dispute resolution, and pull-payment withdrawals for contributors.
 *         UUPS Upgradeable.
 */
contract ProductivityEscrow is Initializable, UUPSUpgradeable, ReentrancyGuardUpgradeable, IProductivityEscrow {
    using SafeERC20 for IERC20;
    using ScoreVerifier for *;

    // --- State ---
    address public projectOwner;
    address public oracle;
    address public arbitrator;
    IERC20 public token;
    RewardToken public rewardToken; // optional, address(0) if not set

    address[] public contributors;
    mapping(address => bool) public isContributor;

    Milestone[] public milestones;

    // milestoneId => contributor => score
    mapping(uint256 => mapping(address => uint256)) public scores;

    // contributor => claimable amount
    mapping(address => uint256) public pendingWithdrawals;

    uint256 public disputeWindow;   // seconds (e.g., 3 days = 259200)
    uint256 public oracleTimeout;   // seconds after final milestone deadline

    uint256 public totalBudget;
    bool public initialized;

    /// @custom:oz-upgrades-unsafe-allow constructor
    constructor() {
        _disableInitializers();
    }

    // --- Modifiers ---
    modifier onlyProjectOwner() {
        require(msg.sender == projectOwner, "Escrow: not project owner");
        _;
    }

    modifier onlyOracle() {
        require(msg.sender == oracle, "Escrow: not oracle");
        _;
    }

    modifier onlyArbitrator() {
        require(msg.sender == arbitrator, "Escrow: not arbitrator");
        _;
    }

    modifier onlyContributorOrOwner() {
        require(
            isContributor[msg.sender] || msg.sender == projectOwner,
            "Escrow: not contributor or owner"
        );
        _;
    }

    // --- Initializer (upgradeable-ready) ---

    /**
     * @notice Initialize the escrow. Can only be called once.
     * @param _projectOwner Project admin who funds the escrow
     * @param _oracle Off-chain scoring oracle address
     * @param _arbitrator Dispute resolver address
     * @param _token ERC-20 payment token (e.g., USDC)
     * @param _rewardToken Optional reward token (address(0) to disable)
     * @param _contributors List of contributor wallets
     * @param _milestoneBudgets Budget for each milestone
     * @param _milestoneDeadlines Deadline timestamp for each milestone
     * @param _disputeWindow Duration in seconds for dispute window
     * @param _oracleTimeout Duration in seconds after which owner can refund if oracle is inactive
     */
    function initialize(
        address _projectOwner,
        address _oracle,
        address _arbitrator,
        address _token,
        address _rewardToken,
        address[] calldata _contributors,
        uint256[] calldata _milestoneBudgets,
        uint256[] calldata _milestoneDeadlines,
        uint256 _disputeWindow,
        uint256 _oracleTimeout
    ) external initializer {
        __UUPSUpgradeable_init();
        __ReentrancyGuard_init();

        require(_projectOwner != address(0), "Escrow: zero owner");
        require(_oracle != address(0), "Escrow: zero oracle");
        require(_arbitrator != address(0), "Escrow: zero arbitrator");
        require(_token != address(0), "Escrow: zero token");
        require(_contributors.length > 0, "Escrow: no contributors");
        require(
            _milestoneBudgets.length == _milestoneDeadlines.length,
            "Escrow: milestone arrays mismatch"
        );
        require(_milestoneBudgets.length > 0, "Escrow: no milestones");

        projectOwner = _projectOwner;
        oracle = _oracle;
        arbitrator = _arbitrator;
        token = IERC20(_token);
        rewardToken = RewardToken(_rewardToken);
        disputeWindow = _disputeWindow;
        oracleTimeout = _oracleTimeout;

        // Register contributors
        for (uint256 i = 0; i < _contributors.length; i++) {
            require(_contributors[i] != address(0), "Escrow: zero contributor");
            require(!isContributor[_contributors[i]], "Escrow: duplicate contributor");
            contributors.push(_contributors[i]);
            isContributor[_contributors[i]] = true;
        }

        // Create milestones and compute total budget
        uint256 _totalBudget = 0;
        for (uint256 i = 0; i < _milestoneBudgets.length; i++) {
            require(_milestoneBudgets[i] > 0, "Escrow: zero budget milestone");
            milestones.push(
                Milestone({
                    budget: _milestoneBudgets[i],
                    deadline: _milestoneDeadlines[i],
                    disputeDeadline: 0,
                    status: MilestoneStatus.Pending,
                    totalScore: 0
                })
            );
            _totalBudget += _milestoneBudgets[i];
        }
        totalBudget = _totalBudget;

        // Pull budget from project owner
        token.safeTransferFrom(_projectOwner, address(this), _totalBudget);
    }

    // --- Core functions ---

    /// @inheritdoc IProductivityEscrow
    function submitScores(
        uint256 milestoneId,
        address[] calldata members,
        uint256[] calldata _scores,
        bytes calldata oracleSignature
    ) external override {
        require(milestoneId < milestones.length, "Escrow: invalid milestone");
        Milestone storage ms = milestones[milestoneId];
        require(ms.status == MilestoneStatus.Pending, "Escrow: milestone not pending");
        require(block.timestamp >= ms.deadline, "Escrow: milestone deadline not reached");
        require(members.length == _scores.length, "Escrow: arrays length mismatch");
        require(members.length > 0, "Escrow: empty scores");

        // Verify oracle signature if caller is not oracle
        if (msg.sender != oracle) {
            require(
                ScoreVerifier.verify(
                    oracle,
                    address(this),
                    milestoneId,
                    members,
                    _scores,
                    oracleSignature
                ),
                "Escrow: invalid oracle signature"
            );
        }

        uint256 _totalScore = 0;
        for (uint256 i = 0; i < members.length; i++) {
            require(isContributor[members[i]], "Escrow: not a contributor");
            require(scores[milestoneId][members[i]] == 0, "Escrow: score already set");
            require(_scores[i] > 0, "Escrow: zero score");
            scores[milestoneId][members[i]] = _scores[i];
            _totalScore += _scores[i];
        }

        ms.totalScore = _totalScore;
        ms.status = MilestoneStatus.ScoresSubmitted;
        ms.disputeDeadline = block.timestamp + disputeWindow;

        emit ScoresSubmitted(milestoneId, _totalScore);
    }

    /// @inheritdoc IProductivityEscrow
    function raiseDispute(uint256 milestoneId, string calldata reason) external override onlyContributorOrOwner {
        require(milestoneId < milestones.length, "Escrow: invalid milestone");
        Milestone storage ms = milestones[milestoneId];
        require(ms.status == MilestoneStatus.ScoresSubmitted, "Escrow: scores not submitted");
        require(block.timestamp <= ms.disputeDeadline, "Escrow: dispute window closed");

        ms.status = MilestoneStatus.InDispute;

        emit DisputeRaised(milestoneId, msg.sender, reason);
    }

    /// @inheritdoc IProductivityEscrow
    function resolveDispute(
        uint256 milestoneId,
        address[] calldata members,
        uint256[] calldata correctedScores
    ) external override onlyArbitrator {
        require(milestoneId < milestones.length, "Escrow: invalid milestone");
        Milestone storage ms = milestones[milestoneId];
        require(ms.status == MilestoneStatus.InDispute, "Escrow: not in dispute");
        require(members.length == correctedScores.length, "Escrow: arrays length mismatch");

        // Overwrite scores
        uint256 _totalScore = 0;
        for (uint256 i = 0; i < members.length; i++) {
            require(isContributor[members[i]], "Escrow: not a contributor");
            scores[milestoneId][members[i]] = correctedScores[i];
            _totalScore += correctedScores[i];
        }
        ms.totalScore = _totalScore;

        // Auto-finalize after dispute resolution
        _finalizeMilestone(milestoneId);

        emit DisputeResolved(milestoneId);
    }

    /// @inheritdoc IProductivityEscrow
    function finalizeMilestone(uint256 milestoneId) external override {
        require(milestoneId < milestones.length, "Escrow: invalid milestone");
        Milestone storage ms = milestones[milestoneId];
        require(ms.status == MilestoneStatus.ScoresSubmitted, "Escrow: cannot finalize");
        require(block.timestamp > ms.disputeDeadline, "Escrow: dispute window active");

        _finalizeMilestone(milestoneId);
    }

    /// @inheritdoc IProductivityEscrow
    function withdraw() external override nonReentrant {
        uint256 amount = pendingWithdrawals[msg.sender];
        require(amount > 0, "Escrow: nothing to withdraw");

        pendingWithdrawals[msg.sender] = 0;
        token.safeTransfer(msg.sender, amount);

        // Mint reward tokens if reward token is configured
        if (address(rewardToken) != address(0)) {
            uint256 rewardAmount = rewardToken.calculateReward(amount);
            if (rewardAmount > 0) {
                rewardToken.mint(msg.sender, rewardAmount);
                emit RewardsMinted(msg.sender, rewardAmount);
            }
        }

        emit PaymentReleased(msg.sender, amount);
    }

    /// @inheritdoc IProductivityEscrow
    function refundRemaining() external override onlyProjectOwner {
        bool canRefund = _allMilestonesFinalized() || _oracleTimedOut();
        require(canRefund, "Escrow: cannot refund yet");

        uint256 balance = token.balanceOf(address(this));
        require(balance > 0, "Escrow: no balance to refund");

        token.safeTransfer(projectOwner, balance);

        emit Refunded(projectOwner, balance);
    }

    // --- Admin functions ---

    function updateOracle(address newOracle) external onlyProjectOwner {
        require(newOracle != address(0), "Escrow: zero address");
        emit OracleUpdated(oracle, newOracle);
        oracle = newOracle;
    }

    function updateArbitrator(address newArbitrator) external onlyProjectOwner {
        require(newArbitrator != address(0), "Escrow: zero address");
        emit ArbitratorUpdated(arbitrator, newArbitrator);
        arbitrator = newArbitrator;
    }

    function updateDisputeWindow(uint256 newWindow) external onlyProjectOwner {
        emit DisputeWindowUpdated(disputeWindow, newWindow);
        disputeWindow = newWindow;
    }

    // --- View functions ---

    function getMilestoneCount() external view returns (uint256) {
        return milestones.length;
    }

    function getContributors() external view returns (address[] memory) {
        return contributors;
    }

    function getContributorScore(uint256 milestoneId, address contributor) external view returns (uint256) {
        return scores[milestoneId][contributor];
    }

    function getMilestone(uint256 milestoneId) external view returns (Milestone memory) {
        require(milestoneId < milestones.length, "Escrow: invalid milestone");
        return milestones[milestoneId];
    }

    // --- Internal ---

    function _finalizeMilestone(uint256 milestoneId) internal {
        Milestone storage ms = milestones[milestoneId];
        require(ms.totalScore > 0, "Escrow: no scores");

        uint256 allocated = 0;
        for (uint256 i = 0; i < contributors.length; i++) {
            address contributor = contributors[i];
            uint256 score = scores[milestoneId][contributor];
            if (score > 0) {
                uint256 share = (ms.budget * score) / ms.totalScore;
                pendingWithdrawals[contributor] += share;
                allocated += share;
            }
        }

        // Any dust (from rounding) remains in the contract for projectOwner to refund later
        ms.status = MilestoneStatus.Finalized;

        emit MilestoneFinalized(milestoneId, ms.budget);
    }

    function _allMilestonesFinalized() internal view returns (bool) {
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].status != MilestoneStatus.Finalized) {
                return false;
            }
        }
        return true;
    }

    function _oracleTimedOut() internal view returns (bool) {
        // Check if oracle failed to submit scores for any pending milestone past timeout
        uint256 lastDeadline = 0;
        for (uint256 i = 0; i < milestones.length; i++) {
            if (milestones[i].deadline > lastDeadline) {
                lastDeadline = milestones[i].deadline;
            }
        }
        // If the last deadline + oracleTimeout has passed and not all milestones are finalized
        return block.timestamp > lastDeadline + oracleTimeout;
    }

    /// @notice Required by UUPS pattern. Only project owner can upgrade.
    function _authorizeUpgrade(address newImplementation) internal override onlyProjectOwner {}
}
