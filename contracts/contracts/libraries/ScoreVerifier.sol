// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";

/**
 * @title ScoreVerifier
 * @notice EIP-712 style signature verification for oracle score submissions.
 */
library ScoreVerifier {
    using ECDSA for bytes32;

    bytes32 private constant SCORE_TYPEHASH =
        keccak256("SubmitScores(address escrow,uint256 milestoneId,address[] members,uint256[] scores)");

    /**
     * @notice Builds and returns the message hash for score submission.
     * @param escrow Address of the escrow contract
     * @param milestoneId The milestone being scored
     * @param members Array of contributor addresses
     * @param _scores Array of scores
     * @return The eth-signed message hash
     */
    function getMessageHash(
        address escrow,
        uint256 milestoneId,
        address[] calldata members,
        uint256[] calldata _scores
    ) internal pure returns (bytes32) {
        return MessageHashUtils.toEthSignedMessageHash(
            keccak256(
                abi.encodePacked(
                    SCORE_TYPEHASH,
                    escrow,
                    milestoneId,
                    keccak256(abi.encodePacked(members)),
                    keccak256(abi.encodePacked(_scores))
                )
            )
        );
    }

    /**
     * @notice Verifies that the oracle signed the score submission.
     * @param oracle Expected signer address
     * @param escrow Address of the escrow contract
     * @param milestoneId The milestone being scored
     * @param members Array of contributor addresses
     * @param _scores Array of scores
     * @param signature The oracle's signature
     * @return True if signature is valid
     */
    function verify(
        address oracle,
        address escrow,
        uint256 milestoneId,
        address[] calldata members,
        uint256[] calldata _scores,
        bytes calldata signature
    ) internal pure returns (bool) {
        bytes32 msgHash = getMessageHash(escrow, milestoneId, members, _scores);
        return msgHash.recover(signature) == oracle;
    }
}
