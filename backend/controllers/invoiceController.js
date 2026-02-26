const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Public
exports.getAllInvoices = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, customerId, billType } = req.query;

  const query = {};

  // Filter by bill type (credit/pay)
  if (billType) {
    query.billType = billType;
  }

  // Filter by customer
  if (customerId) {
    query.customerId = customerId;
  }

  const invoices = await Invoice.find(query)
    .populate("customerId", "name phone")
    .populate("items.productId", "name")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

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
    .populate("customerId", "name phone address")
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
    cgstRate,
    sgstRate,
    igstRate,
    billType,
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

      // Check if product has sufficient stock
      if (product.stockQuantity < item.quantity) {
        return next(
          new AppError(
            `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
            400,
          ),
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

  // Generate invoice number
  const invoiceNumber = await Invoice.generateInvoiceNumber();

  // Create invoice with all new fields
  const invoiceData = {
    invoiceNumber,
    customerId,
    customerData: snapshotCustomerData,
    items: validatedItems,
    taxRate: taxRate || 0,
    isGstBill: isGstBill !== undefined ? isGstBill : true,
    isIGST: isIGST || false,
    cgstRate: cgstRate || 0,
    sgstRate: sgstRate || 0,
    igstRate: igstRate || 0,
    billType: billType || "pay",
  };

  const invoice = await Invoice.create(invoiceData);

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
  const { items, taxRate, customerData, billType } = req.body;

  let invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(
      new AppError(`Invoice not found with id: ${req.params.id}`, 404),
    );
  }

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

  await invoice.save();

  // Invalidate PDF cache so next preview regenerates
  pdfService.clearCache(invoice._id);

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
