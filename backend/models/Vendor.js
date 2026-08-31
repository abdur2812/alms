const mongoose = require("mongoose");

// A supplier/vendor that the shop buys stock from.
const vendorSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Vendor name is required"],
      trim: true,
    },
    phone: {
      type: String,
      trim: true,
    },
    address: {
      type: String,
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
      default: "",
    },
    bankDetails: {
      accountHolder: { type: String, trim: true, default: "" },
      bankName: { type: String, trim: true, default: "" },
      branchName: { type: String, trim: true, default: "" },
      accountNumber: { type: String, trim: true, default: "" },
      ifscCode: { type: String, trim: true, uppercase: true, default: "" },
    },
  },
  {
    timestamps: true,
  },
);

vendorSchema.set("toJSON", { virtuals: true });
vendorSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Vendor", vendorSchema);