// Shared utilities for PayNearBy

function formatINR(amount) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0
  }).format(Number(amount) || 0);
}

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

function isValidUPI(upiId) {
  return /^[\w.\-]+@[\w]+$/.test(upiId);
}

function getCurrentUserId() {
  const stored = localStorage.getItem("userId");
  if (!stored || stored === "null" || stored === "undefined") {
    localStorage.removeItem("userId");
    return null;
  }
  return stored;
}

function requireLogin(redirectTo = "login.html") {
  if (!getCurrentUserId()) {
    window.location.href = redirectTo;
    return false;
  }

  return true;
}

function logout() {
  localStorage.removeItem("userId");
  window.location.href = "login.html";
}

function supportsQrDetector() {
  return "BarcodeDetector" in window;
}

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll("input").forEach(input => {
    input.addEventListener("blur", () => {
      if (input.value.trim()) {
        input.style.borderColor = "var(--success)";
      }
    });
  });

  document.querySelectorAll("[data-logout]").forEach(button => {
    button.addEventListener("click", logout);
  });
});
