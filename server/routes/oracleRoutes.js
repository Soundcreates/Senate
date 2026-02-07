const express = require("express");
const router = express.Router();
const {
	getOracleStatus,
	signScoresHandler,
	submitScoresHandler,
	finalizeHandler,
	getEscrowHandler,
	listEscrowsHandler,
} = require("../controllers/oracleController");

router.get("/status", getOracleStatus);
router.post("/sign", signScoresHandler);
router.post("/submit-scores", submitScoresHandler);
router.post("/finalize", finalizeHandler);
router.get("/escrow/:address", getEscrowHandler);
router.get("/escrows", listEscrowsHandler);

module.exports = router;
