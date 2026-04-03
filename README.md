# PayNearBy

PayNearBy is a Node.js + Express + Socket.IO project for nearby offline-style UPI request and payment flows using QR codes, transaction IDs, and simulated Bluetooth discovery.

## Features

- Receiver creates a payment request with amount, QR code, and unique transaction ID
- Sender pays by scanning QR, entering transaction ID, or selecting a nearby Bluetooth request
- Wallet balances update between sender and receiver
- MongoDB stores users and transactions
- Dashboard includes AI insights and transaction history

## Tech Stack

- Node.js
- Express
- Socket.IO
- MongoDB with Mongoose
- Plain HTML, CSS, and JavaScript frontend

## Local Setup

1. Install dependencies:

```bash
npm install
```

2. Create your environment file:

```powershell
Copy-Item .env.example backend\.env
```

3. Put your MongoDB connection string in `backend/.env`:

```env
MONGO_URI=your_mongodb_connection_string
```

4. Start the app:

```bash
npm start
```

5. Open `http://localhost:3000`

## Important Files

- `backend/server.js` - app entry point
- `backend/routes/payment.js` - request, verify, and complete payment APIs
- `backend/wallet.js` - wallet balance APIs
- `backend/transaction.js` - transaction data access
- `frontend/index.html` - dashboard
- `frontend/send.html` - sender flow
- `frontend/receive.html` - receiver flow

## Deploying To Railway

1. Create a new Railway project
2. Choose `Deploy from GitHub repo`
3. Select this repository
4. In Railway Variables, add:

```env
MONGO_URI=your_mongodb_connection_string
```

5. Railway should detect the app automatically and use the `start` script from `package.json`
6. After deployment, generate a public domain for the service

## Notes

- Do not commit your real `.env`
- `node_modules` is intentionally ignored
- For Railway, use service variables instead of storing secrets in the repo
