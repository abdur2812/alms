const mongoose = require("mongoose");

const expenseCategorySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Category name is required"],
      trim: true,
      unique: true,
      minlength: [2, "Category name must be at least 2 characters"],
    },
    description: {
      type: String,
      trim: true,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

expenseCategorySchema.set("toJSON", { virtuals: true });
expenseCategorySchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("ExpenseCategory", expenseCategorySchema);
