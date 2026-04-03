const Transaction = require("./models/transactionModel");

function normalizeTransaction(txn) {
  if (!txn) return null;

  const data = typeof txn.toObject === "function" ? txn.toObject() : txn;
  return {
    ...data,
    timestamp: data.createdAt,
    isExpired: Boolean(data.expiresAt && new Date(data.expiresAt).getTime() <= Date.now())
  };
}

function getTimeLeftLabel(expiresAt) {
  if (!expiresAt) return "Unavailable";

  const msLeft = new Date(expiresAt).getTime() - Date.now();
  if (msLeft <= 0) return "Expired";

  const totalSeconds = Math.floor(msLeft / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}m ${seconds}s`;
}

async function createPaymentRequest({
  txnId,
  receiverUserId,
  receiverName,
  receiverUpi,
  amount,
  expiresAt,
  qrHash
}) {
  const txn = await Transaction.findOneAndUpdate(
    { txnId },
    {
      txnId,
      receiverUserId,
      receiverName,
      receiverUpi,
      amount: parseFloat(amount),
      status: "pending",
      channel: "bluetooth-offline",
      qrHash,
      expiresAt: new Date(expiresAt),
      qrConsumedAt: null,
      createdAt: new Date(),
      completedAt: null,
      senderUserId: null,
      senderUpi: null,
      senderName: null,
      paymentMethod: null
    },
    {
      new: true,
      upsert: true,
      setDefaultsOnInsert: true
    }
  );

  return normalizeTransaction(txn);
}

async function expireTransaction(txnId) {
  const txn = await Transaction.findOneAndUpdate(
    { txnId },
    { status: "expired" },
    { new: true }
  ).lean();

  return normalizeTransaction(txn);
}

async function getTransaction(txnId) {
  const txn = normalizeTransaction(await Transaction.findOne({ txnId }).lean());

  if (!txn) return null;

  if (txn.isExpired && !["success", "failed", "expired"].includes(txn.status)) {
    return expireTransaction(txnId);
  }

  return txn;
}

async function markQrScanned(txnId) {
  const txn = await Transaction.findOneAndUpdate(
    { txnId, qrConsumedAt: null },
    {
      qrConsumedAt: new Date(),
      status: "scanned"
    },
    { new: true }
  ).lean();

  return normalizeTransaction(txn);
}

async function markProcessing(txnId) {
  const txn = await Transaction.findOneAndUpdate(
    { txnId },
    { status: "processing" },
    { new: true }
  ).lean();

  return normalizeTransaction(txn);
}

async function updateTransaction(txnId, fields) {
  const txn = await Transaction.findOneAndUpdate(
    { txnId },
    fields,
    { new: true }
  ).lean();

  return normalizeTransaction(txn);
}

async function getUserTransactions(userId) {
  const txns = await Transaction.find({
    $or: [{ senderUserId: userId }, { receiverUserId: userId }]
  })
    .sort({ createdAt: -1 })
    .lean();

  return txns.map(normalizeTransaction);
}

async function getTransactionInsights(userId) {
  const query = userId
    ? { $or: [{ senderUserId: userId }, { receiverUserId: userId }] }
    : {};
  const txns = await Transaction.find(query).sort({ createdAt: 1 }).lean();
  const successful = txns.filter((txn) => txn.status === "success");
  const failed = txns.filter((txn) => txn.status === "failed");
  const totalVolume = successful.reduce((sum, txn) => sum + txn.amount, 0);
  const totalProcessed = txns.reduce((sum, txn) => sum + txn.amount, 0);

  const dailyMap = new Map();
  const counterpartyMap = new Map();
  const statusMap = new Map();

  txns.forEach((txn) => {
    const dayKey = new Date(txn.createdAt).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short"
    });

    dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + txn.amount);
    const label = txn.senderUserId === userId ? txn.receiverName : txn.senderName || txn.receiverName;
    counterpartyMap.set(label, (counterpartyMap.get(label) || 0) + txn.amount);
    statusMap.set(txn.status, (statusMap.get(txn.status) || 0) + 1);
  });

  const topParties = Array.from(counterpartyMap.entries())
    .map(([name, amount]) => ({ name, amount }))
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);

  const volumeTrend = Array.from(dailyMap.entries()).map(([label, amount]) => ({
    label,
    amount
  }));

  const statusBreakdown = ["success", "processing", "pending", "scanned", "failed", "expired"].map((status) => ({
    status,
    count: statusMap.get(status) || 0
  }));

  const avgTicket = successful.length ? Math.round(totalVolume / successful.length) : 0;
  const successRate = txns.length ? Math.round((successful.length / txns.length) * 100) : 0;
  const riskLevel = failed.length > successful.length / 3 ? "Elevated" : "Normal";

  return {
    summary: {
      totalTransactions: txns.length,
      totalVolume,
      totalProcessed,
      avgTicket,
      successRate,
      riskLevel
    },
    topParties,
    volumeTrend,
    statusBreakdown,
    highlights: [
      `${successRate}% of your transactions completed successfully.`,
      avgTicket ? `Average successful payment is Rs ${avgTicket}.` : "No successful payments yet.",
      topParties[0]
        ? `${topParties[0].name} is your top payment counterparty so far.`
        : "More transactions are needed for personalized insights."
    ]
  };
}

module.exports = {
  createPaymentRequest,
  expireTransaction,
  getTimeLeftLabel,
  getTransaction,
  getTransactionInsights,
  getUserTransactions,
  markProcessing,
  markQrScanned,
  updateTransaction
};
