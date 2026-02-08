const Payment = require("../models/Payment");
const Task = require("../models/Task");
const Project = require("../models/Project");
const User = require("../models/UserSchema");
const blockchainService = require("../services/blockchainService");
const { ethers } = require("ethers");

// Calculate payment amount based on task score and project budget
const calculatePayment = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { userId } = req.body; // User to calculate payment for

    // Fetch task with scores from getTaskDetails logic
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!project.budget || project.budget <= 0) {
      return res.status(400).json({ error: "Project has no budget allocated" });
    }

    // Verify user is an assignee
    if (!task.assignees.includes(userId)) {
      return res.status(403).json({ error: "User is not assigned to this task" });
    }

    // Fetch the user's score from task details (we'll need to call the scoring logic)
    // For now, we'll create a simplified version that uses the overall score
    // In production, you'd call the same scoring logic from taskController
    
    // Import scoring logic or calculate here
    const taskController = require("./taskController");
    // We need the getTaskDetails logic, but for now let's assume we get the score
    
    // Simplified: Equal split among assignees, weighted by score
    // Each assignee gets: (projectBudget / totalAssignees) * (theirScore / 100)
    
    // For more accurate calculation, we'd need to:
    // 1. Get all assignees' scores
    // 2. Calculate proportional split based on scores
    
    const baseAmount = project.budget / task.assignees.length;
    
    // For now, return the base amount
    // TODO: Integrate with actual scoring system to get user's score
    const calculatedAmount = baseAmount;
    
    return res.json({
      taskId: task._id,
      projectId: project._id,
      userId,
      baseAmount,
      calculatedAmount,
      currency: "USD",
      breakdown: {
        projectBudget: project.budget,
        totalAssignees: task.assignees.length,
        perAssigneeShare: baseAmount,
      },
      paymentMethodOptions: ["fiat", "crypto"],
      escrowAvailable: !!project.escrowAddress,
    });
  } catch (error) {
    console.error("Error calculating payment:", error);
    return res.status(500).json({ error: "Failed to calculate payment" });
  }
};

// Process fiat payment
const processFiatPayment = async (req, res) => {
  try {
    const { taskId, userId, amount, score, scoreBreakdown, paymentReference, paymentNotes } = req.body;
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    // Create payment record
    const payment = new Payment({
      taskId,
      projectId: task.projectId,
      recipient: userId,
      amount,
      score,
      scoreBreakdown,
      method: "fiat",
      status: "completed",
      paymentReference,
      paymentNotes,
      paidBy: req.user._id,
      paidAt: new Date(),
    });

    await payment.save();

    // Update task payment status
    const allPaymentsForTask = await Payment.find({ taskId });
    const allAssigneesPaid = task.assignees.every(assignee =>
      allPaymentsForTask.some(p => p.recipient.toString() === assignee && p.status === "completed")
    );

    task.hasPayments = true;
    task.paymentStatus = allAssigneesPaid ? "paid" : "pending";
    task.paymentMethod = "fiat";
    await task.save();

    return res.json({
      success: true,
      payment: payment.toObject(),
      taskPaymentStatus: task.paymentStatus,
    });
  } catch (error) {
    console.error("Error processing fiat payment:", error);
    return res.status(500).json({ error: "Failed to process fiat payment" });
  }
};

// Process crypto payment via escrow
const processCryptoPayment = async (req, res) => {
  try {
    const { taskId, scores } = req.body; // scores: [{ userId, score, scoreBreakdown, ethereumAddress }]
    
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }

    const project = await Project.findById(task.projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }

    if (!project.escrowAddress) {
      return res.status(400).json({ error: "Project has no escrow contract deployed" });
    }

    // Get escrow contract data
    const escrowData = await blockchainService.getEscrowData(project.escrowAddress);
    
    // Find the milestone for this task (for now, use first milestone or create mapping)
    // TODO: Add milestoneId mapping in Project schema
    const milestoneId = 0; // First milestone for now
    
    // Prepare scores for blockchain submission
    const members = scores.map(s => s.ethereumAddress);
    const scoresArray = scores.map(s => Math.floor(s.score)); // Convert to integers

    // Get oracle wallet
    const oracleWallet = blockchainService.getOracleWallet();
    const escrowContract = blockchainService.getEscrowContract(project.escrowAddress);

    // Create signature
    const messageHash = ethers.solidityPackedKeccak256(
      ["address", "uint256", "address[]", "uint256[]"],
      [project.escrowAddress, milestoneId, members, scoresArray]
    );
    const signature = await oracleWallet.signMessage(ethers.getBytes(messageHash));

    // Submit scores to escrow
    const tx = await escrowContract.submitScores(milestoneId, members, scoresArray, signature);
    await tx.wait();

    // Create payment records for each recipient
    const payments = [];
    for (const scoreData of scores) {
      const payment = new Payment({
        taskId,
        projectId: task.projectId,
        recipient: scoreData.userId,
        recipientAddress: scoreData.ethereumAddress,
        amount: 0, // Will be calculated on-chain proportionally
        score: scoreData.score,
        scoreBreakdown: scoreData.scoreBreakdown,
        method: "crypto",
        status: "processing",
        escrowAddress: project.escrowAddress,
        milestoneId,
        txHash: tx.hash,
        chainId: project.escrowChainId || blockchainService.SEPOLIA_CHAIN_ID,
        paidBy: req.user._id,
      });
      await payment.save();
      payments.push(payment);
    }

    // Update task
    task.hasPayments = true;
    task.paymentStatus = "processing";
    task.paymentMethod = "crypto";
    await task.save();

    return res.json({
      success: true,
      txHash: tx.hash,
      payments: payments.map(p => p.toObject()),
      escrowAddress: project.escrowAddress,
      milestoneId,
      message: "Scores submitted to escrow. Users can withdraw after dispute window ends.",
    });
  } catch (error) {
    console.error("Error processing crypto payment:", error);
    return res.status(500).json({ error: "Failed to process crypto payment", details: error.message });
  }
};

// Finalize milestone (after dispute window)
const finalizeMilestone = async (req, res) => {
  try {
    const { projectId, milestoneId } = req.body;

    const project = await Project.findById(projectId);
    if (!project || !project.escrowAddress) {
      return res.status(404).json({ error: "Project or escrow not found" });
    }

    const oracleWallet = blockchainService.getOracleWallet();
    const escrowContract = blockchainService.getEscrowContract(project.escrowAddress).connect(oracleWallet);

    const tx = await escrowContract.finalizeMilestone(milestoneId);
    await tx.wait();

    // Update all payments for this milestone
    await Payment.updateMany(
      { 
        projectId, 
        milestoneId, 
        method: "crypto",
        status: "processing" 
      },
      { 
        status: "completed",
        paidAt: new Date()
      }
    );

    return res.json({
      success: true,
      txHash: tx.hash,
      message: "Milestone finalized. Users can now withdraw their funds.",
    });
  } catch (error) {
    console.error("Error finalizing milestone:", error);
    return res.status(500).json({ error: "Failed to finalize milestone", details: error.message });
  }
};

// Get payment history for a task
const getTaskPayments = async (req, res) => {
  try {
    const { taskId } = req.params;

    const payments = await Payment.find({ taskId })
      .populate("recipient", "name email")
      .populate("paidBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({ payments });
  } catch (error) {
    console.error("Error fetching payments:", error);
    return res.status(500).json({ error: "Failed to fetch payments" });
  }
};

// Get payment history for a user
const getUserPayments = async (req, res) => {
  try {
    const { userId } = req.params;

    const payments = await Payment.find({ recipient: userId })
      .populate("taskId", "title githubIssueNumber")
      .populate("projectId", "name")
      .populate("paidBy", "name email")
      .sort({ createdAt: -1 });

    return res.json({ payments });
  } catch (error) {
    console.error("Error fetching user payments:", error);
    return res.status(500).json({ error: "Failed to fetch user payments" });
  }
};

module.exports = {
  calculatePayment,
  processFiatPayment,
  processCryptoPayment,
  finalizeMilestone,
  getTaskPayments,
  getUserPayments,
};
