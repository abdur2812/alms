const mongoose = require("mongoose");

// A GST HSN (Harmonised System of Nomenclature) code selectable on invoices.
const hsnSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, "HSN code is required"],
      trim: true,
      unique: true,
      uppercase: true,
    },
    description: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

hsnSchema.set("toJSON", { virtuals: true });
hsnSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Hsn", hsnSchema);