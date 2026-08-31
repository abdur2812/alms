const Purchase = require("../models/Purchase");
const Vendor = require("../models/Vendor");
const { AppError, asyncHandler } = require("../middleware/errorHandler");
const { parsePagination } = require("../utils/queryHelpers");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Preview next purchase number
// @route   GET /api/purchases/preview-number
// @access  Public
exports.getNextPurchaseNumber = asyncHandler(async (req, res, next) => {
  const purchaseNumber = await Purchase.peekNextPurchaseNumber();
  res.status(200).json({ success: true, data: { purchaseNumber } });
});

// @desc    Get purchase report (per-vendor + date-filterable)
// @route   GET /api/purchases/reports/monthly?month=YYYY-MM&vendorId=...&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Public
// Supports: ?month=YYYY-MM (legacy, whole-company monthly) OR ?startDate&endDate range, optionally filtered by ?vendorId
exports.getMonthlyReport = asyncHandler(async (req, res, next) => {
  const { month, vendorId, startDate, endDate } = req.query;

  let start;
  let end;
  let resolvedMonth = month || null;

  const hasRange = Boolean(startDate || endDate);

  if (hasRange) {
    // Date-range mode: takes precedence over month when either bound is supplied
    if (startDate) {
      start = new Date(startDate);
      if (Number.isNaN(start.getTime())) {
        return next(new AppError("Invalid startDate (use YYYY-MM-DD)", 400));
      }
    }
    if (endDate) {
      end = new Date(endDate);
      if (Number.isNaN(end.getTime())) {
        return next(new AppError("Invalid endDate (use YYYY-MM-DD)", 400));
      }
      // Inclusive end-of-day
      end.setHours(23, 59, 59, 999);
    }
    if (!start && end) {
      // Only end provided → no lower bound, but we still need a start for response; keep start undefined
    }
    if (!start && !end) {
      return next(new AppError("Please provide startDate and/or endDate or month", 400));
    }
    // If month not supplied but range is, clear month in response to avoid confusion
    resolvedMonth = null;
  } else {
    if (!month || !/^\d{4}-\d{2}$/.test(month)) {
      return next(new AppError("Please provide a valid month (YYYY-MM) or startDate/endDate", 400));
    }
    const [year, monthNum] = month.split("-").map(Number);
    if (monthNum < 1 || monthNum > 12) {
      return next(new AppError("Please provide a valid month (YYYY-MM)", 400));
    }
    start = new Date(Date.UTC(year, monthNum - 1, 1));
    end = new Date(Date.UTC(year, monthNum, 0, 23, 59, 59, 999));
  }

  const dateQuery = {};
  if (start) dateQuery.$gte = start;
  if (end) dateQuery.$lte = end;

  const query = {};
  if (Object.keys(dateQuery).length) query.date = dateQuery;

  let vendor = null;
  if (vendorId) {
    const mongoose = require("mongoose");
    if (!mongoose.Types.ObjectId.isValid(vendorId)) {
      return next(new AppError("Invalid vendorId", 400));
    }
    vendor = await Vendor.findById(vendorId).lean();
    if (!vendor) {
      return next(new AppError("Vendor not found", 404));
    }
    query.vendorId = vendorId;
  }

  // Lean + aggregation for sums to avoid loading giant docs twice
  const [purchases, sums] = await Promise.all([
    Purchase.find(query).populate("vendorId", "name phone gstNumber address bankDetails").sort({ date: 1, createdAt: 1 }).lean(),
    Purchase.aggregate([
      { $match: query },
      {
        $group: {
          _id: "$chequeStatus",
          count: { $sum: 1 },
          amount: { $sum: "$amount" },
        },
      },
    ]),
  ]);

  const sumByStatus = new Map(sums.map((s) => [s._id, s]));
  const getSum = (status) => sumByStatus.get(status) || { count: 0, amount: 0 };

  const rows = purchases.map((p) => ({
    _id: p._id,
    purchaseNumber: p.purchaseNumber,
    invoiceNumber: p.invoiceNumber,
    date: p.date,
    vendor: p.vendorId?.name || null,
    amount: p.amount,
    chequeDetails: p.chequeDetails,
    chequeAmount: p.chequeAmount,
    chequeStatus: p.chequeStatus,
    passedDate: p.passedDate,
  }));

  const round2 = (n) => Math.round(n * 100) / 100;
  const totalAgg = Array.from(sumByStatus.values()).reduce((a, v) => ({ count: a.count + v.count, amount: a.amount + v.amount }), { count: 0, amount: 0 });

  // Compute totals from aggregation (O(1) memory) not from full docs
  const cleared = getSum("Cleared");
  const pending = getSum("Pending");
  const bounced = getSum("Bounced");

  res.status(200).json({
    success: true,
    data: {
      month: resolvedMonth,
      startDate: start || null,
      endDate: end || null,
      vendor: vendor
        ? {
            _id: vendor._id,
            name: vendor.name,
            phone: vendor.phone,
            address: vendor.address,
            gstNumber: vendor.gstNumber,
            bankDetails: vendor.bankDetails,
          }
        : null,
      total: { count: totalAgg.count, amount: round2(totalAgg.amount) },
      cleared: { count: cleared.count, amount: round2(cleared.amount) },
      pending: { count: pending.count, amount: round2(pending.amount) },
      bounced: { count: bounced.count, amount: round2(bounced.amount) },
      purchases: rows,
    },
  });
});

// @desc    Get all purchases (paginated, searchable, date-filterable)
// @route   GET /api/purchases
// @access  Public
exports.getAllPurchases = asyncHandler(async (req, res, next) => {
  const { search, startDate, endDate, chequeStatus, vendorId } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });

  const query = {};

  if (chequeStatus) {
    const allowed = ["Pending", "Cleared", "Bounced"];
    if (allowed.includes(chequeStatus)) query.chequeStatus = chequeStatus;
  }
  if (vendorId) {
    const mongoose = require("mongoose");
    if (mongoose.Types.ObjectId.isValid(vendorId)) query.vendorId = vendorId;
  }

  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.setHours(23, 59, 59, 999);
      query.date.$lte = e;
    }
  }

  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { invoiceNumber: { $regex: safe, $options: "i" } },
      { purchaseNumber: { $regex: safe, $options: "i" } },
    ];
  }

  const [purchases, total] = await Promise.all([
    Purchase.find(query).populate("vendorId", "name phone gstNumber address bankDetails").sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Purchase.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: purchases.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data: purchases,
  });
});

// @desc    Get single purchase by ID
// @route   GET /api/purchases/:id
// @access  Public
exports.getPurchaseById = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id).populate("vendorId", "name phone address gstNumber bankDetails").lean();
  if (!purchase) return next(new AppError(`Purchase not found with id: ${req.params.id}`, 404));
  res.status(200).json({ success: true, data: purchase });
});

// @desc    Create new purchase
// @route   POST /api/purchases
// @access  Public
exports.createPurchase = asyncHandler(async (req, res, next) => {
  const {
    invoiceNumber,
    vendorId,
    date,
    amount,
    chequeDetails,
    chequeAmount,
    chequeStatus,
    passedDate,
  } = req.body;

  if (!invoiceNumber || !invoiceNumber.trim()) {
    return next(new AppError("Vendor invoice number is required", 400));
  }
  if (amount === undefined || amount === null || amount === "") {
    return next(new AppError("Amount is required", 400));
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return next(new AppError("Amount must be a non-negative number", 400));
  }

  if (vendorId) {
    const vendorExists = await Vendor.exists({ _id: vendorId });
    if (!vendorExists) {
      return next(new AppError("Vendor not found", 400));
    }
  }

  const purchaseNumber = await Purchase.generatePurchaseNumber();

  const purchase = await Purchase.create({
    purchaseNumber,
    invoiceNumber: invoiceNumber.trim(),
    vendorId: vendorId || null,
    date: date || Date.now(),
    amount: parsedAmount,
    chequeDetails: chequeDetails || "",
    chequeAmount:
      chequeAmount !== undefined && chequeAmount !== null && chequeAmount !== ""
        ? parseFloat(chequeAmount)
        : 0,
    chequeStatus: chequeStatus || "Pending",
    passedDate: passedDate || null,
  });

  res.status(201).json({
    success: true,
    message: "Purchase created successfully",
    data: purchase,
  });
});

// @desc    Update purchase
// @route   PUT /api/purchases/:id
// @access  Public
exports.updatePurchase = asyncHandler(async (req, res, next) => {
  let purchase = await Purchase.findById(req.params.id);
  if (!purchase) {
    return next(
      new AppError(`Purchase not found with id: ${req.params.id}`, 404),
    );
  }

  const update = {};
  if (req.body.invoiceNumber !== undefined) {
    if (!req.body.invoiceNumber.trim()) {
      return next(new AppError("Vendor invoice number is required", 400));
    }
    update.invoiceNumber = req.body.invoiceNumber.trim();
  }
  if (req.body.vendorId !== undefined) {
    if (req.body.vendorId) {
      const vendorExists = await Vendor.exists({ _id: req.body.vendorId });
      if (!vendorExists) {
        return next(new AppError("Vendor not found", 400));
      }
    }
    update.vendorId = req.body.vendorId || null;
  }
  if (req.body.date !== undefined) update.date = req.body.date;
  if (req.body.amount !== undefined) {
    const parsedAmount = parseFloat(req.body.amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return next(new AppError("Amount must be a non-negative number", 400));
    }
    update.amount = parsedAmount;
  }
  if (req.body.chequeDetails !== undefined) update.chequeDetails = req.body.chequeDetails || "";
  if (req.body.chequeAmount !== undefined) {
    update.chequeAmount =
      req.body.chequeAmount === "" || req.body.chequeAmount === null
        ? 0
        : parseFloat(req.body.chequeAmount);
  }
  if (req.body.chequeStatus !== undefined) update.chequeStatus = req.body.chequeStatus;
  if (req.body.passedDate !== undefined) update.passedDate = req.body.passedDate || null;

  purchase = await Purchase.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  }).populate("vendorId", "name phone address gstNumber bankDetails");

  res.status(200).json({
    success: true,
    message: "Purchase updated successfully",
    data: purchase,
  });
});

// @desc    Delete purchase
// @route   DELETE /api/purchases/:id
// @access  Public
exports.deletePurchase = asyncHandler(async (req, res, next) => {
  const purchase = await Purchase.findById(req.params.id);
  if (!purchase) {
    return next(
      new AppError(`Purchase not found with id: ${req.params.id}`, 404),
    );
  }

  await Purchase.findByIdAndDelete(req.params.id);
  await Purchase.syncCounterAfterDelete();

  res.status(200).json({
    success: true,
    message: "Purchase deleted successfully",
    data: {},
  });
});