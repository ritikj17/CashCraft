const express = require("express");
const router = express.Router();
const { v4: uuidv4 } = require("uuid");
const QRCode = require("qrcode");
const crypto = require("crypto");
const { getAllTransactions, getTransaction } = require("../transaction");

// Secret key for hashing — keeps QR tamper-proof
const SECRET_KEY = "paynearby-fin-o-hack-2026";

// Generate secure hash for QR verification
function generateHash(txnId, upiId, amount, expiry) {
  return crypto
    .createHmac("sha256", SECRET_KEY)
    .update(`${txnId}|${upiId}|${amount}|${expiry}`)
    .digest("hex")
    .substring(0, 16); // short hash
}

// POST /api/payment/create
router.post("/create", async (req, res) => {
  const { upiId, amount, name } = req.body;

  if (!upiId || !amount || !name) {
    return res.status(400).json({ error: "upiId, amount, name are required" });
  }

  // Unique transaction ID
  const txnId = "TXN-" + uuidv4().substring(0, 6).toUpperCase();

  // Expiry = 5 minutes from now
  const createdAt = Date.now();
  const expiresAt = createdAt + 5 * 60 * 1000;

  // Tamper-proof hash
  const hash = generateHash(txnId, upiId, amount, expiresAt);

  // QR data — all info packed into one string
  const qrData = JSON.stringify({
    txnId,
    upiId,
    name,
    amount: parseFloat(amount),
    createdAt,
    expiresAt,
    hash,
    app: "PayNearby"
  });

  try {
    // Generate QR with custom styling
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
      qrDataUrl,
      qrData,
      expiresAt,
      expiresIn: "5 minutes",
      hash
    });

  } catch (err) {
    res.status(500).json({ error: "QR generation failed" });
  }
});

// POST /api/payment/verify-qr — verify scanned QR is valid
router.post("/verify-qr", (req, res) => {
  const { qrData } = req.body;

  try {
    const parsed = JSON.parse(qrData);
    const { txnId, upiId, amount, expiresAt, hash } = parsed;

    // Check 1: Is QR expired?
    if (Date.now() > expiresAt) {
      return res.json({
        valid: false,
        reason: "QR code has expired. Ask sender to generate a new one.",
        riskLevel: "expired"
      });
    }

    // Check 2: Is hash valid? (tamper check)
    const expectedHash = generateHash(txnId, upiId, amount, expiresAt);
    if (hash !== expectedHash) {
      return res.json({
        valid: false,
        reason: "QR code has been tampered with. Do not proceed!",
        riskLevel: "danger"
      });
    }

    // Check 3: Time remaining
    const timeLeft = Math.floor((expiresAt - Date.now()) / 1000);
    const minutesLeft = Math.floor(timeLeft / 60);
    const secondsLeft = timeLeft % 60;

    res.json({
      valid: true,
      txnId,
      upiId,
      name: parsed.name,
      amount,
      timeLeft: `${minutesLeft}m ${secondsLeft}s`,
      riskLevel: "safe"
    });

  } catch (err) {
    res.json({
      valid: false,
      reason: "Invalid QR code format.",
      riskLevel: "danger"
    });
  }
});

// GET /api/payment/history
router.get("/history", (req, res) => {
  res.json(getAllTransactions());
});

// GET /api/payment/:txnId
router.get("/:txnId", (req, res) => {
  const txn = getTransaction(req.params.txnId);
  if (!txn) return res.status(404).json({ error: "Transaction not found" });
  res.json(txn);
});
// POST /api/ai/fraud-check
router.post("/fraud-check", async (req, res) => {
  const { amount, receiverUpi, receiverName, senderUpi, txnId } = req.body;
  const hour = new Date().getHours();

  // Simple rule-based scoring (no API key needed)
  let score = 0;
  let reasons = [];

  if (parseFloat(amount) > 10000) { score += 30; reasons.push("Large amount"); }
  if (parseFloat(amount) > 50000) { score += 40; reasons.push("Very large amount"); }
  if (hour < 6 || hour > 23) { score += 20; reasons.push("Unusual time of day"); }
  if (receiverUpi && receiverUpi.includes("test")) { score += 25; reasons.push("Suspicious UPI ID"); }
  if (receiverName && receiverName.length < 3) { score += 15; reasons.push("Very short name"); }

  let riskLevel = score <= 30 ? "safe" : score <= 60 ? "warning" : "danger";
  let reason = score <= 30
    ? "This payment looks normal. Safe to proceed."
    : score <= 60
    ? `Caution: ${reasons.join(", ")}. Verify the receiver.`
    : `High risk detected: ${reasons.join(", ")}. Do NOT proceed!`;

  res.json({ score, riskLevel, reason });
});

module.exports = router;