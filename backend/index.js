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
const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/test";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected successfully");
  })
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// Root route
app.get("/", (req, res) => {
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
