const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");

require("dotenv").config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
connectDB();

const paymentRoutes = require("./routes/payment");
const statusRoutes = require("./routes/status");
const walletRoutes = require("./wallet");
const userRoutes = require("./routes/user");
const { initBluetooth } = require("./bluetooth");

// ✅ CREATE APP FIRST
const app = express();
const server = http.createServer(app);

// ✅ SOCKET.IO
const io = new Server(server, {
  cors: { origin: "*" }
});

// ✅ MIDDLEWARE
app.use(cors());
app.use(express.json());

// ✅ SERVE FRONTEND
app.use(express.static(path.join(__dirname, "../frontend")));

// ✅ ROUTES
app.use("/api/payment", paymentRoutes);
app.use("/api/status", statusRoutes);
app.use("/api/wallet", walletRoutes);
app.use("/api/user", userRoutes);

// ✅ DEFAULT ROUTE
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// ✅ BLUETOOTH
initBluetooth(io);

// ✅ PORT
const PORT = process.env.PORT || 3000;

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
