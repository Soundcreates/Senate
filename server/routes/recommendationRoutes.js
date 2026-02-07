const express = require("express");
const { 
  getRecommendations, 
  checkRAGHealth 
} = require("../controllers/recommendationController");

const router = express.Router();

/**
 * POST /api/recommendations
 * Get recommendations from the RAG endpoint
 * 
 * Request body:
 * {
 *   "query": "user query for recommendations",
 *   "context": { optional context object },
 *   "userId": "optional user id"
 * }
 */
router.post("/", getRecommendations);

/**
 * GET /api/recommendations/health
 * Check the health of the RAG endpoint
 */
router.get("/health", checkRAGHealth);

module.exports = router;
