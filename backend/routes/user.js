const express = require("express");
const router = express.Router();
const User = require("../models/usermodel");

// CREATE / LOGIN USER
router.post("/create", async (req, res) => {
  const { name, upiId } = req.body;

  let user = await User.findOne({ upiId });

  if (!user) {
    user = await User.create({ name, upiId });
  }

  res.json(user);
});

module.exports = router;