const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

const paymentRoutes = require("./routes/payment");
const statusRoutes = require("./routes/status");
const { initBluetooth } = require("./bluetooth");

const app = express();
const server = http.createServer(app);
const walletRoutes = require("./wallet");

require("dotenv").config();
const connectDB = require("./config/db");
connectDB();

const userRoutes = require("./routes/user");
app.use("/api/user", userRoutes);

const io = new Server(server, {
  cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ API Routes (FIXED)
app.use("/api/payment", paymentRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/wallet", walletRoutes);


// ❌ REMOVED duplicate route

// Socket.IO — Bluetooth simulation layer
initBluetooth(io);

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
});