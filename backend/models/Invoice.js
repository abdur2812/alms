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
    isIgst: {
      type: Boolean,
      default: false,
    },
    billType: {
      type: String,
      enum: ["credit", "pay"],
      default: "pay",
    },
    vehicleNumber: {
      type: String,
      trim: true,
      default: "",
    },
    copyType: {
      type: String,
      enum: ["original", "duplicate"],
      default: "original",
    },
    // Controls list ordering: estimates use creation time; converted invoices
    // get updated to conversion time so they appear as latest.
    numberAssignedAt: {
      type: Date,
      default: null,
    },
    // Legacy field retained for backward compatibility.
    pendingInvoiceNumber: {
      type: String,
      default: null,
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

  // Prices are GST-inclusive; totalAmount = sum of (qty * price), GST is reverse-extracted
  const total = this.items.reduce((sum, item) => {
    return sum + item.quantity * item.unitPrice;
  }, 0);

  // Set total amount (rounded)
  this.totalAmount = Math.round(total);

  next();
});

// Static method to generate invoice number with format ALMS 25-26/0001
// Fiscal year April 1 to March 31, sequence increments from latest number in that year.
invoiceSchema.statics.generateInvoiceNumber = async function () {
  const Counter = mongoose.model("Counter");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fiscalYearStart = currentMonth < 3 ? currentYear - 1 : currentYear;
  const fiscalYearEnd = fiscalYearStart + 1;
  const fyStartLabel = String(fiscalYearStart).slice(-2);
  const fyEndLabel = String(fiscalYearEnd).slice(-2);
  const fiscalSeries = `${fyStartLabel}${fyEndLabel}`;
  const fiscalRange = `${fyStartLabel}-${fyEndLabel}`;
  const counterId = `inv-${fiscalSeries}`;

  // Fast path: counter already exists — do one atomic increment.
  // No upsert so this only succeeds when the counter was previously initialised.
  let result = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: 1 } },
    { new: true },
  );

  if (!result) {
    // Counter does not exist yet for this fiscal year.
    // Scan GST invoice numbers to find the current maximum sequence.
    const currentPattern = new RegExp(
      `^ALMS ${fiscalRange.replace("-", "\\-")}\\/\\d{4}$`,
    );
    const legacyPattern = new RegExp(`^ALMS \\d{4}-${fiscalSeries}$`);
    const gstInvoices = await this.find({
      isGstBill: true,
      $or: [
        { invoiceNumber: { $regex: currentPattern } },
        { invoiceNumber: { $regex: legacyPattern } },
      ],
    })
      .select("invoiceNumber")
      .lean();

    let dbMax = 0;
    const currentFormatParser = new RegExp(
      `^ALMS ${fiscalRange.replace("-", "\\-")}\\/(\\d{4})$`,
    );
    const legacyFormatParser = new RegExp(`^ALMS (\\d{4})-${fiscalSeries}$`);
    for (const inv of gstInvoices) {
      const currentMatch = inv.invoiceNumber.match(currentFormatParser);
      const legacyMatch = inv.invoiceNumber.match(legacyFormatParser);
      if (currentMatch) dbMax = Math.max(dbMax, Number(currentMatch[1]));
      if (legacyMatch) dbMax = Math.max(dbMax, Number(legacyMatch[1]));
    }

    // Create the counter at current max. $setOnInsert is a no-op if a concurrent
    // request already created it between our check above.
    await Counter.findOneAndUpdate(
      { _id: counterId },
      { $setOnInsert: { sequence: dbMax } },
      { upsert: true },
    );

    // Atomic increment — counter is now guaranteed to exist.
    result = await Counter.findOneAndUpdate(
      { _id: counterId },
      { $inc: { sequence: 1 } },
      { new: true },
    );
  }

  return `ALMS ${fiscalRange}/${String(result.sequence).padStart(4, "0")}`;
};

// Read-only preview of next GST invoice number.
invoiceSchema.statics.peekNextInvoiceNumber = async function () {
  const Counter = mongoose.model("Counter");

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const fiscalYearStart = currentMonth < 3 ? currentYear - 1 : currentYear;
  const fiscalYearEnd = fiscalYearStart + 1;
  const fyStartLabel = String(fiscalYearStart).slice(-2);
  const fyEndLabel = String(fiscalYearEnd).slice(-2);
  const fiscalSeries = `${fyStartLabel}${fyEndLabel}`;
  const fiscalRange = `${fyStartLabel}-${fyEndLabel}`;
  const counterId = `inv-${fiscalSeries}`;

  const counter = await Counter.findById(counterId).lean();
  if (counter && Number.isFinite(counter.sequence)) {
    return `ALMS ${fiscalRange}/${String(counter.sequence + 1).padStart(4, "0")}`;
  }

  const currentPattern = new RegExp(
    `^ALMS ${fiscalRange.replace("-", "\\-")}\\/\\d{4}$`,
  );
  const legacyPattern = new RegExp(`^ALMS \\d{4}-${fiscalSeries}$`);
  const gstInvoices = await this.find({
    isGstBill: true,
    $or: [
      { invoiceNumber: { $regex: currentPattern } },
      { invoiceNumber: { $regex: legacyPattern } },
    ],
  })
    .select("invoiceNumber")
    .lean();

  let dbMax = 0;
  const currentFormatParser = new RegExp(
    `^ALMS ${fiscalRange.replace("-", "\\-")}\\/(\\d{4})$`,
  );
  const legacyFormatParser = new RegExp(`^ALMS (\\d{4})-${fiscalSeries}$`);
  for (const inv of gstInvoices) {
    const currentMatch = inv.invoiceNumber.match(currentFormatParser);
    const legacyMatch = inv.invoiceNumber.match(legacyFormatParser);
    if (currentMatch) dbMax = Math.max(dbMax, Number(currentMatch[1]));
    if (legacyMatch) dbMax = Math.max(dbMax, Number(legacyMatch[1]));
  }

  return `ALMS ${fiscalRange}/${String(dbMax + 1).padStart(4, "0")}`;
};

invoiceSchema.statics.generateEstimateNumber = async function () {
  const Counter = mongoose.model("Counter");
  const counterId = "est";

  let result = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: 1 } },
    { new: true },
  );

  if (!result) {
    // Initialise from existing estimate numbers in the DB.
    const estimates = await this.find({
      isGstBill: false,
      invoiceNumber: { $regex: /^EST-\d{4}$/ },
    })
      .select("invoiceNumber")
      .lean();

    let dbMax = 0;
    for (const est of estimates) {
      const m = est.invoiceNumber.match(/^EST-(\d{4})$/);
      if (m) dbMax = Math.max(dbMax, Number(m[1]));
    }

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

  return `EST-${String(result.sequence).padStart(4, "0")}`;
};

// Read-only preview of next estimate number.
invoiceSchema.statics.peekNextEstimateNumber = async function () {
  const Counter = mongoose.model("Counter");
  const counterId = "est";

  const counter = await Counter.findById(counterId).lean();
  if (counter && Number.isFinite(counter.sequence)) {
    return `EST-${String(counter.sequence + 1).padStart(4, "0")}`;
  }

  const estimates = await this.find({
    isGstBill: false,
    invoiceNumber: { $regex: /^EST-\d{4}$/ },
  })
    .select("invoiceNumber")
    .lean();

  let dbMax = 0;
  for (const est of estimates) {
    const m = est.invoiceNumber.match(/^EST-(\d{4})$/);
    if (m) dbMax = Math.max(dbMax, Number(m[1]));
  }

  return `EST-${String(dbMax + 1).padStart(4, "0")}`;
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
