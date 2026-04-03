const express = require("express");
const crypto = require("crypto");
const QRCode = require("qrcode");
const { v4: uuidv4 } = require("uuid");
const User = require("../models/userModel");
const {
  createPaymentRequest,
  expireTransaction,
  getTimeLeftLabel,
  getTransaction,
  getTransactionInsights,
  getUserTransactions,
  markProcessing,
  markQrScanned,
  updateTransaction
} = require("../transaction");

const router = express.Router();
const SECRET_KEY = "paynearby-fin-o-hack-2026";

function generateHash(txnId, receiverUpi, amount, expiresAt) {
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${txnId}|${receiverUpi}|${amount}|${expiresAt}`)
    .digest("hex")
    .substring(0, 16);
}

router.post("/request", async (req, res) => {
  const { receiverUserId, receiverName, receiverUpi, amount } = req.body;

  if (!receiverName || !receiverUpi || !amount) {
    return res.status(400).json({ error: "receiverName, receiverUpi, amount are required" });
  }

  let receiver = null;

  if (receiverUserId) {
    receiver = await User.findById(receiverUserId);
  }

  if (!receiver) {
    receiver = await User.findOne({ name: receiverName, upiId: receiverUpi });
  }

  if (!receiver) {
    receiver = await User.create({ name: receiverName, upiId: receiverUpi });
  }

  const txnId = `TXN-${uuidv4().substring(0, 6).toUpperCase()}`;
  const createdAt = Date.now();
  const expiresAt = createdAt + 5 * 60 * 1000;
  const hash = generateHash(txnId, receiver.upiId, amount, expiresAt);
  const qrData = JSON.stringify({
    txnId,
    receiverUserId: String(receiver._id),
    receiverUpi: receiver.upiId,
    receiverName: receiver.name,
    amount: Number(amount),
    createdAt,
    expiresAt,
    hash,
    app: "PayNearBy"
  });

  try {
    await createPaymentRequest({
      txnId,
      receiverUserId: receiver._id,
      receiverName: receiver.name,
      receiverUpi: receiver.upiId,
      amount,
      expiresAt,
      qrHash: hash
    });

    const qrDataUrl = await QRCode.toDataURL(qrData, {
      errorCorrectionLevel: "H",
      margin: 2,
      width: 300,
      color: {
        dark: "#1a1a2e",
        light: "#ffffff"
      }
    });

    res.json({
      txnId,
      receiverUserId: String(receiver._id),
      receiverName: receiver.name,
      receiverUpi: receiver.upiId,
      qrData,
      qrDataUrl,
      expiresAt,
      expiresIn: "5 minutes",
      hash
    });
  } catch (err) {
    res.status(500).json({ error: "QR generation failed" });
  }
});

router.post("/verify-qr", async (req, res) => {
  const { qrData } = req.body;

  try {
    const parsed = JSON.parse(qrData);
    const { txnId, receiverUpi, amount, expiresAt, hash } = parsed;
    const txn = await getTransaction(txnId);

    if (!txn) {
      return res.json({ valid: false, reason: "Transaction not found.", riskLevel: "danger" });
    }

    if (txn.isExpired || Date.now() > expiresAt) {
      await expireTransaction(txnId);
      return res.json({ valid: false, reason: "QR code has expired. Ask receiver to generate a new one.", riskLevel: "expired" });
    }

    if (txn.qrConsumedAt) {
      return res.json({ valid: false, reason: "QR code has already been scanned and cannot be reused.", riskLevel: "warning" });
    }

    const expectedHash = generateHash(txnId, receiverUpi, amount, expiresAt);
    const hashMatches =
      hash === expectedHash &&
      txn.qrHash === hash &&
      txn.receiverUpi === receiverUpi &&
      Number(txn.amount) === Number(amount);

    if (!hashMatches) {
      return res.json({ valid: false, reason: "QR code has been tampered with. Do not proceed!", riskLevel: "danger" });
    }

    await markQrScanned(txnId);

    res.json({
      valid: true,
      txnId,
      receiverUserId: txn.receiverUserId,
      receiverUpi,
      receiverName: txn.receiverName,
      amount,
      timeLeft: getTimeLeftLabel(expiresAt),
      riskLevel: "safe"
    });
  } catch (err) {
    res.json({ valid: false, reason: "Invalid QR code format.", riskLevel: "danger" });
  }
});

router.post("/complete", async (req, res) => {
  const { txnId, senderUserId, paymentMethod } = req.body;
  const txn = await getTransaction(txnId);

  if (!txn) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  if (txn.isExpired) {
    return res.status(410).json({ error: "Transaction has expired" });
  }

  if (txn.status === "success") {
    return res.status(409).json({ error: "Transaction already completed" });
  }

  const sender = await User.findById(senderUserId);
  const receiver = await User.findById(txn.receiverUserId);

  if (!sender || !receiver) {
    return res.status(404).json({ error: "Sender or receiver not found" });
  }

  if (String(sender._id) === String(receiver._id)) {
    return res.status(400).json({ error: "Sender and receiver must be different users" });
  }

  if (sender.walletBalance < txn.amount) {
    return res.status(400).json({ error: "Insufficient balance" });
  }

  await markProcessing(txnId);

  sender.walletBalance -= txn.amount;
  receiver.walletBalance += txn.amount;
  await sender.save();
  await receiver.save();

  const updatedTxn = await updateTransaction(txnId, {
    senderUserId,
    senderName: sender.name,
    senderUpi: sender.upiId,
    status: "success",
    completedAt: new Date(),
    paymentMethod
  });

  res.json({
    status: "success",
    txn: updatedTxn,
    senderBalance: sender.walletBalance,
    receiverBalance: receiver.walletBalance
  });
});

router.get("/history", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  res.json(await getUserTransactions(userId));
});

router.get("/insights/summary", async (req, res) => {
  const { userId } = req.query;
  if (!userId) {
    return res.status(400).json({ error: "userId is required" });
  }

  res.json(await getTransactionInsights(userId));
});

router.get("/:txnId", async (req, res) => {
  const txn = await getTransaction(req.params.txnId);

  if (!txn) {
    return res.status(404).json({ error: "Transaction not found" });
  }

  if (txn.isExpired) {
    return res.status(410).json({ error: "Transaction has expired" });
  }

  res.json({
    txnId: txn.txnId,
    senderUserId: txn.senderUserId,
    senderName: txn.senderName,
    senderUpi: txn.senderUpi,
    receiverUserId: txn.receiverUserId,
    receiverName: txn.receiverName,
    receiverUpi: txn.receiverUpi,
    amount: txn.amount,
    status: txn.status,
    paymentMethod: txn.paymentMethod,
    expiresAt: txn.expiresAt,
    qrConsumedAt: txn.qrConsumedAt,
    timeLeft: getTimeLeftLabel(txn.expiresAt)
  });
});

router.post("/fraud-check", async (req, res) => {
  const { amount, receiverUpi, receiverName } = req.body;
  const hour = new Date().getHours();

  let score = 0;
  const reasons = [];

  if (parseFloat(amount) > 10000) {
    score += 30;
    reasons.push("Large amount");
  }
  if (parseFloat(amount) > 50000) {
    score += 40;
    reasons.push("Very large amount");
  }
  if (hour < 6 || hour > 23) {
    score += 20;
    reasons.push("Unusual time of day");
  }
  if (receiverUpi && receiverUpi.includes("test")) {
    score += 25;
    reasons.push("Suspicious UPI ID");
  }
  if (receiverName && receiverName.length < 3) {
    score += 15;
    reasons.push("Very short name");
  }

  const riskLevel = score <= 30 ? "safe" : score <= 60 ? "warning" : "danger";
  const reason =
    score <= 30
      ? "This payment looks normal. Safe to proceed."
      : score <= 60
        ? `Caution: ${reasons.join(", ")}. Verify the receiver.`
        : `High risk detected: ${reasons.join(", ")}. Do NOT proceed!`;

  res.json({ score, riskLevel, reason });
});

module.exports = router;
