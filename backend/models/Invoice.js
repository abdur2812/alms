const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: false, // Allow null for one-time products
    },
    name: {
      type: String,
      required: [true, "Item name is required"],
    },
    quantity: {
      type: Number,
      required: [true, "Quantity is required"],
      min: [1, "Quantity must be at least 1"],
    },
    unitPrice: {
      type: Number,
      required: [true, "Unit price is required"],
      min: [0, "Unit price cannot be negative"],
    },
    gst: {
      type: Number,
      required: [true, "GST rate is required"],
      min: [0, "GST rate cannot be negative"],
      max: [100, "GST rate cannot exceed 100%"],
    },
    hsnCode: {
      type: String,
      trim: true,
    },
  },
  { _id: false },
);

// Virtual for line item subtotal (without GST)
invoiceItemSchema.virtual("subtotal").get(function () {
  return this.quantity * this.unitPrice;
});

// Virtual for line item GST amount
invoiceItemSchema.virtual("gstAmount").get(function () {
  return (this.quantity * this.unitPrice * this.gst) / 100;
});

// Virtual for line item total (including GST)
invoiceItemSchema.virtual("total").get(function () {
  return this.subtotal + this.gstAmount;
});

const invoiceSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: false, // Allow null for one-time customers
    },
    customerData: {
      name: { type: String },
      phone: { type: String },
      gstNumber: { type: String },
      permanentAddress: {
        companyAddress: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String },
      },
      shippingAddress: {
        companyAddress: { type: String },
        city: { type: String },
        state: { type: String },
        postalCode: { type: String },
        country: { type: String },
      },
      sameAsPermanent: { type: Boolean, default: false },
    },
    items: {
      type: [invoiceItemSchema],
      validate: {
        validator: function (items) {
          return items && items.length > 0;
        },
        message: "Invoice must have at least one item",
      },
    },
    totalAmount: {
      type: Number,
      default: 0,
      min: [0, "Total amount cannot be negative"],
    },
    isGstBill: {
      type: Boolean,
      default: true,
    },
    billType: {
      type: String,
      enum: ["credit", "pay"],
      default: "pay",
    },
    invoiceNumber: {
      type: String,
      unique: true,
      required: true,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual for subtotal (before GST)
invoiceSchema.virtual("subtotal").get(function () {
  if (!this.items || !Array.isArray(this.items)) return 0;
  return this.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
});

// Virtual for total GST amount
invoiceSchema.virtual("gstAmount").get(function () {
  if (!this.items || !Array.isArray(this.items)) return 0;
  return this.items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice * item.gst) / 100,
    0,
  );
});

// Virtual for grand total (subtotal + GST)
invoiceSchema.virtual("grandTotal").get(function () {
  if (!this.items || !Array.isArray(this.items)) return 0;
  return this.subtotal + this.gstAmount;
});

// Pre-save hook to calculate totalAmount
invoiceSchema.pre("save", function (next) {
  // Ensure items array exists
  if (!this.items || !Array.isArray(this.items) || this.items.length === 0) {
    return next(new Error("Invoice must have at least one item"));
  }

  // Calculate subtotal
  const subtotal = this.items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  // Calculate total GST based on each item's GST rate
  const totalGst = this.items.reduce((sum, item) => {
    return sum + (item.quantity * item.unitPrice * item.gst) / 100;
  }, 0);

  // Set total amount
  this.totalAmount = subtotal + totalGst;

  console.log("=== INVOICE PRE-SAVE HOOK ===");
  console.log("Items:", JSON.stringify(this.items, null, 2));
  console.log("Subtotal:", subtotal);
  console.log("Total GST:", totalGst);
  console.log("Total Amount:", this.totalAmount);
  console.log("=== END INVOICE PRE-SAVE ===");

  next();
});

// Static method to generate invoice number with format ALMS0001-2526
// Fiscal year April 1 to March 31, resets to 0001 each fiscal year
invoiceSchema.statics.generateInvoiceNumber = async function () {
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth(); // 0-indexed (0=Jan, 3=April)

  // Determine fiscal year (April 1 to March 31)
  // If current month is Jan-Mar (0-2), fiscal year started last year
  // If current month is Apr-Dec (3-11), fiscal year started this year
  let fiscalYearStart;
  if (currentMonth < 3) {
    // Jan-Mar: fiscal year started last year
    fiscalYearStart = currentYear - 1;
  } else {
    // Apr-Dec: fiscal year started this year
    fiscalYearStart = currentYear;
  }

  const fiscalYearEnd = fiscalYearStart + 1;

  // Format fiscal year as 2526 (25-26)
  const fiscalYearLabel = `${String(fiscalYearStart).slice(-2)}${String(fiscalYearEnd).slice(-2)}`;

  // Count invoices created in current fiscal year
  const fiscalYearStartDate = new Date(fiscalYearStart, 3, 1); // April 1
  const fiscalYearEndDate = new Date(fiscalYearEnd, 2, 31, 23, 59, 59); // March 31

  const count = await this.countDocuments({
    createdAt: {
      $gte: fiscalYearStartDate,
      $lte: fiscalYearEndDate,
    },
  });

  const sequenceNumber = String(count + 1).padStart(4, "0");

  return `ALMS${sequenceNumber}-${fiscalYearLabel}`;
};

// Post-save hook to handle stock management when status changes to 'Paid'
invoiceSchema.post("save", async function (doc, next) {
  // This will be handled in the controller for better error handling
  next();
});

// Ensure virtuals are included when converting to JSON
invoiceSchema.set("toJSON", { virtuals: true });
invoiceSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Invoice", invoiceSchema);
