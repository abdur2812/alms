const Vendor = require("../models/Vendor");
const { AppError, asyncHandler } = require("../middleware/errorHandler");
const { parsePagination } = require("../utils/queryHelpers");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const sanitizeBankDetails = (bd) => {
  if (!bd || typeof bd !== "object") return undefined;
  const out = {};
  if (bd.accountHolder !== undefined) out.accountHolder = String(bd.accountHolder).trim();
  if (bd.bankName !== undefined) out.bankName = String(bd.bankName).trim();
  if (bd.branchName !== undefined) out.branchName = String(bd.branchName).trim();
  if (bd.accountNumber !== undefined) out.accountNumber = String(bd.accountNumber).trim();
  if (bd.ifscCode !== undefined) out.ifscCode = String(bd.ifscCode).trim().toUpperCase();
  // Only return if at least one field was supplied
  return Object.keys(out).length ? out : undefined;
};

const sanitizeGstNumber = (val) => {
  if (val === undefined || val === null) return undefined;
  const s = String(val).trim().toUpperCase();
  return s;
};

// @desc    Get all vendors (paginated, searchable) - lean
// @route   GET /api/vendors
// @access  Public
exports.getAllVendors = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });

  const query = {};
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
      { address: { $regex: safe, $options: "i" } },
      { gstNumber: { $regex: safe, $options: "i" } },
      { "bankDetails.accountHolder": { $regex: safe, $options: "i" } },
      { "bankDetails.bankName": { $regex: safe, $options: "i" } },
      { "bankDetails.accountNumber": { $regex: safe, $options: "i" } },
      { "bankDetails.ifscCode": { $regex: safe, $options: "i" } },
    ];
  }

  const [vendors, total] = await Promise.all([
    Vendor.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Vendor.countDocuments(query),
  ]);

  res.status(200).json({ success: true, count: vendors.length, total, totalPages: Math.ceil(total / limit), currentPage: page, data: vendors });
});

// @desc    Get single vendor by ID
// @route   GET /api/vendors/:id
// @access  Public
exports.getVendorById = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id).lean();
  if (!vendor) return next(new AppError(`Vendor not found with id: ${req.params.id}`, 404));
  res.status(200).json({ success: true, data: vendor });
});

// @desc    Create new vendor
// @route   POST /api/vendors
// @access  Public
exports.createVendor = asyncHandler(async (req, res, next) => {
  const { name, phone, address, gstNumber, bankDetails } = req.body;

  if (!name || !name.trim()) {
    return next(new AppError("Vendor name is required", 400));
  }

  const sanitizedGst = sanitizeGstNumber(gstNumber);
  const sanitizedBank = sanitizeBankDetails(bankDetails);

  const vendor = await Vendor.create({
    name: name.trim(),
    phone: phone ? String(phone).trim() : phone,
    address: address ? String(address).trim() : address,
    ...(sanitizedGst !== undefined ? { gstNumber: sanitizedGst } : {}),
    ...(sanitizedBank ? { bankDetails: sanitizedBank } : {}),
  });

  res.status(201).json({
    success: true,
    message: "Vendor created successfully",
    data: vendor,
  });
});

// @desc    Update vendor
// @route   PUT /api/vendors/:id
// @access  Public
exports.updateVendor = asyncHandler(async (req, res, next) => {
  let vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return next(new AppError(`Vendor not found with id: ${req.params.id}`, 404));
  }

  const update = {};
  if (req.body.name !== undefined) update.name = String(req.body.name).trim();
  if (req.body.phone !== undefined) update.phone = req.body.phone ? String(req.body.phone).trim() : req.body.phone;
  if (req.body.address !== undefined) update.address = req.body.address ? String(req.body.address).trim() : req.body.address;
  if (req.body.gstNumber !== undefined) update.gstNumber = sanitizeGstNumber(req.body.gstNumber);
  if (req.body.bankDetails !== undefined) {
    const sanitizedBank = sanitizeBankDetails(req.body.bankDetails);
    if (sanitizedBank) {
      // Merge with existing to avoid wiping unspecified sub-fields on partial updates
      const existing = vendor.bankDetails ? vendor.bankDetails.toObject() : {};
      update.bankDetails = { ...existing, ...sanitizedBank };
      // Handle explicit empty strings to clear fields
      Object.keys(req.body.bankDetails).forEach((k) => {
        if (req.body.bankDetails[k] === "" || req.body.bankDetails[k] === null) {
          update.bankDetails[k] = "";
        }
      });
    } else if (req.body.bankDetails === null) {
      update.bankDetails = {};
    }
  }

  vendor = await Vendor.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Vendor updated successfully",
    data: vendor,
  });
});

// @desc    Delete vendor
// @route   DELETE /api/vendors/:id
// @access  Public
exports.deleteVendor = asyncHandler(async (req, res, next) => {
  const vendor = await Vendor.findById(req.params.id);
  if (!vendor) {
    return next(new AppError(`Vendor not found with id: ${req.params.id}`, 404));
  }

  await Vendor.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Vendor deleted successfully",
    data: {},
  });
});