/**
 * Oracle Controller — API endpoints for score signing, submission, and chain reads.
 */
const { getOracleAddress, getEscrowData, getAllEscrowAddresses } = require("../services/blockchainService");
const { signScores, submitScoresOnChain, finalizeMilestoneOnChain } = require("../services/oracleService");

/**
 * GET /oracle/status
 * Returns oracle wallet address and health info.
 */
const getOracleStatus = async (_req, res) => {
	try {
		const address = getOracleAddress();
		res.json({
			ok: true,
			oracle: address || null,
			configured: Boolean(address),
		});
	} catch (error) {
		res.status(500).json({ error: "oracle_status_failed", message: error.message });
	}
};

/**
 * POST /oracle/sign
 * Body: { escrowAddress, milestoneId, members: string[], scores: number[] }
 * Returns: { signature }
 */
const signScoresHandler = async (req, res) => {
	try {
		const { escrowAddress, milestoneId, members, scores } = req.body;

		if (!escrowAddress || milestoneId === undefined || !members || !scores) {
			return res.status(400).json({ error: "missing_fields" });
		}
		if (members.length !== scores.length || members.length === 0) {
			return res.status(400).json({ error: "arrays_length_mismatch" });
		}

		const signature = await signScores(escrowAddress, milestoneId, members, scores);
		res.json({ ok: true, signature });
	} catch (error) {
		console.error("[Oracle] Sign failed:", error.message);
		res.status(500).json({ error: "sign_failed", message: error.message });
	}
};

/**
 * POST /oracle/submit-scores
 * Submit scores directly on-chain from the oracle wallet.
 * Body: { escrowAddress, milestoneId, members: string[], scores: number[] }
 */
const submitScoresHandler = async (req, res) => {
	try {
		const { escrowAddress, milestoneId, members, scores } = req.body;

		if (!escrowAddress || milestoneId === undefined || !members || !scores) {
			return res.status(400).json({ error: "missing_fields" });
		}
		if (members.length !== scores.length || members.length === 0) {
			return res.status(400).json({ error: "arrays_length_mismatch" });
		}

		const result = await submitScoresOnChain(escrowAddress, milestoneId, members, scores);
		res.json({ ok: true, txHash: result.txHash });
	} catch (error) {
		console.error("[Oracle] Submit scores failed:", error.message);
		res.status(500).json({ error: "submit_scores_failed", message: error.message });
	}
};

/**
 * POST /oracle/finalize
 * Finalize a milestone after dispute window closes.
 * Body: { escrowAddress, milestoneId }
 */
const finalizeHandler = async (req, res) => {
	try {
		const { escrowAddress, milestoneId } = req.body;

		if (!escrowAddress || milestoneId === undefined) {
			return res.status(400).json({ error: "missing_fields" });
		}

		const result = await finalizeMilestoneOnChain(escrowAddress, milestoneId);
		res.json({ ok: true, txHash: result.txHash });
	} catch (error) {
		console.error("[Oracle] Finalize failed:", error.message);
		res.status(500).json({ error: "finalize_failed", message: error.message });
	}
};

/**
 * GET /oracle/escrow/:address
 * Read escrow data from chain.
 */
const getEscrowHandler = async (req, res) => {
	try {
		const data = await getEscrowData(req.params.address);
		res.json({ ok: true, escrow: data });
	} catch (error) {
		console.error("[Oracle] Get escrow failed:", error.message);
		res.status(500).json({ error: "get_escrow_failed", message: error.message });
	}
};

/**
 * GET /oracle/escrows
 * List all escrows from the factory.
 */
const listEscrowsHandler = async (_req, res) => {
	try {
		const addresses = await getAllEscrowAddresses();
		res.json({ ok: true, escrows: addresses });
	} catch (error) {
		console.error("[Oracle] List escrows failed:", error.message);
		res.status(500).json({ error: "list_escrows_failed", message: error.message });
	}
};

module.exports = {
	getOracleStatus,
	signScoresHandler,
	submitScoresHandler,
	finalizeHandler,
	getEscrowHandler,
	listEscrowsHandler,
};
