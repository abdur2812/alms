const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const customerRoutes = require("./routes/customerRoutes");
const productRoutes = require("./routes/productRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
// Register Counter model before any invoice operations use it
require("./models/Counter");

// Import error handler
const { errorHandler } = require("./middleware/errorHandler");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - allow all origins
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
      "ngrok-skip-browser-warning",
    ],
    credentials: false,
    optionsSuccessStatus: 200,
  }),
);

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;
// Fail fast on bad connections; avoid buffered queries hiding real errors
mongoose.set("bufferCommands", false);

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      readPreference: "primary", // always read from primary — no stale replica reads
      readConcern: { level: "majority" }, // only return data acknowledged by majority
      writeConcern: { w: "majority" }, // wait for majority write before confirming
      serverSelectionTimeoutMS: 10000, // fail fast if DB is unreachable
    });
    console.log("✅ MongoDB connected successfully");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

startServer();

// Root routes
const apiInfo = (req, res) => {
  res.json({
    success: true,
    message: "AL M.S. TRADERS Billing System API",
    version: "1.0.0",
    endpoints: {
      customers: "/api/customers",
      products: "/api/products",
      invoices: "/api/invoices",
    },
  });
};
app.get("/", apiInfo);
app.get("/api", apiInfo);

// Health check — shows DB connection state so you can verify hosted vs local DB
app.get("/api/health", (req, res) => {
  const uri = process.env.MONGODB_URI;
  const isAtlas = uri.includes("mongodb+srv");
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    dbType: isAtlas ? "Atlas" : "Local",
    dbHost: uri.replace(/:\/\/.*@/, "://***@"), // mask credentials
  });
});

// API Routes
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: `Route ${req.originalUrl} not found`,
  });
});

// Error handling middleware (must be last)
app.use(errorHandler);
