// Bluetooth simulation layer using Socket.IO
// In production: replace socket events with actual BLE (noble/bleno) calls

const { createTransaction, getTransaction, updateStatus } = require("./transaction");

function initBluetooth(io) {
  const rooms = {}; // roomId -> { sender, receiver }

  io.on("connection", (socket) => {
    console.log(`[BT] Device connected: ${socket.id}`);

    // SENDER creates a payment room (like BT advertising)
    socket.on("bt:advertise", (data) => {
      const { txnId, upiId, amount, name } = data;
      rooms[txnId] = { sender: socket.id, senderData: data };
      socket.join(txnId);
      socket.emit("bt:advertise:ok", { txnId });
      console.log(`[BT] Advertising txn: ${txnId} | ₹${amount} by ${name}`);
    });

    // RECEIVER scans and finds available payments (like BT scan)
    socket.on("bt:scan", () => {
      const available = Object.entries(rooms)
        .filter(([, v]) => !v.receiver)
        .map(([txnId, v]) => ({ txnId, ...v.senderData }));
      socket.emit("bt:scan:result", available);
      console.log(`[BT] Scan requested, found ${available.length} payments`);
    });

    // RECEIVER connects to a payment (like BT pairing)
    socket.on("bt:connect", (data) => {
      const { txnId, receiverUpi, receiverName } = data;
      if (!rooms[txnId]) {
        socket.emit("bt:error", { message: "Payment not found. Re-scan." });
        return;
      }
      rooms[txnId].receiver = socket.id;
      rooms[txnId].receiverData = { receiverUpi, receiverName };
      socket.join(txnId);

      // Notify sender that receiver connected
      io.to(rooms[txnId].sender).emit("bt:receiver:connected", {
        receiverUpi,
        receiverName,
        txnId
      });

      socket.emit("bt:connect:ok", {
        txnId,
        ...rooms[txnId].senderData
      });

      console.log(`[BT] Receiver ${receiverName} connected to txn ${txnId}`);
    });

    // SENDER confirms and initiates payment
// SENDER confirms and initiates payment
socket.on("bt:pay:initiate", (data) => {
  const { txnId } = data;

  const room = rooms[txnId];
  if (!room) return;

  const txn = createTransaction({
    txnId,
    ...room.senderData,
    ...room.receiverData
  });

  // Notify both devices
  io.to(txnId).emit("bt:pay:processing", { txnId, txn });
  console.log(`[BT] Payment processing: ${txnId}`);

  // Simulate success
  setTimeout(() => {
    const success = true;

    updateStatus(txnId, success ? "success" : "failed");

    io.to(txnId).emit("bt:pay:result", {
      txnId,
      status: success ? "success" : "failed",
      txn: getTransaction(txnId)
    });

    delete rooms[txnId];
    console.log(`[BT] Payment SUCCESS: ${txnId}`);
  }, 2000);
});

    // Disconnect cleanup
    socket.on("disconnect", () => {
      Object.entries(rooms).forEach(([txnId, room]) => {
        if (room.sender === socket.id || room.receiver === socket.id) {
          io.to(txnId).emit("bt:error", { message: "Other device disconnected." });
          delete rooms[txnId];
        }
      });
      console.log(`[BT] Device disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initBluetooth };