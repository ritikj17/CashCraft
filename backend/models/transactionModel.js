const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  txnId: {
    type: String,
    required: true,
    unique: true
  },
  senderUserId: String,
  receiverUserId: {
    type: String,
    required: true
  },
  senderUpi: {
    type: String,
    default: null
  },
  senderName: {
    type: String,
    default: null
  },
  receiverUpi: {
    type: String,
    required: true
  },
  receiverName: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  status: {
    type: String,
    enum: ["pending", "scanned", "processing", "success", "failed", "expired"],
    default: "pending"
  },
  channel: {
    type: String,
    default: "bluetooth-offline"
  },
  qrHash: String,
  expiresAt: Date,
  qrConsumedAt: Date,
  paymentMethod: String,
  createdAt: {
    type: Date,
    default: Date.now
  },
  completedAt: Date
});

module.exports = mongoose.model("Transaction", transactionSchema);
