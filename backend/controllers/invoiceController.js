const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

const parseOptionalBoolean = (value) => {
  if (value === undefined || value === null) return undefined;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (normalized === "true") return true;
    if (normalized === "false") return false;
  }
  return Boolean(value);
};

// @desc    Preview next invoice number (without creating)
// @route   GET /api/invoices/preview-number
// @access  Public
exports.previewInvoiceNumber = asyncHandler(async (req, res, next) => {
  const parsedIsGstBill = parseOptionalBoolean(req.query.isGstBill);
  const isGstBill = parsedIsGstBill === undefined ? true : parsedIsGstBill;
  const nextNumber = isGstBill
    ? await Invoice.peekNextInvoiceNumber()
    : await Invoice.peekNextEstimateNumber();
  res.status(200).json({ success: true, data: { invoiceNumber: nextNumber } });
});

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Public
exports.getAllInvoices = asyncHandler(async (req, res, next) => {
  const {
    page = 1,
    limit = 10,
    customerId,
    billType,
    isGstBill,
    search,
  } = req.query;

  const query = {};

  // Filter by bill type (credit/pay)
  if (billType) {
    query.billType = billType;
  }

  // Filter by customer
  if (customerId) {
    query.customerId = customerId;
  }

  // Filter by invoice mode (tax invoice vs estimate)
  if (isGstBill === "true") {
    query.isGstBill = true;
  } else if (isGstBill === "false") {
    query.isGstBill = false;
  }

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    const matchingCustomers = await Customer.find({ name: regex }).select(
      "_id",
    );
    const matchingCustomerIds = matchingCustomers.map(
      (customer) => customer._id,
    );

    query.$or = [
      { invoiceNumber: regex },
      { "customerData.name": regex },
      { customerId: { $in: matchingCustomerIds } },
    ];
  }

  const invoices = await Invoice.find(query)
    .populate("customerId", "name phone")
    .populate("items.productId", "name")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ numberAssignedAt: -1, createdAt: -1, _id: -1 });

  const count = await Invoice.countDocuments(query);

  res.status(200).json({
    success: true,
    count: invoices.length,
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    data: invoices,
  });
});

// @desc    Get single invoice by ID
// @route   GET /api/invoices/:id
// @access  Public
exports.getInvoiceById = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id)
    .populate(
      "customerId",
      "name phone gstNumber permanentAddress shippingAddress address",
    )
    .populate("items.productId", "name description");

  if (!invoice) {
    return next(
      new AppError(`Invoice not found with id: ${req.params.id}`, 404),
    );
  }

  res.status(200).json({
    success: true,
    data: invoice,
  });
});

// @desc    Create new invoice
// @route   POST /api/invoices
// @access  Public
exports.createInvoice = asyncHandler(async (req, res, next) => {
  const {
    customerId,
    customerData,
    items,
    taxRate,
    isGstBill,
    isIGST,
    isIgst,
    cgstRate,
    sgstRate,
    igstRate,
    billType,
    vehicleNumber,
    copyType,
  } = req.body;

  // Validate items array
  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError("Invoice must have at least one item", 400));
  }

  // Validate customer - either customerId OR customerData must be provided
  if (!customerId && !customerData) {
    return next(new AppError("Customer information is required", 400));
  }

  let customer = null;
  let snapshotCustomerData = {};

  if (customerId) {
    // Existing customer flow
    customer = await Customer.findById(customerId);
    if (!customer) {
      return next(new AppError("Customer not found", 404));
    }

    // Snapshot customer data - use provided customerData or get from customer record
    if (customerData) {
      snapshotCustomerData = customerData;
    } else {
      snapshotCustomerData = {
        name: customer.name,
        phone: customer.phone,
        gstNumber: customer.gstNumber,
        address: customer.permanentAddress || customer.address,
        shippingAddress:
          customer.shippingAddress ||
          customer.permanentAddress ||
          customer.address,
        sameAsPermanent: false,
      };
    }
  } else {
    // New customer flow (one-time billing)
    snapshotCustomerData = customerData;
  }

  // Validate all products and check stock
  const validatedItems = [];

  for (const item of items) {
    let validatedItem;

    if (item.productId) {
      // Existing product flow
      const product = await Product.findById(item.productId);

      if (!product) {
        return next(
          new AppError(`Product not found with id: ${item.productId}`, 404),
        );
      }

      // Snapshot the current price and name at time of invoice creation
      validatedItem = {
        productId: product._id,
        name: item.name || product.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || product.price,
        gst: Number(item.gst) || Number(product.gst) || 0,
        hsnCode: item.hsnCode || product.hsnCode || "",
      };
    } else {
      // New product flow (one-time billing, no database record)

      // Validate required fields for new products
      if (!item.name || !item.quantity || item.unitPrice === undefined) {
        return next(
          new AppError(
            "Product name, quantity, and price are required for new products",
            400,
          ),
        );
      }

      validatedItem = {
        productId: null,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gst: Number(item.gst) || 0,
        hsnCode: item.hsnCode || "",
      };
    }

    validatedItems.push(validatedItem);
  }

  const parsedIsGstBill = parseOptionalBoolean(isGstBill);
  const parsedIsIgst = parseOptionalBoolean(isIgst);
  const parsedLegacyIsIgst = parseOptionalBoolean(isIGST);

  const resolvedIsGstBill =
    parsedIsGstBill === undefined ? true : parsedIsGstBill;
  const resolvedIsIgst = resolvedIsGstBill
    ? (parsedIsIgst ?? parsedLegacyIsIgst ?? false)
    : false;

  const invoiceNumber = resolvedIsGstBill
    ? await Invoice.generateInvoiceNumber()
    : await Invoice.generateEstimateNumber();

  // Legacy field retained for backward compatibility with older records.
  const pendingInvoiceNumber = null;

  // Create invoice with all new fields
  const invoiceData = {
    invoiceNumber,
    pendingInvoiceNumber,
    numberAssignedAt: new Date(),
    customerId,
    customerData: snapshotCustomerData,
    items: validatedItems,
    taxRate: taxRate || 0,
    isGstBill: resolvedIsGstBill,
    isIgst: resolvedIsIgst,
    cgstRate: cgstRate || 0,
    sgstRate: sgstRate || 0,
    igstRate: igstRate || 0,
    billType: billType || "pay",
    vehicleNumber: vehicleNumber || "",
    copyType: copyType || "original",
  };

  // Retry create if invoiceNumber collides due to concurrent requests.
  const maxCreateAttempts = 5;
  let invoice;

  for (let attempt = 1; attempt <= maxCreateAttempts; attempt++) {
    try {
      invoice = await Invoice.create(invoiceData);
      break;
    } catch (error) {
      const isDuplicateInvoiceNumber =
        error &&
        error.code === 11000 &&
        (error.keyPattern?.invoiceNumber ||
          error.keyValue?.invoiceNumber ||
          String(error.message || "").includes("invoiceNumber"));

      if (!isDuplicateInvoiceNumber) {
        throw error;
      }

      if (attempt === maxCreateAttempts) {
        return next(
          new AppError(
            "Unable to generate a unique invoice number. Please try again.",
            409,
          ),
        );
      }

      invoiceData.invoiceNumber = resolvedIsGstBill
        ? await Invoice.generateInvoiceNumber()
        : await Invoice.generateEstimateNumber();
    }
  }

  // Add invoice reference to customer (only for existing customers)
  if (customer && customerId) {
    if (!customer.invoices) {
      customer.invoices = [];
    }
    customer.invoices.push(invoice._id);
    await customer.save();
  } else {
  }

  // If invoice is billType pay, decrement stock immediately (only for existing products)
  if (billType === "pay") {
    for (const item of validatedItems) {
      if (item.productId) {
        const product = await Product.findById(item.productId);
        if (product) {
          await product.decreaseStock(item.quantity);
        }
      } else {
      }
    }
  }

  // Populate and return the created invoice
  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name phone")
    .populate("items.productId", "name");

  res.status(201).json({
    success: true,
    message: "Invoice created successfully",
    data: populatedInvoice,
  });
});

// @desc    Update invoice
// @route   PUT /api/invoices/:id
// @access  Public
exports.updateInvoice = asyncHandler(async (req, res, next) => {
  const {
    items,
    taxRate,
    customerData,
    billType,
    isGstBill,
    isIGST,
    isIgst,
    copyType,
    vehicleNumber,
  } = req.body;

  let invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(
      new AppError(`Invoice not found with id: ${req.params.id}`, 404),
    );
  }

  const wasGstBill = invoice.isGstBill;

  // Update customer data if provided
  if (customerData) {
    invoice.customerData = customerData;
  }

  // If items are being updated, validate them
  if (items && Array.isArray(items)) {
    const validatedItems = [];

    for (const item of items) {
      let validatedItem;

      if (item.productId) {
        // Existing product - validate it exists
        const product = await Product.findById(item.productId);

        if (!product) {
          return next(
            new AppError(`Product not found with id: ${item.productId}`, 404),
          );
        }

        validatedItem = {
          productId: product._id,
          name: item.name || product.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice || product.price,
          gst: Number(item.gst) || Number(product.gst) || 0,
          hsnCode: item.hsnCode || product.hsnCode || "",
        };
      } else {
        // One-time product - no database record
        if (!item.name || !item.quantity || item.unitPrice === undefined) {
          return next(
            new AppError("Product name, quantity, and price are required", 400),
          );
        }

        validatedItem = {
          productId: null,
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          gst: Number(item.gst) || 0,
          hsnCode: item.hsnCode || "",
        };
      }

      validatedItems.push(validatedItem);
    }

    invoice.items = validatedItems;
  }

  // Update other fields
  if (taxRate !== undefined) invoice.taxRate = taxRate;
  if (billType) invoice.billType = billType;
  if (copyType) invoice.copyType = copyType;
  const parsedIsGstBill = parseOptionalBoolean(isGstBill);
  const parsedIsIgst = parseOptionalBoolean(isIgst);
  const parsedLegacyIsIgst = parseOptionalBoolean(isIGST);

  if (parsedIsGstBill !== undefined) invoice.isGstBill = parsedIsGstBill;
  if (parsedIsIgst !== undefined || parsedLegacyIsIgst !== undefined) {
    invoice.isIgst = invoice.isGstBill
      ? (parsedIsIgst ?? parsedLegacyIsIgst ?? false)
      : false;
  } else if (!invoice.isGstBill) {
    invoice.isIgst = false;
  }
  if (vehicleNumber !== undefined) invoice.vehicleNumber = vehicleNumber;

  if (!wasGstBill && invoice.isGstBill) {
    // Assign the next available GST invoice number at conversion time.
    // This keeps converted estimates after the latest already-created invoice.
    invoice.invoiceNumber = await Invoice.generateInvoiceNumber();
    invoice.numberAssignedAt = new Date();
    invoice.pendingInvoiceNumber = null;
  }

  await invoice.save();

  // Populate and return updated invoice
  const updatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name phone")
    .populate("items.productId", "name");

  res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
    data: updatedInvoice,
  });
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Public
exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(
      new AppError(`Invoice not found with id: ${req.params.id}`, 404),
    );
  }

  // Remove invoice reference from customer
  await Customer.findByIdAndUpdate(invoice.customerId, {
    $pull: { invoices: invoice._id },
  });

  await Invoice.findByIdAndDelete(req.params.id);
  await Invoice.syncCounterAfterDelete({
    isGstBill: invoice.isGstBill,
    invoiceNumber: invoice.invoiceNumber,
  });

  res.status(200).json({
    success: true,
    message: "Invoice deleted successfully",
    data: {},
  });
});

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats/summary
// @access  Public
exports.getInvoiceStats = asyncHandler(async (req, res, next) => {
  const stats = await Invoice.aggregate([
    {
      $group: {
        _id: "$billType",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  const totalInvoices = await Invoice.countDocuments();
  const totalRevenue = await Invoice.aggregate([
    { $match: { billType: "pay" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      byBillType: stats,
    },
  });
});

// @desc    Get invoices by date range
// @route   GET /api/invoices/reports/date-range
// @access  Public
exports.getInvoicesByDateRange = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  if (!startDate || !endDate) {
    return next(new AppError("Please provide both startDate and endDate", 400));
  }

  const invoices = await Invoice.find({
    createdAt: {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    },
  })
    .populate("customerId", "name")
    .populate("items.productId", "name")
    .sort({ createdAt: -1 });

  const totalRevenue = invoices
    .filter((inv) => inv.billType === "pay")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  res.status(200).json({
    success: true,
    count: invoices.length,
    totalRevenue,
    data: invoices,
  });
});
// @desc    Get bulk invoice data for PDF generation
// @route   GET /api/invoices/reports/bulk-pdf
// @access  Public
// Format: invoice id, cust name, cust gst, cust phone, amount separated by cgst sgst, credit or paid
exports.getBulkInvoicePDF = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, billType } = req.query;

  const query = {};

  // Filter by date range if provided
  if (startDate && endDate) {
    query.createdAt = {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  // Filter by bill type
  if (billType) {
    query.billType = billType;
  }

  const invoices = await Invoice.find(query)
    .populate("customerId", "name phone gstNumber")
    .sort({ createdAt: -1 });

  // Format data for PDF: invoice id, cust name, cust gst, cust phone,
  // subtotal, cgst, sgst, total, credit or paid
  const bulkData = invoices.map((invoice) => {
    const subtotal = invoice.subtotal;
    const gstAmount = invoice.gstAmount;
    const cgst = gstAmount / 2; // Assuming CGST and SGST are equal (50% each)
    const sgst = gstAmount / 2;
    const total = invoice.totalAmount;

    // Use customerData snapshot if available, otherwise fall back to populated customer
    let customerName = "N/A";
    let customerPhone = "-";
    let customerGST = "-";

    if (invoice.customerData && invoice.customerData.name) {
      customerName = invoice.customerData.name;
      customerPhone = invoice.customerData.phone || "-";
      customerGST = invoice.customerData.gstNumber || "-";
    } else if (invoice.customerId) {
      customerName = invoice.customerId.name || "N/A";
      customerPhone = invoice.customerId.phone || "-";
      customerGST = invoice.customerId.gstNumber || "-";
    }

    return {
      invoiceId: invoice.invoiceNumber,
      customerName,
      customerGST,
      customerPhone,
      subtotal: subtotal.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      total: total.toFixed(2),
      type: invoice.billType === "credit" ? "Credit" : "Paid",
    };
  });

  res.status(200).json({
    success: true,
    count: bulkData.length,
    data: bulkData,
  });
});
