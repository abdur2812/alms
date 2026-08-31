const mongoose = require("mongoose");

// Monthly stock snapshot per product — frozen qty*price at month end.
// Used by GET /api/accounts/report for O(1) opening/closing lookup instead
// of reconstructing from Invoice aggregates every time.
const stockSnapshotSchema = new mongoose.Schema(
  {
    month: {
      type: String, // YYYY-MM
      required: true,
      match: [/^\d{4}-\d{2}$/, "Month must be YYYY-MM"],
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: true,
    },
    productName: {
      type: String,
      trim: true,
    },
    qty: {
      type: Number,
      required: true,
      min: 0,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
  },
  { timestamps: true },
);

stockSnapshotSchema.index({ month: 1, productId: 1 }, { unique: true });
stockSnapshotSchema.index({ month: 1 });

module.exports = mongoose.model("StockSnapshot", stockSnapshotSchema);
