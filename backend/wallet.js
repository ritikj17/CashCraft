const express = require("express");
const router = express.Router();
const User = require("./models/userModel");

const WALLET_LIMIT = 2000;

router.get("/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.json({ error: "User not found" });

  res.json({ balance: user.walletBalance, limit: WALLET_LIMIT });
});

router.post("/add-money", async (req, res) => {
  const { userId, amount } = req.body;
  const numericAmount = Number(amount);

  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.json({ error: "Enter a valid amount" });
  }

  if (user.walletBalance + numericAmount > WALLET_LIMIT) {
    return res.json({ error: `Wallet balance cannot exceed Rs ${WALLET_LIMIT}` });
  }

  user.walletBalance += numericAmount;
  await user.save();

  res.json({ balance: user.walletBalance, limit: WALLET_LIMIT });
});

router.post("/pay", async (req, res) => {
  const { userId, amount } = req.body;
  const numericAmount = Number(amount);

  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });
  if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
    return res.json({ error: "Enter a valid amount" });
  }

  if (user.walletBalance < numericAmount) {
    return res.json({ error: "Insufficient balance" });
  }

  user.walletBalance -= numericAmount;
  await user.save();

  res.json({ remainingBalance: user.walletBalance, debitedAmount: numericAmount, limit: WALLET_LIMIT });
});

module.exports = router;
