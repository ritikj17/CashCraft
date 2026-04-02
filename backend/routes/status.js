const express = require("express");
const router = express.Router();

router.get("/health", (req, res) => {
  res.json({
    status: "online",
    service: "Offline UPI Bluetooth",
    time: new Date().toISOString(),
    bluetooth: "simulated-ble"
  });
});

module.exports = router;