const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;

    if (!mongoUri || mongoUri === "your_mongodb_connection_string") {
      throw new Error(
        "Missing MONGO_URI in backend/.env. Add a real MongoDB connection string before starting the server."
      );
    }

    await mongoose.connect(mongoUri);
    console.log("✅ MongoDB Connected");
  } catch (err) {
    console.log("❌ DB Error:", err);
    process.exit(1);
  }
};

module.exports = connectDB;
