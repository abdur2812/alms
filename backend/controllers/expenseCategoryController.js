const ExpenseCategory = require("../models/ExpenseCategory");
const Expense = require("../models/Expense");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get all expense categories - lean
// @route   GET /api/expense-categories
// @access  Public
exports.getAllCategories = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
  const query = {};
  if (search) {
    const safe = escapeRegex(search.trim());
    query.name = { $regex: safe, $options: "i" };
  }
  const categories = await ExpenseCategory.find(query).sort({ name: 1 }).lean();
  res.status(200).json({ success: true, count: categories.length, data: categories });
});

// @desc    Create category
// @route   POST /api/expense-categories
// @access  Public
exports.createCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  if (!name || !String(name).trim()) return next(new AppError("Category name is required", 400));
  const trimmed = String(name).trim();
  const existing = await ExpenseCategory.findOne({ name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" } }).lean();
  if (existing) {
    return next(new AppError("Category already exists", 409));
  }
  const category = await ExpenseCategory.create({
    name: trimmed,
    description: description ? String(description).trim() : "",
  });
  res.status(201).json({ success: true, message: "Category created", data: category });
});

// @desc    Update category
// @route   PUT /api/expense-categories/:id
// @access  Public
exports.updateCategory = asyncHandler(async (req, res, next) => {
  const { name, description } = req.body;
  const category = await ExpenseCategory.findById(req.params.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }
  const update = {};
  if (name !== undefined) {
    const trimmed = String(name).trim();
    if (!trimmed) return next(new AppError("Category name is required", 400));
    // Check duplicate excluding self
    const dup = await ExpenseCategory.findOne({
      _id: { $ne: category._id },
      name: { $regex: `^${escapeRegex(trimmed)}$`, $options: "i" },
    });
    if (dup) return next(new AppError("Category already exists", 409));
    const oldName = category.name;
    update.name = trimmed;
    // Optionally update existing expenses that used old name to new name? Keep as is? We will update them to keep consistency
    // If name changed, update all expenses with old category name
    if (oldName !== trimmed) {
      await Expense.updateMany({ category: oldName }, { $set: { category: trimmed } });
    }
  }
  if (description !== undefined) update.description = String(description).trim();

  const updated = await ExpenseCategory.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({ success: true, message: "Category updated", data: updated });
});

// @desc    Delete category
// @route   DELETE /api/expense-categories/:id
// @access  Public
exports.deleteCategory = asyncHandler(async (req, res, next) => {
  const category = await ExpenseCategory.findById(req.params.id);
  if (!category) {
    return next(new AppError("Category not found", 404));
  }
  const inUse = await Expense.countDocuments({ category: category.name });
  if (inUse > 0) {
    return next(new AppError(`Cannot delete — ${inUse} expense(s) use this category. Reassign or delete them first.`, 400));
  }
  await ExpenseCategory.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: "Category deleted", data: {} });
});

// @desc    Seed default categories if none exist (called internally) - lean + insertMany
exports.seedDefaults = async () => {
  const count = await ExpenseCategory.estimatedDocumentCount();
  if (count === 0) {
    const defaults = ["Utilities", "Maintenance", "Stationery", "Miscellaneous", "Rent", "Salary", "Fuel", "Transport"];
    try {
      await ExpenseCategory.insertMany(defaults.map((name) => ({ name })), { ordered: false });
    } catch (e) {
      // ignore duplicates
    }
  }
};
