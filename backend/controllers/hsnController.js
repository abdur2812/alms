const Hsn = require("../models/Hsn");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Seed defaults on first run so the invoice HSN dropdown is never empty.
const DEFAULT_HSN_CODES = [
  "73201020",
  "73201011",
  "73181500",
  "87089900",
  "73209020",
  "40169990",
  "73181011",
  "73182200",
  "73181600",
  "73209090",
  "87082900",
];

// @desc    Get all HSN codes (seeds defaults when collection is empty)
// @route   GET /api/hsns
// @access  Public
exports.getAllHsns = asyncHandler(async (req, res, next) => {
  // Seed only once; count is cheap with index on code, but avoid per-request count if cached?
  const count = await Hsn.estimatedDocumentCount();
  if (count === 0) {
    try {
      await Hsn.insertMany(DEFAULT_HSN_CODES.map((code) => ({ code })), { ordered: false });
    } catch (e) {
      // ignore duplicates from race
    }
  }

  const { search } = req.query;
  const query = {};
  if (search) {
    const safe = escapeRegex(search);
    query.code = { $regex: safe, $options: "i" };
  }

  const hsns = await Hsn.find(query).sort({ code: 1 }).lean();

  res.status(200).json({ success: true, count: hsns.length, data: hsns });
});

// @desc    Create a new HSN code
// @route   POST /api/hsns
// @access  Public
exports.createHsn = asyncHandler(async (req, res, next) => {
  const { code, description } = req.body;
  if (!code || !String(code).trim()) return next(new AppError("HSN code is required", 400));
  const normalized = String(code).trim().toUpperCase();
  const existing = await Hsn.findOne({ code: normalized }).lean();
  if (existing) return next(new AppError("HSN code already exists", 400));

  const hsn = await Hsn.create({
    code: normalized,
    description: description || "",
  });

  res.status(201).json({
    success: true,
    message: "HSN code added successfully",
    data: hsn,
  });
});

// @desc    Delete an HSN code
// @route   DELETE /api/hsns/:id
// @access  Public
exports.deleteHsn = asyncHandler(async (req, res, next) => {
  const hsn = await Hsn.findById(req.params.id);
  if (!hsn) {
    return next(new AppError("HSN code not found", 404));
  }

  await Hsn.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "HSN code deleted successfully",
    data: {},
  });
});