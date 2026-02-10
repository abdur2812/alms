const express = require("express");
const mongoose = require("mongoose");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const customerRoutes = require("./routes/customerRoutes");
const productRoutes = require("./routes/productRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const shopRoutes = require("./routes/shopRoutes");

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
  res.header(
    "Access-Control-Allow-Headers",
    "Content-Type, Authorization, X-Shop-Id",
  );

  // Handle preflight requests
  if (req.method === "OPTIONS") {
    res.sendStatus(200);
    return;
  }

  next();
});

// Database connection
const MONGODB_URI =
  process.env.MONGODB_URI || "mongodb://localhost:27017/erp_billing";

mongoose
  .connect(MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected successfully");

    // Fix Product indexes for multi-tenancy
    try {
      const Product = require("./models/Product");

      // Get all indexes
      const indexes = await Product.collection.getIndexes();
      console.log("Current indexes:", Object.keys(indexes));

      // Drop the problematic single sku index if it exists
      for (const indexName of Object.keys(indexes)) {
        if (indexName === "sku_1") {
          console.log("🔧 Dropping old unique sku index...");
          await Product.collection.dropIndex(indexName);
          console.log("✅ Old unique sku index dropped");
        }
      }

      // Ensure the compound index exists with the correct name
      try {
        await Product.collection.createIndex(
          { sku: 1, shopId: 1 },
          { unique: true, name: "sku_shopId_unique" },
        );
        console.log("✅ Compound unique index (sku + shopId) created");
      } catch (err) {
        if (err.code === 85) {
          console.log("ℹ️  Compound index already exists");
        } else {
          console.log("ℹ️  Index error:", err.message);
        }
      }
    } catch (error) {
      console.log("ℹ️  Index management error:", error.message);
    }
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
      shops: "/api/shops",
    },
  });
});

// API Routes
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/shops", shopRoutes);

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
