const mongoose = require("mongoose");

const customerSchema = new mongoose.Schema(
  {
    customerType: {
      type: String,
      enum: ["individual", "business"],
      default: "individual",
      required: [true, "Customer type is required"],
    },
    name: {
      type: String,
      required: [true, "Customer name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
    },
    phone: {
      type: String,
      required: [true, "Phone number is required"],
      trim: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      uppercase: true,
    },
    permanentAddress: {
      companyAddress: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: "India" },
    },
    shippingAddress: {
      companyAddress: { type: String, trim: true },
      city: { type: String, trim: true },
      state: { type: String, trim: true },
      postalCode: { type: String, trim: true },
      country: { type: String, trim: true, default: "India" },
    },
    invoices: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Invoice",
      },
    ],
  },
  {
    timestamps: true,
  },
);

// Virtual to get total number of invoices
customerSchema.virtual("invoiceCount").get(function () {
  return this.invoices && Array.isArray(this.invoices)
    ? this.invoices.length
    : 0;
});

customerSchema.index({ name: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ createdAt: -1 });

// Ensure virtuals are included when converting to JSON
customerSchema.set("toJSON", { virtuals: true });
customerSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Customer", customerSchema);
