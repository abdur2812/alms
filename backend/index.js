const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
const compression = require("compression");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Import routes
const customerRoutes = require("./routes/customerRoutes");
const productRoutes = require("./routes/productRoutes");
const invoiceRoutes = require("./routes/invoiceRoutes");
const staffRoutes = require("./routes/staffRoutes");
const vendorRoutes = require("./routes/vendorRoutes");
const purchaseRoutes = require("./routes/purchaseRoutes");
const hsnRoutes = require("./routes/hsnRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const expenseCategoryRoutes = require("./routes/expenseCategoryRoutes");
const accountRoutes = require("./routes/accountRoutes");
require("./models/Counter");

const { errorHandler } = require("./middleware/errorHandler");

// --- Hardening for 512 MB + single-user + Free Tier ---

// Compression: cuts JSON size 70-80% (3k products ~1.5MB -> 300KB) for 512 MB + slow network
app.use(compression({ threshold: 1024 }));

// Body limits: cap at 500KB to avoid OOM from giant JSON (bulk max 500 items fits)
app.use(express.json({ limit: "500kb" }));
app.use(express.urlencoded({ extended: true, limit: "500kb" }));

// Request timeout (30s) - kill hung aggregations so they don't leak memory
app.use((req, res, next) => {
  req.setTimeout(30000, () => {
    if (!res.headersSent) res.status(503).json({ success: false, message: "Request timed out" });
  });
  res.setTimeout(30000);
  next();
});

// Simple in-memory rate limiter: 120 req/min per IP (single user never hits, but blocks abuse)
const rateMap = new Map();
const RATE_WINDOW_MS = 60_000;
const RATE_MAX = 120;
app.use((req, res, next) => {
  const ip = req.ip || req.connection.remoteAddress || "unknown";
  const now = Date.now();
  let entry = rateMap.get(ip);
  if (!entry || now - entry.start > RATE_WINDOW_MS) {
    entry = { start: now, count: 1 };
    rateMap.set(ip, entry);
    return next();
  }
  entry.count += 1;
  if (entry.count > RATE_MAX) {
    return res.status(429).json({ success: false, message: "Too many requests, please slow down" });
  }
  next();
});
// Periodic cleanup to avoid map leak
setInterval(() => {
  const now = Date.now();
  for (const [k, v] of rateMap) if (now - v.start > RATE_WINDOW_MS) rateMap.delete(k);
}, RATE_WINDOW_MS).unref();

// CORS
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With", "Accept"],
    credentials: false,
    optionsSuccessStatus: 200,
  })
);

// Graceful shutdown tracking
let server;

// Database connection - tuned for 512 MB
const MONGODB_URI = process.env.MONGODB_URI;
mongoose.set("bufferCommands", false);
mongoose.set("strictQuery", true);

async function startServer() {
  try {
    await mongoose.connect(MONGODB_URI, {
      readPreference: "primary",
      readConcern: { level: "majority" },
      writeConcern: { w: "majority" },
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 20000,
      maxPoolSize: 8, // low pool for 512 MB
      minPoolSize: 2,
      maxIdleTimeMS: 30000,
    });
    console.log("✅ MongoDB connected successfully");

    try {
      const { seedDefaults } = require("./controllers/expenseCategoryController");
      await seedDefaults();
      console.log("✅ Expense categories seeded");
    } catch (e) {
      console.warn("⚠️ Expense category seeding skipped:", e.message);
    }

    // One-time backfill of missing product serialNo (not per-request) - O(n) once
    try {
      const { backfillMissingSerialNumbers } = require("./controllers/productController");
      const n = await backfillMissingSerialNumbers();
      if (n > 0) console.log(`✅ Backfilled ${n} product serial numbers`);
    } catch (e) {
      console.warn("⚠️ Serial backfill skipped:", e.message);
    }

    // Ensure indexes in background (non-blocking)
    try {
      const Product = require("./models/Product");
      const Invoice = require("./models/Invoice");
      const Customer = require("./models/Customer");
      const Purchase = require("./models/Purchase");
      const Expense = require("./models/Expense");
      // fire-and-forget with timeout guard
      Promise.all([
        Product.syncIndexes().catch(() => {}),
        Invoice.syncIndexes().catch(() => {}),
        Customer.syncIndexes().catch(() => {}),
        Purchase.syncIndexes().catch(() => {}),
        Expense.syncIndexes().catch(() => {}),
      ]).then(() => console.log("✅ Indexes synced"));
    } catch (_) {}

    server = app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT} (512MB-tuned)`);
    });

    // Keep-alive tuning for low memory
    server.keepAliveTimeout = 65000;
    server.headersTimeout = 66000;
    server.timeout = 30000;
    server.requestTimeout = 30000;
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}

startServer();

// Root routes (before 404)
const apiInfo = (req, res) => {
  res.json({
    success: true,
    message: "AL M.S. TRADERS Billing System API",
    version: "1.0.0",
    endpoints: {
      customers: "/api/customers",
      products: "/api/products",
      invoices: "/api/invoices",
      staff: "/api/staff",
      vendors: "/api/vendors",
      purchases: "/api/purchases",
      hsns: "/api/hsns",
      expenses: "/api/expenses",
      expenseCategories: "/api/expense-categories",
      accounts: "/api/accounts/summary",
    },
  });
};
app.get("/", apiInfo);
app.get("/api", apiInfo);

// Health check with memory + DB state
app.get("/api/health", (req, res) => {
  const uri = process.env.MONGODB_URI || "";
  const isAtlas = uri.includes("mongodb+srv");
  const mem = process.memoryUsage();
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    dbType: isAtlas ? "Atlas" : "Local",
    dbHost: uri ? uri.replace(/:\/\/.*@/, "://***@") : "unknown",
    uptime: process.uptime(),
    memory: {
      rss: Math.round(mem.rss / 1024 / 1024) + " MB",
      heapUsed: Math.round(mem.heapUsed / 1024 / 1024) + " MB",
      heapTotal: Math.round(mem.heapTotal / 1024 / 1024) + " MB",
      external: Math.round(mem.external / 1024 / 1024) + " MB",
    },
  });
});

// Lightweight ping for uptime monitors
app.get("/api/ping", (req, res) => res.json({ ok: true, ts: Date.now() }));

// API Routes - must be before 404
app.use("/api/customers", customerRoutes);
app.use("/api/products", productRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/staff", staffRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/api/purchases", purchaseRoutes);
app.use("/api/hsns", hsnRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/expense-categories", expenseCategoryRoutes);
app.use("/api/accounts", accountRoutes);

// 404 handler
app.use((req, res, next) => {
  res.status(404).json({ success: false, message: `Route ${req.originalUrl} not found` });
});

// Error handling middleware (must be last)
app.use(errorHandler);

// Global crash guards
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});
process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
  // Keep process alive for single-user, log only; don't crash on 512 MB
});

function gracefulShutdown(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  if (server) {
    server.close(async () => {
      try {
        await mongoose.connection.close();
        console.log("✅ MongoDB disconnected, shutdown complete");
        process.exit(0);
      } catch (e) {
        console.error("Error during shutdown:", e.message);
        process.exit(1);
      }
    });
    // Force close after 10s
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10000).unref();
  } else {
    mongoose.connection.close().finally(() => process.exit(0));
  }
}
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));
