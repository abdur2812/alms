const mongoose = require("mongoose");

// One daily salary payment per staff per day (UTC midnight).
// Created when a specific day's wage is settled; deleting it marks unpaid.
const staffDailyPaymentSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Staff reference is required"],
    },
    date: {
      type: Date,
      required: [true, "Payment date is required"],
    },
    amount: {
      type: Number,
      required: [true, "Payment amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    status: {
      type: String,
      enum: ["present", "half", "absent"],
      default: "present",
    },
    paidAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

// One payment per staff per day (dates stored as UTC midnight)
staffDailyPaymentSchema.index({ staffId: 1, date: 1 }, { unique: true });
staffDailyPaymentSchema.index({ date: 1 });
staffDailyPaymentSchema.index({ paidAt: 1 });

staffDailyPaymentSchema.set("toJSON", { virtuals: true });
staffDailyPaymentSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("StaffDailyPayment", staffDailyPaymentSchema);
