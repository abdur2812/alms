const Invoice = require("../models/Invoice");
const Customer = require("../models/Customer");
const Product = require("../models/Product");
const { AppError, asyncHandler } = require("../middleware/errorHandler");
const { parsePagination } = require("../utils/queryHelpers");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

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

// @desc    Get all invoices - lean + capped pagination for 512 MB safety
// @route   GET /api/invoices
// @access  Public
exports.getAllInvoices = asyncHandler(async (req, res, next) => {
  const { customerId, billType, isGstBill, search, startDate, endDate } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });

  const query = {};
  if (billType) query.billType = billType;
  if (customerId) query.customerId = customerId;
  if (isGstBill === "true") query.isGstBill = true;
  else if (isGstBill === "false") query.isGstBill = false;

  if (startDate || endDate) {
    query.createdAt = {};
    if (startDate) query.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.setHours(23, 59, 59, 999);
      query.createdAt.$lte = e;
    }
  }

  if (search) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    const matchingCustomers = await Customer.find({ name: regex }).select("_id").limit(50).lean();
    const matchingCustomerIds = matchingCustomers.map((c) => c._id);
    query.$or = [
      { invoiceNumber: regex },
      { "customerData.name": regex },
      { customerId: { $in: matchingCustomerIds } },
    ];
  }

  const [invoices, count] = await Promise.all([
    Invoice.find(query)
      .populate("customerId", "name phone")
      .populate("items.productId", "name")
      .sort({ numberAssignedAt: -1, createdAt: -1, _id: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Invoice.countDocuments(query),
  ]);

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
    .populate("customerId", "name phone gstNumber permanentAddress shippingAddress address")
    .populate("items.productId", "name description")
    .lean();

  if (!invoice) {
    return next(new AppError(`Invoice not found with id: ${req.params.id}`, 404));
  }

  res.status(200).json({ success: true, data: invoice });
});

// Helper: batch validate items using single DB fetch + Map (O(n) hash, O(1) lookup)
async function validateAndSnapshotItems(items, next) {
  const productIds = [...new Set(items.filter((i) => i.productId).map((i) => String(i.productId)))];
  const productMap = new Map();
  if (productIds.length) {
    const products = await Product.find({ _id: { $in: productIds } })
      .select("name price gst hsnCode")
      .lean();
    for (const p of products) productMap.set(String(p._id), p);
  }

  const validatedItems = [];
  for (const item of items) {
    if (item.productId) {
      const prod = productMap.get(String(item.productId));
      if (!prod) {
        throw new AppError(`Product not found with id: ${item.productId}`, 404);
      }
      validatedItems.push({
        productId: prod._id,
        name: item.name || prod.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice || prod.price,
        gst: Number(item.gst) || Number(prod.gst) || 0,
        hsnCode: item.hsnCode || prod.hsnCode || "",
      });
    } else {
      if (!item.name || !item.quantity || item.unitPrice === undefined) {
        throw new AppError("Product name, quantity, and price are required for new products", 400);
      }
      validatedItems.push({
        productId: null,
        name: item.name,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        gst: Number(item.gst) || 0,
        hsnCode: item.hsnCode || "",
      });
    }
  }
  return validatedItems;
}

// @desc    Create new invoice - bulk product fetch + bulk stock decrement
// @route   POST /api/invoices
// @access  Public
exports.createInvoice = asyncHandler(async (req, res, next) => {
  const {
    customerId,
    customerData,
    items,
    taxRate,
    isGstBill,
    isCleanEstimate,
    isIGST,
    isIgst,
    cgstRate,
    sgstRate,
    igstRate,
    billType,
    vehicleNumber,
    copyType,
  } = req.body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return next(new AppError("Invoice must have at least one item", 400));
  }
  if (items.length > 100) {
    return next(new AppError("Invoice cannot have more than 100 items", 400));
  }
  if (!customerId && !customerData) {
    return next(new AppError("Customer information is required", 400));
  }

  let customer = null;
  let snapshotCustomerData = {};

  if (customerId) {
    customer = await Customer.findById(customerId).lean();
    if (!customer) return next(new AppError("Customer not found", 404));
    if (customerData) snapshotCustomerData = customerData;
    else {
      snapshotCustomerData = {
        name: customer.name,
        phone: customer.phone,
        gstNumber: customer.gstNumber,
        address: customer.permanentAddress || customer.address,
        shippingAddress: customer.shippingAddress || customer.permanentAddress || customer.address,
        sameAsPermanent: false,
      };
    }
  } else {
    snapshotCustomerData = customerData;
  }

  let validatedItems;
  try {
    validatedItems = await validateAndSnapshotItems(items, next);
  } catch (err) {
    if (err instanceof AppError) return next(err);
    throw err;
  }

  const parsedIsGstBill = parseOptionalBoolean(isGstBill);
  const parsedIsCleanEstimate = parseOptionalBoolean(isCleanEstimate);
  const parsedIsIgst = parseOptionalBoolean(isIgst);
  const parsedLegacyIsIgst = parseOptionalBoolean(isIGST);

  const resolvedIsCleanEstimate = parsedIsCleanEstimate || false;
  const resolvedIsGstBill = resolvedIsCleanEstimate
    ? false
    : parsedIsGstBill === undefined
      ? true
      : parsedIsGstBill;
  const resolvedIsIgst = resolvedIsGstBill ? (parsedIsIgst ?? parsedLegacyIsIgst ?? false) : false;

  const invoiceNumber = resolvedIsGstBill
    ? await Invoice.generateInvoiceNumber()
    : await Invoice.generateEstimateNumber();

  const pendingInvoiceNumber = null;

  const invoiceData = {
    invoiceNumber,
    pendingInvoiceNumber,
    numberAssignedAt: new Date(),
    customerId,
    customerData: snapshotCustomerData,
    items: validatedItems,
    taxRate: taxRate || 0,
    isGstBill: resolvedIsGstBill,
    isCleanEstimate: resolvedIsCleanEstimate,
    isIgst: resolvedIsIgst,
    cgstRate: cgstRate || 0,
    sgstRate: sgstRate || 0,
    igstRate: igstRate || 0,
    billType: billType || "pay",
    vehicleNumber: vehicleNumber || "",
    copyType: copyType || "original",
  };

  const maxCreateAttempts = 5;
  let invoice;
  for (let attempt = 1; attempt <= maxCreateAttempts; attempt++) {
    try {
      invoice = await Invoice.create(invoiceData);
      break;
    } catch (error) {
      const isDuplicateInvoiceNumber =
        error && error.code === 11000 && (error.keyPattern?.invoiceNumber || error.keyValue?.invoiceNumber || String(error.message || "").includes("invoiceNumber"));
      if (!isDuplicateInvoiceNumber) throw error;
      if (attempt === maxCreateAttempts) {
        return next(new AppError("Unable to generate a unique invoice number. Please try again.", 409));
      }
      invoiceData.invoiceNumber = resolvedIsGstBill ? await Invoice.generateInvoiceNumber() : await Invoice.generateEstimateNumber();
    }
  }

  if (customer && customerId) {
    // Use atomic $push to avoid loading full customer doc
    await Customer.findByIdAndUpdate(customerId, { $push: { invoices: invoice._id } });
  }

  // Bulk decrement stock: aggregate quantities per productId (O(n) hash)
  if (billType === "pay" || billType === "credit") {
    const qtyById = new Map();
    for (const it of validatedItems) {
      if (!it.productId) continue;
      const k = String(it.productId);
      qtyById.set(k, (qtyById.get(k) || 0) + Number(it.quantity));
    }
    if (qtyById.size) {
      const bulkOps = [];
      for (const [id, qty] of qtyById) {
        bulkOps.push({
          updateOne: {
            filter: { _id: id },
            update: { $inc: { stockQuantity: -qty } },
          },
        });
      }
      // Use bulkWrite with unordered for speed; ensure stock doesn't go negative via $max?
      // We clamp at 0 in post-processing by using aggregation pipeline with $max in update? For now allow negative guard via re-read
      await Product.bulkWrite(bulkOps, { ordered: false });
      // Clamp negatives to 0 in a second pass for any oversold
      await Product.updateMany({ _id: { $in: [...qtyById.keys()] }, stockQuantity: { $lt: 0 } }, { $set: { stockQuantity: 0 } });
    }
  }

  const populatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name phone")
    .populate("items.productId", "name")
    .lean();

  res.status(201).json({ success: true, message: "Invoice created successfully", data: populatedInvoice });
});

// @desc    Update invoice - batch validation
// @route   PUT /api/invoices/:id
// @access  Public
exports.updateInvoice = asyncHandler(async (req, res, next) => {
  const { items, taxRate, customerData, billType, isGstBill, isCleanEstimate, isIGST, isIgst, copyType, vehicleNumber } = req.body;

  let invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError(`Invoice not found with id: ${req.params.id}`, 404));

  const wasGstBill = invoice.isGstBill;
  if (customerData) invoice.customerData = customerData;

  if (items && Array.isArray(items)) {
    if (items.length > 100) return next(new AppError("Invoice cannot have more than 100 items", 400));
    let validatedItems;
    try {
      validatedItems = await validateAndSnapshotItems(items, next);
    } catch (err) {
      if (err instanceof AppError) return next(err);
      throw err;
    }
    invoice.items = validatedItems;
  }

  if (taxRate !== undefined) invoice.taxRate = taxRate;
  if (billType) invoice.billType = billType;
  if (copyType) invoice.copyType = copyType;
  const parsedIsGstBill = parseOptionalBoolean(isGstBill);
  const parsedIsCleanEstimate = parseOptionalBoolean(isCleanEstimate);
  const parsedIsIgst = parseOptionalBoolean(isIgst);
  const parsedLegacyIsIgst = parseOptionalBoolean(isIGST);

  if (parsedIsCleanEstimate !== undefined) {
    invoice.isCleanEstimate = parsedIsCleanEstimate;
    if (parsedIsCleanEstimate) invoice.isGstBill = false;
  }
  if (parsedIsGstBill !== undefined && !invoice.isCleanEstimate) invoice.isGstBill = parsedIsGstBill;
  if (parsedIsIgst !== undefined || parsedLegacyIsIgst !== undefined) {
    invoice.isIgst = invoice.isGstBill ? (parsedIsIgst ?? parsedLegacyIsIgst ?? false) : false;
  } else if (!invoice.isGstBill) {
    invoice.isIgst = false;
  }
  if (vehicleNumber !== undefined) invoice.vehicleNumber = vehicleNumber;

  if (!wasGstBill && invoice.isGstBill) {
    invoice.invoiceNumber = await Invoice.generateInvoiceNumber();
    invoice.numberAssignedAt = new Date();
    invoice.pendingInvoiceNumber = null;
  }

  await invoice.save();

  const updatedInvoice = await Invoice.findById(invoice._id)
    .populate("customerId", "name phone")
    .populate("items.productId", "name")
    .lean();

  res.status(200).json({ success: true, message: "Invoice updated successfully", data: updatedInvoice });
});

// @desc    Delete invoice
// @route   DELETE /api/invoices/:id
// @access  Public
exports.deleteInvoice = asyncHandler(async (req, res, next) => {
  const invoice = await Invoice.findById(req.params.id);
  if (!invoice) return next(new AppError(`Invoice not found with id: ${req.params.id}`, 404));
  if (invoice.customerId) {
    await Customer.findByIdAndUpdate(invoice.customerId, { $pull: { invoices: invoice._id } });
  }
  await Invoice.findByIdAndDelete(req.params.id);
  await Invoice.syncCounterAfterDelete({ isGstBill: invoice.isGstBill, invoiceNumber: invoice.invoiceNumber });
  res.status(200).json({ success: true, message: "Invoice deleted successfully", data: {} });
});

// @desc    Get invoice statistics
// @route   GET /api/invoices/stats/summary
// @access  Public
exports.getInvoiceStats = asyncHandler(async (req, res, next) => {
  const { isGstBill, startDate, endDate, billType } = req.query;
  const baseMatch = {};
  if (isGstBill === "true") baseMatch.isGstBill = true;
  else if (isGstBill === "false") baseMatch.isGstBill = false;
  if (startDate || endDate) {
    baseMatch.createdAt = {};
    if (startDate) baseMatch.createdAt.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.setHours(23, 59, 59, 999);
      baseMatch.createdAt.$lte = e;
    }
  }
  if (billType) baseMatch.billType = billType;

  const [stats, totalInvoices, totalRevenue] = await Promise.all([
    Invoice.aggregate([{ $match: baseMatch }, { $group: { _id: "$billType", count: { $sum: 1 }, totalAmount: { $sum: "$totalAmount" } } }]),
    Invoice.countDocuments(baseMatch),
    Invoice.aggregate([{ $match: { ...baseMatch, billType: "pay" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
  ]);

  res.status(200).json({
    success: true,
    data: { totalInvoices, totalRevenue: totalRevenue[0]?.total || 0, byBillType: stats },
  });
});

// @desc    Get revenue insights within a date range
// @route   GET /api/invoices/reports/revenue
// @access  Public
exports.getRevenueInsights = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, isGstBill } = req.query;
  if (!startDate || !endDate) return next(new AppError("Please provide both startDate and endDate", 400));

  const baseMatch = { createdAt: { $gte: new Date(startDate), $lte: new Date(endDate) } };
  if (isGstBill === "true") baseMatch.isGstBill = true;
  else if (isGstBill === "false") baseMatch.isGstBill = false;

  const itemBase = {
    $reduce: { input: "$items", initialValue: 0, in: { $add: ["$$value", { $multiply: ["$$this.quantity", "$$this.unitPrice"] }] } },
  };
  const itemGst = {
    $reduce: {
      input: "$items",
      initialValue: 0,
      in: { $add: ["$$value", { $multiply: [{ $multiply: ["$$this.quantity", "$$this.unitPrice"] }, { $divide: ["$$this.gst", 100] }] }] },
    },
  };

  const revenueMatch = { ...baseMatch, billType: "pay" };

  const [overview, revenueAgg, creditAgg, totalInvoices, daily, topCustomers, topProducts] = await Promise.all([
    Invoice.aggregate([{ $match: baseMatch }, { $group: { _id: "$billType", count: { $sum: 1 }, totalAmount: { $sum: "$totalAmount" }, baseAmount: { $sum: itemBase }, gstAmount: { $sum: itemGst } } }]),
    Invoice.aggregate([{ $match: revenueMatch }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    Invoice.aggregate([{ $match: { ...baseMatch, billType: "credit" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    Invoice.countDocuments(baseMatch),
    Invoice.aggregate([{ $match: revenueMatch }, { $group: { _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } }, revenue: { $sum: "$totalAmount" }, invoices: { $sum: 1 } } }, { $sort: { _id: 1 } }]),
    Invoice.aggregate([{ $match: revenueMatch }, { $group: { _id: "$customerId", name: { $first: "$customerData.name" }, revenue: { $sum: "$totalAmount" }, invoices: { $sum: 1 } } }, { $sort: { revenue: -1 } }, { $limit: 5 }]),
    Invoice.aggregate([{ $match: revenueMatch }, { $unwind: "$items" }, { $group: { _id: "$items.productId", name: { $first: "$items.name" }, quantity: { $sum: "$items.quantity" }, revenue: { $sum: { $multiply: ["$items.quantity", "$items.unitPrice"] } } } }, { $sort: { revenue: -1 } }, { $limit: 5 }]),
  ]);

  res.status(200).json({
    success: true,
    data: {
      totalInvoices,
      totalRevenue: revenueAgg[0]?.total || 0,
      totalCredit: creditAgg[0]?.total || 0,
      overview,
      daily,
      topCustomers,
      topProducts,
    },
  });
});

// @desc    Get invoices by date range - lean + capped
// @route   GET /api/invoices/reports/date-range
// @access  Public
exports.getInvoicesByDateRange = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;
  if (!startDate || !endDate) return next(new AppError("Please provide both startDate and endDate", 400));

  const e = new Date(endDate);
  if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.setHours(23, 59, 59, 999);

  const invoices = await Invoice.find({ createdAt: { $gte: new Date(startDate), $lte: e } })
    .populate("customerId", "name")
    .populate("items.productId", "name")
    .sort({ createdAt: -1 })
    .lean();

  // Compute totals without virtuals (lean loses virtuals) -> manual
  let totalRevenue = 0;
  for (const inv of invoices) {
    if (inv.billType === "pay") totalRevenue += inv.totalAmount || 0;
  }

  res.status(200).json({ success: true, count: invoices.length, totalRevenue, data: invoices });
});

// @desc    Get bulk invoice data for PDF generation - lean + no virtuals overhead
// @route   GET /api/invoices/reports/bulk-pdf
// @access  Public
exports.getBulkInvoicePDF = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, billType } = req.query;
  const query = {};
  if (startDate && endDate) {
    const e = new Date(endDate);
    if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.setHours(23, 59, 59, 999);
    query.createdAt = { $gte: new Date(startDate), $lte: e };
  }
  if (billType) query.billType = billType;

  const invoices = await Invoice.find(query).populate("customerId", "name phone gstNumber").sort({ createdAt: -1 }).lean();

  const bulkData = invoices.map((inv) => {
    // Manual subtotal/gst since lean has no virtuals: GST inclusive => subtotal is sum, gstAmount reverse? Use items sum
    const subtotal = (inv.items || []).reduce((s, it) => s + (it.quantity || 0) * (it.unitPrice || 0), 0);
    // gstAmount calc same as virtual: qty*price*gst/100
    const gstAmount = (inv.items || []).reduce((s, it) => s + ((it.quantity || 0) * (it.unitPrice || 0) * (it.gst || 0)) / 100, 0);
    const cgst = gstAmount / 2;
    const sgst = gstAmount / 2;
    const total = inv.totalAmount || subtotal;

    let customerName = "N/A";
    let customerPhone = "-";
    let customerGST = "-";
    if (inv.customerData && inv.customerData.name) {
      customerName = inv.customerData.name;
      customerPhone = inv.customerData.phone || "-";
      customerGST = inv.customerData.gstNumber || "-";
    } else if (inv.customerId) {
      customerName = inv.customerId.name || "N/A";
      customerPhone = inv.customerId.phone || "-";
      customerGST = inv.customerId.gstNumber || "-";
    }
    return {
      invoiceId: inv.invoiceNumber,
      customerName,
      customerGST,
      customerPhone,
      subtotal: subtotal.toFixed(2),
      cgst: cgst.toFixed(2),
      sgst: sgst.toFixed(2),
      total: total.toFixed(2),
      type: inv.billType === "credit" ? "Credit" : "Paid",
    };
  });

  res.status(200).json({ success: true, count: bulkData.length, data: bulkData });
});
