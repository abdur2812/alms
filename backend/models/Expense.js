const mongoose = require("mongoose");

// A general business expense (rent, utilities, etc.) that is not part of a
// purchase invoice or a staff salary payment.
const expenseSchema = new mongoose.Schema(
  {
    date: {
      type: Date,
      required: [true, "Expense date is required"],
      default: Date.now,
    },
    description: {
      type: String,
      required: [true, "Expense description is required"],
      trim: true,
    },
    category: {
      type: String,
      required: [true, "Expense category is required"],
      trim: true,
      default: "Miscellaneous",
    },
    amount: {
      type: Number,
      required: [true, "Amount is required"],
      min: [0, "Amount cannot be negative"],
    },
    paidBy: {
      type: String,
      trim: true,
      default: "Cash",
    },
  },
  {
    timestamps: true,
  },
);

expenseSchema.index({ date: -1 });
expenseSchema.index({ category: 1, date: -1 });

expenseSchema.set("toJSON", { virtuals: true });
expenseSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Expense", expenseSchema);