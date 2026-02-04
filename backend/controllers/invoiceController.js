const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

// @desc    Get all invoices
// @route   GET /api/invoices
// @access  Public
exports.getAllInvoices = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, status, customerId } = req.query;

  const query = {};

  // Filter by status
  if (status) {
    query.status = status;
  }

  // Filter by customer
  if (customerId) {
    query.customerId = customerId;
  }

  const invoices = await Invoice.find(query)
    .populate("customerId", "name email phone")
    .populate("items.productId", "name sku")
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
    .populate("customerId", "name email phone address")
    .populate("items.productId", "name description sku");

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
  const { customerId, items, taxRate, status } = req.body;

  // Validate customer exists
  const customer = await Customer.findById(customerId);
  if (!customer) {
    return next(new AppError("Customer not found", 404));
  }

  // Validate all products and check stock
  const validatedItems = [];

  for (const item of items) {
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

    // Snapshot the current price at time of invoice creation
    validatedItems.push({
      productId: product._id,
      quantity: item.quantity,
      unitPrice: item.unitPrice || product.price, // Use provided price or current product price
    });
  }

  // Generate invoice number
  const invoiceNumber = await Invoice.generateInvoiceNumber();

  // Create invoice
  const invoice = await Invoice.create({
    invoiceNumber,
    customerId,
    items: validatedItems,
    taxRate: taxRate || 0,
    status: status || "Draft",
  });

  // Add invoice reference to customer
  customer.invoices.push(invoice._id);
  await customer.save();

  // If invoice is created with 'Paid' status, decrement stock immediately
  if (status === "Paid") {
    for (const item of validatedItems) {
      const product = await Product.findById(item.productId);
      await product.decreaseStock(item.quantity);
    }
  }

  // Populate and return the created invoice
  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name email phone")
    .populate("items.productId", "name sku");

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
  const { items, taxRate, status } = req.body;

  let invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(
      new AppError(`Invoice not found with id: ${req.params.id}`, 404),
    );
  }

  // Don't allow updating paid or cancelled invoices
  if (invoice.status === "Paid") {
    return next(new AppError("Cannot update a paid invoice", 400));
  }

  if (invoice.status === "Cancelled") {
    return next(new AppError("Cannot update a cancelled invoice", 400));
  }

  const previousStatus = invoice.status;

  // If items are being updated, validate them
  if (items) {
    const validatedItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return next(
          new AppError(`Product not found with id: ${item.productId}`, 404),
        );
      }

      // Check stock only if status is changing to Paid
      if (status === "Paid" && product.stockQuantity < item.quantity) {
        return next(
          new AppError(
            `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Requested: ${item.quantity}`,
            400,
          ),
        );
      }

      validatedItems.push({
        productId: product._id,
        quantity: item.quantity,
        unitPrice: item.unitPrice || product.price,
      });
    }

    invoice.items = validatedItems;
  }

  // Update other fields
  if (taxRate !== undefined) invoice.taxRate = taxRate;
  if (status) invoice.status = status;

  await invoice.save();

  // Handle stock management when status changes to 'Paid'
  if (previousStatus !== "Paid" && status === "Paid") {
    for (const item of invoice.items) {
      const product = await Product.findById(item.productId);
      await product.decreaseStock(item.quantity);
    }
  }

  // Populate and return updated invoice
  const updatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name email phone")
    .populate("items.productId", "name sku");

  res.status(200).json({
    success: true,
    message: "Invoice updated successfully",
    data: updatedInvoice,
  });
});

// @desc    Update invoice status
// @route   PATCH /api/invoices/:id/status
// @access  Public
exports.updateInvoiceStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!status || !["Draft", "Pending", "Paid", "Cancelled"].includes(status)) {
    return next(new AppError("Please provide a valid status", 400));
  }

  const invoice = await Invoice.findById(req.params.id);

  if (!invoice) {
    return next(
      new AppError(`Invoice not found with id: ${req.params.id}`, 404),
    );
  }

  const previousStatus = invoice.status;

  // Don't allow changing from Paid or Cancelled
  if (previousStatus === "Paid" && status !== "Paid") {
    return next(new AppError("Cannot change status of a paid invoice", 400));
  }

  if (previousStatus === "Cancelled" && status !== "Cancelled") {
    return next(
      new AppError("Cannot change status of a cancelled invoice", 400),
    );
  }

  // When changing to Paid, check stock availability
  if (previousStatus !== "Paid" && status === "Paid") {
    for (const item of invoice.items) {
      const product = await Product.findById(item.productId);

      if (!product) {
        return next(
          new AppError(`Product not found with id: ${item.productId}`, 404),
        );
      }

      if (product.stockQuantity < item.quantity) {
        return next(
          new AppError(
            `Insufficient stock for ${product.name}. Available: ${product.stockQuantity}, Required: ${item.quantity}`,
            400,
          ),
        );
      }
    }

    // Decrement stock for all items
    for (const item of invoice.items) {
      const product = await Product.findById(item.productId);
      await product.decreaseStock(item.quantity);
    }
  }

  invoice.status = status;
  await invoice.save();

  const updatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name email phone")
    .populate("items.productId", "name sku");

  res.status(200).json({
    success: true,
    message: "Invoice status updated successfully",
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

  // Don't allow deleting paid invoices
  if (invoice.status === "Paid") {
    return next(
      new AppError(
        "Cannot delete a paid invoice. Please cancel it instead.",
        400,
      ),
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
        _id: "$status",
        count: { $sum: 1 },
        totalAmount: { $sum: "$totalAmount" },
      },
    },
  ]);

  const totalInvoices = await Invoice.countDocuments();
  const totalRevenue = await Invoice.aggregate([
    { $match: { status: "Paid" } },
    { $group: { _id: null, total: { $sum: "$totalAmount" } } },
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalInvoices,
      totalRevenue: totalRevenue[0]?.total || 0,
      byStatus: stats,
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
    .populate("customerId", "name email")
    .populate("items.productId", "name sku")
    .sort({ createdAt: -1 });

  const totalRevenue = invoices
    .filter((inv) => inv.status === "Paid")
    .reduce((sum, inv) => sum + inv.totalAmount, 0);

  res.status(200).json({
    success: true,
    count: invoices.length,
    totalRevenue,
    data: invoices,
  });
});
