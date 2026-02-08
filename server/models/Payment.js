const mongoose = require("mongoose");

const PaymentSchema = new mongoose.Schema(
  {
    taskId: { type: mongoose.Schema.Types.ObjectId, ref: "Task", required: true },
    projectId: { type: mongoose.Schema.Types.ObjectId, ref: "Project", required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    recipientAddress: { type: String, trim: true }, // Ethereum address for crypto payments
    amount: { type: Number, required: true }, // In USD or project currency
    score: { type: Number, required: true }, // Overall score /100 at time of payment
    scoreBreakdown: {
      punctuality: { type: Number, default: null },
      codeReview: { type: Number, default: null },
      codingTime: { type: Number, default: null },
    },
    method: { type: String, enum: ["fiat", "crypto"], required: true },
    status: { type: String, enum: ["pending", "processing", "completed", "failed"], default: "pending" },
    
    // For crypto payments
    escrowAddress: { type: String, trim: true, default: null },
    milestoneId: { type: Number, default: null },
    txHash: { type: String, trim: true, default: null },
    chainId: { type: Number, default: null },
    
    // For fiat payments
    paymentReference: { type: String, trim: true, default: null },
    paymentNotes: { type: String, trim: true, default: null },
    
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
    paidAt: { type: Date, default: null },
  },
  { timestamps: true }
);

PaymentSchema.index({ taskId: 1 });
PaymentSchema.index({ projectId: 1 });
PaymentSchema.index({ recipient: 1, createdAt: -1 });
PaymentSchema.index({ status: 1 });

module.exports = mongoose.model("Payment", PaymentSchema);
