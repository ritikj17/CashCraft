// Shared utilities for PayNearby

// Format currency
function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0
  }).format(amount);
}

// Show toast notification
function showToast(message, type = "info") {
  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed; bottom: 2rem; left: 50%; transform: translateX(-50%);
    background: ${type === "success" ? "#00d4aa" : type === "error" ? "#ff4757" : "#6c63ff"};
    color: ${type === "success" ? "#0a0a0f" : "white"};
    padding: 0.75rem 1.5rem; border-radius: 30px;
    font-family: 'DM Sans', sans-serif; font-size: 0.88rem;
    z-index: 9999; animation: fadeUp 0.3s ease;
    box-shadow: 0 4px 20px rgba(0,0,0,0.4);
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// Validate UPI ID
function isValidUPI(upiId) {
  return /^[\w.\-]+@[\w]+$/.test(upiId);
}

// ✅ NEW: WALLET PAYMENT FUNCTION
async function sendPayment(amount) {
  try {
    const res = await fetch("/api/wallet/pay", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        userId: "user123", // later you can make dynamic
        amount: amount
      })
    });

    const data = await res.json();

    if (data.error) {
      showToast("❌ " + data.error, "error");
    } else {
      showToast(
        `✅ Payment Successful\nRemaining: ₹${data.remainingBalance}`,
        "success"
      );
    }

  } catch (err) {
    console.error(err);
    showToast("⚠️ Payment failed", "error");
  }
}

// Add input validation styling
document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("blur", () => {
      if (input.value.trim()) {
        input.style.borderColor = "var(--success)";
      }
    });
  });
});