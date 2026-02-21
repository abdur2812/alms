const express = require("express");
const mongoose = require("mongoose");
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

// CORS middleware (optional)
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header(
    "Access-Control-Allow-Methods",
    "GET, POST, PUT, PATCH, DELETE, OPTIONS",
  );
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

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
    message: "ERP Billing System API",
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

// add customer changes:
// permanent address
// delivery address

// customer changes:
// need a separate field for shipping address.

// invoice edit changes:
// able to edit customer, product details

// invoice create changes:
// when creating invoice, give option to select if address(shipping address in invoice) is same as permanent address.

// bulk invoice pdf (new functionality):
// invoice id, cust name, cust gst, cust phone, amount separated by cgst sgst, credit or paid. (this is the format)
