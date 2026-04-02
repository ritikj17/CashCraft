const express = require("express");
const router = express.Router();
const User = require("./models/User");

// GET BALANCE
router.get("/:userId", async (req, res) => {
  const user = await User.findById(req.params.userId);
  if (!user) return res.json({ error: "User not found" });

  res.json({ balance: user.walletBalance });
});

// ADD MONEY
router.post("/add-money", async (req, res) => {
  const { userId, amount } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });

  user.walletBalance += amount;
  await user.save();

  res.json({ balance: user.walletBalance });
});

// PAY
router.post("/pay", async (req, res) => {
  const { userId, amount } = req.body;

  const user = await User.findById(userId);
  if (!user) return res.json({ error: "User not found" });

  if (user.walletBalance < amount) {
    return res.json({ error: "Insufficient balance" });
  }

  user.walletBalance -= amount;
  await user.save();

  res.json({ remainingBalance: user.walletBalance });
});

module.exports = router;