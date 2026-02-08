const express = require("express");
const router = express.Router();
const {
  calculatePayment,
  processFiatPayment,
  processCryptoPayment,
  finalizeMilestone,
  getTaskPayments,
  getUserPayments,
} = require("../controllers/paymentController");

// Calculate payment amount for a user on a task
router.post("/calculate/:taskId", calculatePayment);

// Process fiat payment
router.post("/fiat", processFiatPayment);

// Process crypto payment via escrow
router.post("/crypto", processCryptoPayment);

// Finalize milestone (after dispute window)
router.post("/finalize-milestone", finalizeMilestone);

// Get all payments for a task
router.get("/task/:taskId", getTaskPayments);

// Get all payments for a user
router.get("/user/:userId", getUserPayments);

module.exports = router;
