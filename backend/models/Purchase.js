const mongoose = require("mongoose");

// A purchase invoice — money going out to a vendor.
// Includes optional cheque/payment tracking.
const purchaseSchema = new mongoose.Schema(
  {
    // Auto-generated sequential number for this purchase entry (e.g. PUR-0001).
    purchaseNumber: {
      type: String,
      unique: true,
      required: true,
    },
    // The vendor's own invoice number for this purchase (manual entry).
    invoiceNumber: {
      type: String,
      required: [true, "Vendor invoice number is required"],
      trim: true,
    },
    vendorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Vendor",
      default: null,
    },
    date: {
      type: Date,
      required: [true, "Purchase date is required"],
      default: Date.now,
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    chequeDetails: {
      type: String,
      trim: true,
      default: "",
    },
    chequeAmount: {
      type: Number,
      default: 0,
      min: [0, "Cheque amount cannot be negative"],
    },
    chequeStatus: {
      type: String,
      enum: ["Pending", "Cleared", "Bounced"],
      default: "Pending",
    },
    passedDate: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  },
);

purchaseSchema.index({ date: -1 });
purchaseSchema.index({ vendorId: 1, date: -1 });
purchaseSchema.index({ invoiceNumber: 1 });
// purchaseNumber already unique via unique:true
purchaseSchema.index({ chequeStatus: 1, date: -1 });

purchaseSchema.set("toJSON", { virtuals: true });
purchaseSchema.set("toObject", { virtuals: true });

const findMaxPurchaseSequence = async (PurchaseModel) => {
  const purchases = await PurchaseModel.find({
    purchaseNumber: { $regex: /^PUR-\d{4}$/ },
  })
    .select("purchaseNumber")
    .lean();

  let dbMax = 0;
  for (const p of purchases) {
    const m = p.purchaseNumber.match(/^PUR-(\d{4})$/);
    if (m) dbMax = Math.max(dbMax, Number(m[1]));
  }

  return dbMax;
};

// Atomic counter for race-safe purchase number generation (PUR-0001).
purchaseSchema.statics.generatePurchaseNumber = async function () {
  const Counter = mongoose.model("Counter");
  const counterId = "pur";

  let result = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: 1 } },
    { new: true },
  );

  if (!result) {
    // Initialise from existing purchase numbers in the DB.
    const dbMax = await findMaxPurchaseSequence(this);

    await Counter.findOneAndUpdate(
      { _id: counterId },
      { $setOnInsert: { sequence: dbMax } },
      { upsert: true },
    );

    result = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence: 1 } },
      { new: true },
    );
  }

  return `PUR-${String(result.sequence).padStart(4, "0")}`;
};

// Read-only preview of the next purchase number.
purchaseSchema.statics.peekNextPurchaseNumber = async function () {
  const Counter = mongoose.model("Counter");
  const counterId = "pur";

  const counter = await Counter.findById(counterId).lean();
  if (counter && Number.isFinite(counter.sequence)) {
    return `PUR-${String(counter.sequence + 1).padStart(4, "0")}`;
  }

  const dbMax = await findMaxPurchaseSequence(this);

  return `PUR-${String(dbMax + 1).padStart(4, "0")}`;
};

// Resync counter after purchase deletion so the next create reuses gaps.
purchaseSchema.statics.syncCounterAfterDelete = async function () {
  const Counter = mongoose.model("Counter");
  const dbMax = await findMaxPurchaseSequence(this);
  await Counter.findOneAndUpdate(
    { _id: "pur" },
    { $set: { sequence: dbMax } },
    { upsert: true },
  );
};

module.exports = mongoose.model("Purchase", purchaseSchema);