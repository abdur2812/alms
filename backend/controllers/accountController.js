const Invoice = require("../models/Invoice");
const Purchase = require("../models/Purchase");
const Expense = require("../models/Expense");
const StaffDailyPayment = require("../models/StaffDailyPayment");
const Product = require("../models/Product");
const StockSnapshot = require("../models/StockSnapshot");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

// Build an inclusive $gte/$lte range object from optional date strings.
const buildRange = (startDate, endDate) => {
  const range = {};
  if (startDate) {
    const s = new Date(startDate);
    if (!isNaN(s.getTime())) range.$gte = s;
  }
  if (endDate) {
    const e = new Date(endDate);
    if (!isNaN(e.getTime())) {
      if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.setHours(23, 59, 59, 999);
      range.$lte = e;
    }
  }
  return range;
};

const sum = (items, pick) => items.reduce((s, item) => s + (pick(item) || 0), 0);

// ----- Snapshot helpers (month-based opening/closing) -----
const getPrevMonthKey = (monthKey) => {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, m - 2, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
};

const getAggregatedSnapshot = async (monthKey) => {
  const docs = await StockSnapshot.find({ month: monthKey }).lean();
  if (!docs.length) return null;
  let qty = 0;
  let value = 0;
  for (const d of docs) {
    qty += d.qty || 0;
    value += d.value || 0;
  }
  return { qty, value: Math.round(value * 100) / 100, count: docs.length };
};

const generateSnapshotForMonth = async (monthKey) => {
  const [y, m] = monthKey.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
  const dayAfterEnd = new Date(Date.UTC(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth(), monthEnd.getUTCDate() + 1, 0, 0, 0, 0));
  const now = new Date();
  if (monthEnd > now) return null;
  const existing = await getAggregatedSnapshot(monthKey);
  if (existing) return existing;

  const products = await Product.find({}).select("name price stockQuantity createdAt").lean();
  let soldAfterMap = new Map();
  if (dayAfterEnd < now) {
    const soldAfterAgg = await Invoice.aggregate([
      { $match: { createdAt: { $gte: dayAfterEnd, $lte: now } } },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: null } } },
      { $group: { _id: "$items.productId", qty: { $sum: "$items.quantity" } } },
    ]);
    soldAfterMap = new Map(soldAfterAgg.map((r) => [String(r._id), r.qty]));
  }

  const bulk = [];
  let totalQty = 0;
  let totalValue = 0;
  for (const p of products) {
    const createdAt = p.createdAt ? new Date(p.createdAt) : null;
    const existedAtEnd = !createdAt || createdAt <= monthEnd;
    if (!existedAtEnd) continue;
    const currentQty = p.stockQuantity || 0;
    const soldAfter = soldAfterMap.get(String(p._id)) || 0;
    const qtyAtEnd = currentQty + soldAfter;
    const price = p.price || 0;
    const value = qtyAtEnd * price;
    totalQty += qtyAtEnd;
    totalValue += value;
    bulk.push({
      updateOne: {
        filter: { month: monthKey, productId: p._id },
        update: { $set: { productName: p.name, qty: qtyAtEnd, price, value } },
        upsert: true,
      },
    });
  }
  if (bulk.length) {
    // Chunk bulkWrite to avoid 16MB limit with 3k docs (chunk 500)
    for (let i = 0; i < bulk.length; i += 500) {
      await StockSnapshot.bulkWrite(bulk.slice(i, i + 500), { ordered: false });
    }
  }
  return { qty: totalQty, value: Math.round(totalValue * 100) / 100, count: bulk.length };
};

// @desc    Get a full accounts summary for a date range - aggregation-based, lean
// @route   GET /api/accounts/summary?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Public
exports.getAccountsSummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const invoiceQuery = {};
  const purchaseQuery = {};
  const expenseQuery = {};
  const paymentQuery = {};

  if (startDate || endDate) {
    const range = buildRange(startDate, endDate);
    if (Object.keys(range).length) {
      invoiceQuery.createdAt = range;
      purchaseQuery.date = range;
      expenseQuery.date = range;
      paymentQuery.paidAt = range;
    }
  }

  // Totals via aggregation (O(1) memory, no full doc hydration)
  const [salesAgg, purchaseAgg, expenseAgg, salaryAgg] = await Promise.all([
    Invoice.aggregate([
      { $match: invoiceQuery },
      { $group: { _id: "$billType", total: { $sum: "$totalAmount" }, count: { $sum: 1 } } },
    ]),
    Purchase.aggregate([
      { $match: purchaseQuery },
      {
        $group: {
          _id: "$chequeStatus",
          total: { $sum: "$amount" },
          chequeTotal: { $sum: { $ifNull: ["$chequeAmount", "$amount"] } },
          count: { $sum: 1 },
        },
      },
    ]),
    Expense.aggregate([{ $match: expenseQuery }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
    StaffDailyPayment.aggregate([{ $match: paymentQuery }, { $group: { _id: null, total: { $sum: "$amount" }, count: { $sum: 1 } } }]),
  ]);

  // Parse sales aggregates
  let totalSales = 0, salesCredit = 0, salesPaid = 0, salesCount = 0;
  for (const r of salesAgg) {
    totalSales += r.total || 0;
    salesCount += r.count || 0;
    if (r._id === "credit") salesCredit += r.total || 0;
    if (r._id === "pay") salesPaid += r.total || 0;
  }
  // If billType missing (all one type), ensure paid/credit derived correctly
  if (salesPaid === 0 && salesCredit !== totalSales) salesPaid = totalSales - salesCredit;

  // Purchases: need total, paid (Cleared), credit (Pending)
  let totalPurchases = 0, purchasesPaid = 0, purchasesCredit = 0, purchasesCount = 0;
  for (const r of purchaseAgg) {
    totalPurchases += r.total || 0;
    purchasesCount += r.count || 0;
    if (r._id === "Cleared") purchasesPaid += r.chequeTotal ?? r.total;
    if (r._id === "Pending") purchasesCredit += r.chequeTotal ?? r.total;
  }

  const totalExpenses = expenseAgg[0]?.total || 0;
  const expensesCount = expenseAgg[0]?.count || 0;
  const totalSalaryPaid = salaryAgg[0]?.total || 0;
  const salaryCount = salaryAgg[0]?.count || 0;

  // Fetch lists lean with projection + limit 500 to avoid OOM on unbounded range
  const LIST_LIMIT = 500;
  const [purchasesListRaw, expensesList, dailyPaymentsRaw] = await Promise.all([
    Purchase.find(purchaseQuery).populate("vendorId", "name phone").sort({ date: -1, createdAt: -1 }).limit(LIST_LIMIT).select("invoiceNumber vendorId date amount chequeDetails chequeAmount chequeStatus passedDate").lean(),
    Expense.find(expenseQuery).sort({ date: -1, createdAt: -1 }).limit(LIST_LIMIT).lean(),
    StaffDailyPayment.find(paymentQuery).populate("staffId", "name role dailyWage").sort({ paidAt: -1 }).limit(LIST_LIMIT).lean(),
  ]);

  const purchaseRows = purchasesListRaw.map((p) => ({
    _id: p._id,
    invoiceNumber: p.invoiceNumber,
    vendor: p.vendorId?.name || null,
    date: p.date,
    amount: p.amount,
    chequeDetails: p.chequeDetails,
    chequeAmount: p.chequeAmount,
    chequeStatus: p.chequeStatus,
    passedDate: p.passedDate,
  }));

  const netBalance = totalSales - totalPurchases - totalExpenses - totalSalaryPaid;

  res.status(200).json({
    success: true,
    data: {
      sales: { total: Math.round(totalSales * 100) / 100, paid: Math.round(salesPaid * 100) / 100, credit: Math.round(salesCredit * 100) / 100, count: salesCount },
      purchases: {
        total: Math.round(totalPurchases * 100) / 100,
        paid: Math.round(purchasesPaid * 100) / 100,
        credit: Math.round(purchasesCredit * 100) / 100,
        count: purchasesCount,
        purchases: purchaseRows,
      },
      expenses: { total: Math.round(totalExpenses * 100) / 100, count: expensesCount, list: expensesList },
      staff: { totalPaid: Math.round(totalSalaryPaid * 100) / 100, count: salaryCount, dailyCount: salaryCount, dailyPayments: dailyPaymentsRaw },
      netBalance: Math.round(netBalance * 100) / 100,
    },
  });
});

// @desc    Get total quantity sold per HSN code for a date range
// @route   GET /api/accounts/hsn?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Public
exports.getHsnSummary = asyncHandler(async (req, res, next) => {
  const { startDate, endDate } = req.query;

  const hsnAgg = await Invoice.aggregate([
    {
      $match: {
        "items.hsnCode": { $exists: true, $ne: "" },
        ...(startDate || endDate ? { createdAt: buildRange(startDate, endDate) } : {}),
      },
    },
    { $unwind: "$items" },
    { $match: { "items.hsnCode": { $exists: true, $nin: ["", null] } } },
    {
      $group: {
        _id: { $toUpper: { $trim: { input: "$items.hsnCode" } } },
        quantity: { $sum: "$items.quantity" },
        totalPrice: { $sum: { $multiply: ["$items.quantity", { $ifNull: ["$items.unitPrice", 0] }] } },
        totalBase: {
          $sum: {
            $divide: [
              { $multiply: ["$items.quantity", { $ifNull: ["$items.unitPrice", 0] }] },
              { $add: [1, { $divide: [{ $ifNull: ["$items.gst", 18] }, 100] }] },
            ],
          },
        },
        minUnitPrice: { $min: { $ifNull: ["$items.unitPrice", 0] } },
        maxUnitPrice: { $max: { $ifNull: ["$items.unitPrice", 0] } },
        minGst: { $min: { $ifNull: ["$items.gst", 18] } },
        maxGst: { $max: { $ifNull: ["$items.gst", 18] } },
      },
    },
    { $sort: { quantity: -1, _id: 1 } },
  ]);

  const rows = hsnAgg.map((r) => {
    const totalPrice = Math.round(r.totalPrice * 100) / 100;
    const totalBaseRaw = r.totalBase || 0;
    const totalBase = Math.round(totalBaseRaw * 100) / 100;
    const totalGst = Math.round((totalPrice - totalBase) * 100) / 100;
    const quantity = r.quantity;
    const unitPrice = quantity ? Math.round((r.totalPrice / quantity) * 100) / 100 : 0;
    const baseUnitPrice = quantity ? Math.round((totalBase / quantity) * 100) / 100 : 0;
    const gstPerUnit = Math.round((unitPrice - baseUnitPrice) * 100) / 100;
    const minUnitPrice = r.minUnitPrice != null ? Math.round(r.minUnitPrice * 100) / 100 : 0;
    const maxUnitPrice = r.maxUnitPrice != null ? Math.round(r.maxUnitPrice * 100) / 100 : 0;
    // For range display, also compute base for min/max assuming same GST (approx)
    const avgGst = r.minGst === r.maxGst ? r.minGst : 18;
    const minBaseUnit = minUnitPrice ? Math.round((minUnitPrice / (1 + avgGst / 100)) * 100) / 100 : 0;
    const maxBaseUnit = maxUnitPrice ? Math.round((maxUnitPrice / (1 + avgGst / 100)) * 100) / 100 : 0;
    return {
      hsnCode: r._id,
      quantity,
      totalPrice,
      totalBase,
      totalGst,
      unitPrice,
      baseUnitPrice,
      gstPerUnit,
      minUnitPrice,
      maxUnitPrice,
      minBaseUnit,
      maxBaseUnit,
      hasMultiplePrices: minUnitPrice !== maxUnitPrice,
    };
  });

  res.status(200).json({
    success: true,
    data: {
      total: sum(rows, (r) => r.quantity),
      totalValue: Math.round(sum(rows, (r) => r.totalPrice) * 100) / 100,
      totalBase: Math.round(sum(rows, (r) => r.totalBase) * 100) / 100,
      totalGst: Math.round(sum(rows, (r) => r.totalGst) * 100) / 100,
      count: rows.length,
      rows,
    },
  });
});

// @desc    Get monthly accounts report: opening/closing stock, purchases, sales, salaries, expenses by category
// @route   GET /api/accounts/report?month=YYYY-MM or ?startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Public
exports.getAccountsReport = asyncHandler(async (req, res, next) => {
  let { month, startDate, endDate } = req.query;

  let monthStart;
  let monthEnd;
  let monthLabel = "";

  if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    monthStart = new Date(Date.UTC(y, m - 1, 1, 0, 0, 0, 0));
    monthEnd = new Date(Date.UTC(y, m, 0, 23, 59, 59, 999));
    monthLabel = month;
  } else if (startDate || endDate) {
    if (!startDate || !endDate) {
      return next(new AppError("Both startDate and endDate are required (YYYY-MM-DD) if month not provided", 400));
    }
    const s = new Date(`${startDate}T00:00:00.000Z`);
    const e = new Date(`${endDate}T23:59:59.999Z`);
    if (isNaN(s.getTime()) || isNaN(e.getTime())) {
      return next(new AppError("Invalid startDate or endDate (YYYY-MM-DD)", 400));
    }
    monthStart = s;
    monthEnd = e;
    monthLabel = `${startDate} to ${endDate}`;
  } else {
    const now = new Date();
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth();
    monthStart = new Date(Date.UTC(y, m, 1, 0, 0, 0, 0));
    monthEnd = new Date(Date.UTC(y, m + 1, 0, 23, 59, 59, 999));
    monthLabel = `${y}-${String(m + 1).padStart(2, "0")}`;
  }

  const dayAfterEnd = new Date(Date.UTC(monthEnd.getUTCFullYear(), monthEnd.getUTCMonth(), monthEnd.getUTCDate() + 1, 0, 0, 0, 0));
  const nowUTC = new Date();

  // Parallelize independent aggregates
  const [purchasesAgg, salesAgg, dailySalaries, expensesByCategoryAgg] = await Promise.all([
    Purchase.aggregate([{ $match: { date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, total: { $sum: "$amount" } } }]),
    Invoice.aggregate([{ $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]),
    StaffDailyPayment.find({ paidAt: { $gte: monthStart, $lte: monthEnd } }).select("amount paidAt").lean(),
    Expense.aggregate([{ $match: { date: { $gte: monthStart, $lte: monthEnd } } }, { $group: { _id: "$category", total: { $sum: "$amount" }, count: { $sum: 1 } } }, { $sort: { total: -1, _id: 1 } }]),
  ]);

  const purchasesTotal = Math.round((purchasesAgg[0]?.total || 0) * 100) / 100;
  const salesTotal = Math.round((salesAgg[0]?.total || 0) * 100) / 100;
  const salariesTotal = Math.round(sum(dailySalaries, (p) => p.amount) * 100) / 100;
  const salariesCount = dailySalaries.length;

  const expensesByCategory = expensesByCategoryAgg.map((r) => ({ category: r._id || "Uncategorized", total: Math.round(r.total * 100) / 100, count: r.count }));
  const expensesTotal = Math.round(sum(expensesByCategory, (c) => c.total) * 100) / 100;

  // Stock valuation
  let openingStockValue;
  let closingStockValue;
  let openingStockQty;
  let closingStockQty;
  const isMonthEndInFuture = monthEnd > nowUTC;
  const isMonthSnapshot = !!(month && /^\d{4}-\d{2}$/.test(month)) || (!month && !startDate && !endDate);

  if (isMonthSnapshot) {
    const targetMonthKey = month && /^\d{4}-\d{2}$/.test(month) ? month : monthLabel;
    const prevMonthKey = getPrevMonthKey(targetMonthKey);
    let openingAgg = await getAggregatedSnapshot(prevMonthKey);
    if (!openingAgg) {
      const [py, pm] = prevMonthKey.split("-").map(Number);
      const prevEnd = new Date(Date.UTC(py, pm, 0, 23, 59, 59, 999));
      if (prevEnd < nowUTC) openingAgg = await generateSnapshotForMonth(prevMonthKey);
    }
    openingStockQty = openingAgg ? openingAgg.qty : 0;
    openingStockValue = openingAgg ? openingAgg.value : 0;

    if (isMonthEndInFuture) {
      closingStockQty = null;
      closingStockValue = null;
    } else {
      let closingAgg = await getAggregatedSnapshot(targetMonthKey);
      if (!closingAgg) closingAgg = await generateSnapshotForMonth(targetMonthKey);
      closingStockQty = closingAgg ? closingAgg.qty : 0;
      closingStockValue = closingAgg ? closingAgg.value : 0;
    }
  } else {
    const products = await Product.find({}).select("name price stockQuantity createdAt").lean();
    const soldInRangeAgg = await Invoice.aggregate([
      { $match: { createdAt: { $gte: monthStart, $lte: monthEnd } } },
      { $unwind: "$items" },
      { $match: { "items.productId": { $ne: null } } },
      { $group: { _id: "$items.productId", qty: { $sum: "$items.quantity" } } },
    ]);
    const soldInRangeMap = new Map(soldInRangeAgg.map((r) => [String(r._id), r.qty]));

    let soldAfterMap = new Map();
    if (dayAfterEnd < nowUTC) {
      const soldAfterAgg = await Invoice.aggregate([
        { $match: { createdAt: { $gte: dayAfterEnd, $lte: nowUTC } } },
        { $unwind: "$items" },
        { $match: { "items.productId": { $ne: null } } },
        { $group: { _id: "$items.productId", qty: { $sum: "$items.quantity" } } },
      ]);
      soldAfterMap = new Map(soldAfterAgg.map((r) => [String(r._id), r.qty]));
    }

    let oQty = 0, oVal = 0, cQty = 0, cVal = 0;
    for (const p of products) {
      const soldInRange = soldInRangeMap.get(String(p._id)) || 0;
      const soldAfter = soldAfterMap.get(String(p._id)) || 0;
      const currentQty = p.stockQuantity || 0;
      const price = p.price || 0;
      const createdAt = p.createdAt ? new Date(p.createdAt) : null;
      const existedAtStart = !createdAt || createdAt <= monthStart;
      const existedAtEnd = !createdAt || createdAt <= monthEnd;

      let closingQty = null;
      if (!isMonthEndInFuture) {
        if (existedAtEnd) {
          closingQty = currentQty + soldAfter;
          cQty += closingQty;
          cVal += closingQty * price;
        } else closingQty = 0;
      }
      let openingQty = 0;
      if (!existedAtStart) openingQty = 0;
      else if (!isMonthEndInFuture) openingQty = closingQty + soldInRange;
      else openingQty = currentQty + soldAfter + soldInRange;
      if (existedAtStart) { oQty += openingQty; oVal += openingQty * price; }
    }
    openingStockQty = oQty;
    openingStockValue = Math.round(oVal * 100) / 100;
    if (!isMonthEndInFuture) { closingStockQty = cQty; closingStockValue = Math.round(cVal * 100) / 100; }
    else { closingStockQty = null; closingStockValue = null; }
  }

  // Count queries in parallel where possible
  const [pCount, sCount] = await Promise.all([
    Purchase.countDocuments({ date: { $gte: monthStart, $lte: monthEnd } }),
    Invoice.countDocuments({ createdAt: { $gte: monthStart, $lte: monthEnd } }),
  ]);

  res.status(200).json({
    success: true,
    data: {
      month: monthLabel,
      range: { start: monthStart.toISOString().split("T")[0], end: monthEnd.toISOString().split("T")[0] },
      openingStock: { qty: openingStockQty, value: openingStockValue },
      closingStock: { qty: closingStockQty, value: closingStockValue },
      purchases: { total: purchasesTotal, count: pCount },
      sales: { total: salesTotal, count: sCount },
      salaries: { total: salariesTotal, count: salariesCount, dailyCount: dailySalaries.length },
      expenses: { total: expensesTotal, count: expensesByCategory.reduce((s, c) => s + c.count, 0), byCategory: expensesByCategory },
    },
  });
});
