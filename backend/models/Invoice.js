const mongoose = require("mongoose");

const invoiceItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Product",
      required: [true, "Product ID is required"],
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
  },
  { _id: false },
);

// Virtual for line item subtotal
invoiceItemSchema.virtual("subtotal").get(function () {
  return this.quantity * this.unitPrice;
});

const invoiceSchema = new mongoose.Schema(
  {
    customerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: [true, "Customer ID is required"],
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
    taxRate: {
      type: Number,
      default: 0,
      min: [0, "Tax rate cannot be negative"],
      max: [100, "Tax rate cannot exceed 100%"],
    },
    status: {
      type: String,
      enum: ["Draft", "Pending", "Paid", "Cancelled"],
      default: "Draft",
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

// Virtual for subtotal (before tax)
invoiceSchema.virtual("subtotal").get(function () {
  return this.items.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0,
  );
});

// Virtual for tax amount
invoiceSchema.virtual("taxAmount").get(function () {
  return (this.subtotal * this.taxRate) / 100;
});

// Virtual for grand total (subtotal + tax)
invoiceSchema.virtual("grandTotal").get(function () {
  return this.subtotal + this.taxAmount;
});

// Pre-save hook to calculate totalAmount
invoiceSchema.pre("save", function (next) {
  // Calculate subtotal
  const subtotal = this.items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  // Calculate tax
  const tax = (subtotal * this.taxRate) / 100;

  // Set total amount
  this.totalAmount = subtotal + tax;

  next();
});

// Static method to generate invoice number
invoiceSchema.statics.generateInvoiceNumber = async function () {
  const count = await this.countDocuments();
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `INV-${year}${month}-${String(count + 1).padStart(5, "0")}`;
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
