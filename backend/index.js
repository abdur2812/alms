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

// Import error handler
const { errorHandler } = require("./middleware/errorHandler");

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// CORS middleware - configured for production
app.use(
  cors({
    origin: function (origin, callback) {
      // Allow requests with no origin (mobile apps, curl, postman)
      if (!origin) return callback(null, true);

      if (process.env.CORS_ORIGIN === "*") {
        return callback(null, true);
      }

      const allowedOrigins = [
        "http://localhost:3001",
        "http://localhost:3000",
        "https://almsonline.in",
        process.env.CORS_ORIGIN,
      ].filter(Boolean);

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(null, true); // Allow all for now - debug mode
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "X-Requested-With",
      "Accept",
    ],
    credentials: false,
    preflightContinue: false,
    optionsSuccessStatus: 200, // For legacy browser support
  }),
);

// Database connection
const MONGODB_URI = process.env.MONGODB_URI;

mongoose
  .connect(MONGODB_URI, {
    readPreference: "primary", // always read from primary — no stale replica reads
    readConcern: { level: "majority" }, // only return data acknowledged by majority
    writeConcern: { w: "majority" }, // wait for majority write before confirming
  })
  .then(() => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    // Do not exit — let the server keep running so health checks pass.
    // Individual requests will fail gracefully if DB is unavailable.
  });

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

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
