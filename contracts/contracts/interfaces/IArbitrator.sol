// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title IArbitrator
 * @notice Interface for external arbitration systems (e.g., Kleros-compatible).
 */
interface IArbitrator {
    function resolveDispute(
        uint256 milestoneId,
        address[] calldata members,
        uint256[] calldata correctedScores
    ) external;
}
