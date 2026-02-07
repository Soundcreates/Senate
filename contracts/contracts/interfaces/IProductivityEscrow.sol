// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

interface IProductivityEscrow {
    enum MilestoneStatus {
        Pending,
        ScoresSubmitted,
        InDispute,
        Finalized
    }

    struct Milestone {
        uint256 budget;
        uint256 deadline;
        uint256 disputeDeadline;
        MilestoneStatus status;
        uint256 totalScore;
    }

    // Events
    event ScoresSubmitted(uint256 indexed milestoneId, uint256 totalScore);
    event DisputeRaised(uint256 indexed milestoneId, address indexed raiser, string reason);
    event DisputeResolved(uint256 indexed milestoneId);
    event MilestoneFinalized(uint256 indexed milestoneId, uint256 budget);
    event PaymentReleased(address indexed contributor, uint256 amount);
    event RewardsMinted(address indexed contributor, uint256 amount);
    event Refunded(address indexed projectOwner, uint256 amount);
    event OracleUpdated(address indexed oldOracle, address indexed newOracle);
    event ArbitratorUpdated(address indexed oldArbitrator, address indexed newArbitrator);
    event DisputeWindowUpdated(uint256 oldWindow, uint256 newWindow);

    function submitScores(
        uint256 milestoneId,
        address[] calldata members,
        uint256[] calldata _scores,
        bytes calldata oracleSignature
    ) external;

    function raiseDispute(uint256 milestoneId, string calldata reason) external;

    function resolveDispute(
        uint256 milestoneId,
        address[] calldata members,
        uint256[] calldata correctedScores
    ) external;

    function finalizeMilestone(uint256 milestoneId) external;

    function withdraw() external;

    function refundRemaining() external;
}
