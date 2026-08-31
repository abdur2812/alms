const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const { AppError, asyncHandler } = require("../middleware/errorHandler");
const { parsePagination } = require("../utils/queryHelpers");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get all customers - lean + bounded pagination
// @route   GET /api/customers
// @access  Public
exports.getAllCustomers = asyncHandler(async (req, res, next) => {
  const { search, hasCreditInvoices } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });

  const query = {};

  if (hasCreditInvoices === "true") {
    const creditInvoices = await Invoice.find({ billType: "credit" }).distinct("customerId");
    query._id = { $in: creditInvoices };
  }

  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
    ];
  }

  // Use lean + select to keep payload small; limit populated invoices to latest 50 per customer
  const [customers, count] = await Promise.all([
    Customer.find(query)
      .skip(skip)
      .limit(limit)
      .sort({ createdAt: -1 })
      .populate({
        path: "invoices",
        select: "invoiceNumber totalAmount billType createdAt",
        options: { sort: { createdAt: -1 }, perDocumentLimit: 50 },
      })
      .lean(),
    Customer.countDocuments(query),
  ]);

  const customersWithCredit = customers.map((customer) => {
    const creditInvoices = (customer.invoices || []).filter((inv) => inv.billType === "credit");
    const creditAmount = creditInvoices.reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
    return {
      ...customer,
      creditAmount,
      creditInvoices,
      totalInvoices: customer.invoices.length,
    };
  });

  res.status(200).json({
    success: true,
    count: customersWithCredit.length,
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    data: customersWithCredit,
  });
});

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
// @access  Public
exports.getCustomerById = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate({ path: "invoices", select: "invoiceNumber totalAmount billType createdAt", options: { perDocumentLimit: 50, sort: { createdAt: -1 } } })
    .lean();
  if (!customer) return next(new AppError(`Customer not found with id: ${req.params.id}`, 404));
  res.status(200).json({ success: true, data: customer });
});

// @desc    Create new customer
// @route   POST /api/customers
// @access  Public
exports.createCustomer = asyncHandler(async (req, res, next) => {
  const { name, email, phone, address, customerType, gstNumber, permanentAddress, shippingAddress } = req.body;
  if (email) {
    const existingCustomer = await Customer.findOne({ email }).lean();
    if (existingCustomer) return next(new AppError("Customer with this email already exists", 400));
  }
  const customer = await Customer.create({ name, email, phone, address, customerType, gstNumber, permanentAddress, shippingAddress });
  res.status(201).json({ success: true, message: "Customer created successfully", data: customer });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Public
exports.updateCustomer = asyncHandler(async (req, res, next) => {
  const { name, email, phone, address, customerType, gstNumber, permanentAddress, shippingAddress } = req.body;
  let customer = await Customer.findById(req.params.id);
  if (!customer) return next(new AppError(`Customer not found with id: ${req.params.id}`, 404));
  if (email && email !== customer.email) {
    const existingCustomer = await Customer.findOne({ email }).lean();
    if (existingCustomer) return next(new AppError("Email already in use by another customer", 400));
  }
  customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, address, customerType, gstNumber, permanentAddress, shippingAddress },
    { new: true, runValidators: true }
  );
  res.status(200).json({ success: true, message: "Customer updated successfully", data: customer });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Public
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);
  if (!customer) return next(new AppError(`Customer not found with id: ${req.params.id}`, 404));
  if (customer.invoices && customer.invoices.length > 0) {
    return next(new AppError("Cannot delete customer with existing invoices. Delete invoices first.", 400));
  }
  await Customer.findByIdAndDelete(req.params.id);
  res.status(200).json({ success: true, message: "Customer deleted successfully", data: {} });
});

// @desc    Get customer statistics - aggregation (no full populate)
// @route   GET /api/customers/:id/stats
// @access  Public
exports.getCustomerStats = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id).select("name email").lean();
  if (!customer) return next(new AppError(`Customer not found with id: ${req.params.id}`, 404));

  const [agg, countAgg] = await Promise.all([
    Invoice.aggregate([
      { $match: { customerId: customer._id } },
      { $group: { _id: "$billType", count: { $sum: 1 }, revenue: { $sum: { $cond: [{ $eq: ["$billType", "pay"] }, "$totalAmount", 0] } } } },
    ]),
    Invoice.countDocuments({ customerId: customer._id }),
  ]);

  let paid = 0, pending = 0, totalRevenue = 0;
  for (const r of agg) {
    if (r._id === "pay") { paid = r.count; totalRevenue = r.revenue; }
    if (r._id === "credit") pending = r.count;
  }
  // Need total revenue from pay group; agg already splits; fetch separately if needed
  if (totalRevenue === 0) {
    const rev = await Invoice.aggregate([{ $match: { customerId: customer._id, billType: "pay" } }, { $group: { _id: null, total: { $sum: "$totalAmount" } } }]);
    totalRevenue = rev[0]?.total || 0;
  }

  res.status(200).json({
    success: true,
    data: {
      customer: { id: customer._id, name: customer.name, email: customer.email },
      stats: { totalInvoices: countAgg, paidInvoices: paid, pendingInvoices: pending, totalRevenue },
    },
  });
});

// Get customer credit invoices - lean
exports.getCreditInvoices = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id)
    .populate({ path: "invoices", match: { billType: "credit" }, select: "invoiceNumber totalAmount billType createdAt", options: { sort: { createdAt: -1 } } })
    .lean();
  if (!customer) return next(new AppError(`Customer not found with id: ${req.params.id}`, 404));
  const totalCredit = (customer.invoices || []).reduce((sum, inv) => sum + (inv.totalAmount || 0), 0);
  res.status(200).json({ success: true, data: { totalCredit, creditInvoices: customer.invoices } });
});
