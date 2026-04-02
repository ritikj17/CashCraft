const express = require("express");
const router = express.Router();

// Simple in-memory wallet store
let wallets = {};

// Create wallet
router.post("/create", (req, res) => {
  const { userId } = req.body;

  if (!userId) return res.status(400).json({ error: "userId required" });

  if (!wallets[userId]) {
    wallets[userId] = { balance: 0 };
  }

  res.json({ message: "Wallet created", wallet: wallets[userId] });
});

// Add money (max 2000)
router.post("/add-money", (req, res) => {
  const { userId, amount } = req.body;

  if (!wallets[userId]) {
    return res.status(404).json({ error: "Wallet not found" });
  }

  if (wallets[userId].balance + amount > 2000) {
    return res.json({ error: "Max wallet limit is ₹2000" });
  }

  wallets[userId].balance += amount;

  res.json({
    message: "Money added",
    balance: wallets[userId].balance
  });
});

// Pay using wallet (Bluetooth scenario)
router.post("/pay", (req, res) => {
  const { userId, amount } = req.body;

  if (!wallets[userId]) {
    return res.status(404).json({ error: "Wallet not found" });
  }

  if (wallets[userId].balance < amount) {
    return res.json({ error: "Insufficient balance" });
  }

  wallets[userId].balance -= amount;

  res.json({
    message: "Payment successful (offline)",
    remainingBalance: wallets[userId].balance
  });
});

// Check balance
router.get("/:userId", (req, res) => {
  const wallet = wallets[req.params.userId];
  if (!wallet) return res.status(404).json({ error: "Wallet not found" });

  res.json(wallet);
});

module.exports = router;