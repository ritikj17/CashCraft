const transactions = {};

function createTransaction({ txnId, upiId, amount, name, receiverUpi, receiverName }) {
  const txn = {
    txnId,
    senderUpi: upiId,
    senderName: name,
    receiverUpi,
    receiverName,
    amount: parseFloat(amount),
    status: "processing",
    timestamp: new Date().toISOString(),
    channel: "bluetooth-offline"
  };
  transactions[txnId] = txn;
  return txn;
}

function getTransaction(txnId) {
  return transactions[txnId] || null;
}

function updateStatus(txnId, status) {
  if (transactions[txnId]) {
    transactions[txnId].status = status;
    transactions[txnId].completedAt = new Date().toISOString();
  }
}

function getAllTransactions() {
  return Object.values(transactions).sort(
    (a, b) => new Date(b.timestamp) - new Date(a.timestamp)
  );
}

module.exports = { createTransaction, getTransaction, updateStatus, getAllTransactions };