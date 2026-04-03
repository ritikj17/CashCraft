const { getTimeLeftLabel, getTransaction } = require("./transaction");

function initBluetooth(io) {
  const rooms = {};

  io.on("connection", (socket) => {
    console.log(`[BT] Device connected: ${socket.id}`);

    socket.on("bt:advertise", (data) => {
      const { txnId, amount, receiverName } = data;
      rooms[txnId] = {
        owner: socket.id,
        requestData: data
      };

      socket.join(txnId);
      socket.emit("bt:advertise:ok", { txnId });
      console.log(`[BT] Advertising request: ${txnId} | Rs ${amount} for ${receiverName}`);
    });

    socket.on("bt:scan", async () => {
      const requests = await Promise.all(
        Object.entries(rooms)
          .filter(([, room]) => !room.sender)
          .map(async ([txnId]) => {
            const txn = await getTransaction(txnId);
            if (!txn || txn.isExpired || txn.status === "success") {
              delete rooms[txnId];
              return null;
            }

            return {
              txnId,
              amount: txn.amount,
              name: txn.receiverName,
              upiId: txn.receiverUpi,
              timeLeft: getTimeLeftLabel(txn.expiresAt)
            };
          })
      );

      const available = requests.filter(Boolean);
      socket.emit("bt:scan:result", available);
      console.log(`[BT] Scan requested, found ${available.length} requests`);
    });

    socket.on("bt:select", async ({ txnId, senderName, senderUpi }) => {
      const room = rooms[txnId];
      const txn = await getTransaction(txnId);

      if (!room || !txn) {
        socket.emit("bt:error", { message: "Payment request not found. Scan again." });
        return;
      }

      if (txn.isExpired || txn.status === "success") {
        socket.emit("bt:error", { message: "This payment request is no longer available." });
        delete rooms[txnId];
        return;
      }

      rooms[txnId].sender = socket.id;
      socket.join(txnId);

      socket.emit("bt:selected", {
        txnId,
        receiverName: txn.receiverName,
        receiverUpi: txn.receiverUpi,
        amount: txn.amount,
        timeLeft: getTimeLeftLabel(txn.expiresAt)
      });

      io.to(room.owner).emit("bt:sender:connected", {
        txnId,
        senderName,
        senderUpi
      });
    });

    socket.on("bt:payment:update", async ({ txnId }) => {
      const room = rooms[txnId];
      const txn = await getTransaction(txnId);

      if (!room || !txn) return;

      io.to(txnId).emit("bt:pay:result", {
        txnId,
        status: txn.status,
        txn
      });

      if (txn.status === "success" || txn.isExpired) {
        delete rooms[txnId];
      }
    });

    socket.on("disconnect", () => {
      Object.entries(rooms).forEach(([txnId, room]) => {
        if (room.owner === socket.id || room.sender === socket.id) {
          io.to(txnId).emit("bt:error", { message: "Other device disconnected." });
          delete rooms[txnId];
        }
      });

      console.log(`[BT] Device disconnected: ${socket.id}`);
    });
  });
}

module.exports = { initBluetooth };
