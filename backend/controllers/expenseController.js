const Expense = require("../models/Expense");
const { AppError, asyncHandler } = require("../middleware/errorHandler");
const { parsePagination } = require("../utils/queryHelpers");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get all expenses (paginated, date/category filtered) - lean
// @route   GET /api/expenses
// @access  Public
exports.getAllExpenses = asyncHandler(async (req, res, next) => {
  const { startDate, endDate, category, search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 50 });

  const query = {};
  if (startDate || endDate) {
    query.date = {};
    if (startDate) query.date.$gte = new Date(startDate);
    if (endDate) {
      const e = new Date(endDate);
      if (typeof endDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(endDate)) e.setHours(23, 59, 59, 999);
      query.date.$lte = e;
    }
  }
  if (category) query.category = category;
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { description: { $regex: safe, $options: "i" } },
      { category: { $regex: safe, $options: "i" } },
    ];
  }

  const [expenses, total] = await Promise.all([
    Expense.find(query).sort({ date: -1, createdAt: -1 }).skip(skip).limit(limit).lean(),
    Expense.countDocuments(query),
  ]);

  res.status(200).json({ success: true, count: expenses.length, total, totalPages: Math.ceil(total / limit), currentPage: page, data: expenses });
});

// @desc    Get single expense by ID
// @route   GET /api/expenses/:id
// @access  Public
exports.getExpenseById = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id).lean();
  if (!expense) return next(new AppError(`Expense not found with id: ${req.params.id}`, 404));
  res.status(200).json({ success: true, data: expense });
});

// @desc    Create a new expense
// @route   POST /api/expenses
// @access  Public
exports.createExpense = asyncHandler(async (req, res, next) => {
  const { date, description, category, amount, paidBy } = req.body;

  if (!description || !String(description).trim()) {
    return next(new AppError("Expense description is required", 400));
  }
  if (amount === undefined || amount === null || amount === "") {
    return next(new AppError("Amount is required", 400));
  }
  const parsedAmount = parseFloat(amount);
  if (isNaN(parsedAmount) || parsedAmount < 0) {
    return next(new AppError("Amount must be a non-negative number", 400));
  }

  const expense = await Expense.create({
    date: date || Date.now(),
    description: String(description).trim(),
    category: category || "Miscellaneous",
    amount: parsedAmount,
    paidBy: paidBy || "Cash",
  });

  res.status(201).json({
    success: true,
    message: "Expense added successfully",
    data: expense,
  });
});

// @desc    Update expense
// @route   PUT /api/expenses/:id
// @access  Public
exports.updateExpense = asyncHandler(async (req, res, next) => {
  let expense = await Expense.findById(req.params.id);
  if (!expense) {
    return next(new AppError(`Expense not found with id: ${req.params.id}`, 404));
  }

  const update = {};
  if (req.body.date !== undefined) update.date = req.body.date;
  if (req.body.description !== undefined) {
    if (!String(req.body.description).trim()) {
      return next(new AppError("Expense description is required", 400));
    }
    update.description = String(req.body.description).trim();
  }
  if (req.body.category !== undefined) update.category = req.body.category;
  if (req.body.paidBy !== undefined) update.paidBy = req.body.paidBy;
  if (req.body.amount !== undefined) {
    const parsedAmount = parseFloat(req.body.amount);
    if (isNaN(parsedAmount) || parsedAmount < 0) {
      return next(new AppError("Amount must be a non-negative number", 400));
    }
    update.amount = parsedAmount;
  }

  expense = await Expense.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Expense updated successfully",
    data: expense,
  });
});

// @desc    Delete expense
// @route   DELETE /api/expenses/:id
// @access  Public
exports.deleteExpense = asyncHandler(async (req, res, next) => {
  const expense = await Expense.findById(req.params.id);
  if (!expense) {
    return next(new AppError(`Expense not found with id: ${req.params.id}`, 404));
  }

  await Expense.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Expense deleted successfully",
    data: {},
  });
});