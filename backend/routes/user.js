const express = require("express");
const mongoose = require("mongoose");
const router = express.Router();
const User = require("../models/userModel");

router.post("/create", async (req, res) => {
  const { name, upiId } = req.body;

  let user = await User.findOne({ name, upiId });

  if (!user) {
    user = await User.create({ name, upiId });
  }

  res.json(user);
});

router.get("/:userId", async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId === "null" || userId === "undefined" || !mongoose.Types.ObjectId.isValid(userId)) {
    return res.status(400).json({ error: "Invalid user id" });
  }

  const user = await User.findById(userId);

  if (!user) {
    return res.status(404).json({ error: "User not found" });
  }

  res.json(user);
});

module.exports = router;
