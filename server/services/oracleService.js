/**
 * Oracle Service — Produces oracle signatures for score submissions
 * and submits them on-chain.
 *
 * CRITICAL: The signature scheme MUST match ScoreVerifier.sol exactly:
 *
 *   SCORE_TYPEHASH = keccak256("SubmitScores(address escrow,uint256 milestoneId,address[] members,uint256[] scores)")
 *   messageHash = keccak256(abi.encodePacked(SCORE_TYPEHASH, escrow, milestoneId, keccak256(abi.encodePacked(members)), keccak256(abi.encodePacked(scores))))
 *   ethSignedMessageHash = toEthSignedMessageHash(messageHash)
 *   signature = oracle.sign(ethSignedMessageHash)  ← actually sign the inner hash, ethers signMessage auto-prefixes
 */
const { ethers } = require("ethers");
const { getOracleWallet, getEscrowContract } = require("./blockchainService");

// Must match ScoreVerifier.sol
const SCORE_TYPEHASH = ethers.keccak256(
	ethers.toUtf8Bytes("SubmitScores(address escrow,uint256 milestoneId,address[] members,uint256[] scores)")
);

/**
 * Build the same message hash that ScoreVerifier.getMessageHash produces.
 * The contract uses:
 *   keccak256(abi.encodePacked(SCORE_TYPEHASH, escrow, milestoneId, keccak256(abi.encodePacked(members)), keccak256(abi.encodePacked(scores))))
 *
 * In ethers.js v6:
 *   - abi.encodePacked(address[]) → solidityPacked(["address[]"], [members]) which is just each address left-padded to 32 bytes concatenated
 *     Actually Solidity's abi.encodePacked for address[] concatenates *20-byte* addresses.
 *     ethers.solidityPacked(["address", "address", ...], [addr1, addr2, ...]) handles this.
 *   - abi.encodePacked(uint256[]) → solidityPacked for each uint256 (32 bytes each)
 *
 * Then the result is toEthSignedMessageHash'd in the contract, and ethers.signMessage() auto-prefixes.
 */
function buildMessageHash(escrowAddress, milestoneId, members, scores) {
	// keccak256(abi.encodePacked(members)) — pack 20-byte addresses
	const membersTypes = members.map(() => "address");
	const membersPacked = ethers.solidityPacked(membersTypes, members);
	const membersHash = ethers.keccak256(membersPacked);

	// keccak256(abi.encodePacked(scores)) — pack 32-byte uint256 values
	const scoresTypes = scores.map(() => "uint256");
	const scoresBigInts = scores.map((s) => BigInt(s));
	const scoresPacked = ethers.solidityPacked(scoresTypes, scoresBigInts);
	const scoresHash = ethers.keccak256(scoresPacked);

	// abi.encodePacked(SCORE_TYPEHASH, escrow, milestoneId, membersHash, scoresHash)
	// SCORE_TYPEHASH is bytes32 (32 bytes), escrow is address (20 bytes in encodePacked),
	// milestoneId is uint256 (32 bytes), membersHash is bytes32, scoresHash is bytes32.
	const packed = ethers.solidityPacked(
		["bytes32", "address", "uint256", "bytes32", "bytes32"],
		[SCORE_TYPEHASH, escrowAddress, BigInt(milestoneId), membersHash, scoresHash]
	);

	return ethers.keccak256(packed);
}

/**
 * Sign scores for a milestone.
 * @param {string} escrowAddress - The escrow contract address
 * @param {number} milestoneId - Milestone index
 * @param {string[]} members - Contributor addresses
 * @param {number[]} scores - Corresponding scores (positive integers)
 * @returns {string} The oracle's signature (65-byte hex)
 */
async function signScores(escrowAddress, milestoneId, members, scores) {
	const wallet = getOracleWallet();
	const messageHash = buildMessageHash(escrowAddress, milestoneId, members, scores);
	// ethers.signMessage() auto-adds the "\x19Ethereum Signed Message:\n32" prefix,
	// which matches MessageHashUtils.toEthSignedMessageHash in the contract.
	const signature = await wallet.signMessage(ethers.getBytes(messageHash));
	return signature;
}

/**
 * Submit scores on-chain as the oracle.
 * The oracle wallet calls escrow.submitScores directly (no signature needed when msg.sender == oracle).
 * @param {string} escrowAddress
 * @param {number} milestoneId
 * @param {string[]} members
 * @param {number[]} scores
 * @returns {{ txHash: string, receipt: object }}
 */
async function submitScoresOnChain(escrowAddress, milestoneId, members, scores) {
	const wallet = getOracleWallet();
	const escrow = getEscrowContract(escrowAddress, wallet);

	// When calling as the oracle itself, the contract does NOT verify signature
	const tx = await escrow.submitScores(milestoneId, members, scores, "0x");
	const receipt = await tx.wait();
	return { txHash: receipt.hash, receipt };
}

/**
 * Finalize a milestone on-chain (can be called by anyone once dispute window closes).
 */
async function finalizeMilestoneOnChain(escrowAddress, milestoneId) {
	const wallet = getOracleWallet();
	const escrow = getEscrowContract(escrowAddress, wallet);

	const tx = await escrow.finalizeMilestone(milestoneId);
	const receipt = await tx.wait();
	return { txHash: receipt.hash, receipt };
}

module.exports = {
	SCORE_TYPEHASH,
	buildMessageHash,
	signScores,
	submitScoresOnChain,
	finalizeMilestoneOnChain,
};
