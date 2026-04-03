const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: String,
  upiId: String,
  walletBalance: {
    type: Number,
    default: 0
  }
});

userSchema.index({ name: 1, upiId: 1 }, { unique: true });

module.exports = mongoose.model("User", userSchema);
