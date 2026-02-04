const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

// @desc    Get all customers
// @route   GET /api/customers
// @access  Public
exports.getAllCustomers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search } = req.query;

  const query = {};

  // Search by name or email
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { email: { $regex: search, $options: "i" } },
    ];
  }

  const customers = await Customer.find(query)
    .populate("invoices", "invoiceNumber totalAmount status")
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Customer.countDocuments(query);

  res.status(200).json({
    success: true,
    count: customers.length,
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    data: customers,
  });
});

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
// @access  Public
exports.getCustomerById = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id).populate(
    "invoices",
    "invoiceNumber totalAmount status createdAt",
  );

  if (!customer) {
    return next(
      new AppError(`Customer not found with id: ${req.params.id}`, 404),
    );
  }

  res.status(200).json({
    success: true,
    data: customer,
  });
});

// @desc    Create new customer
// @route   POST /api/customers
// @access  Public
exports.createCustomer = asyncHandler(async (req, res, next) => {
  const { name, email, phone, address } = req.body;

  // Check if customer with email already exists
  const existingCustomer = await Customer.findOne({ email });
  if (existingCustomer) {
    return next(new AppError("Customer with this email already exists", 400));
  }

  const customer = await Customer.create({
    name,
    email,
    phone,
    address,
  });

  res.status(201).json({
    success: true,
    message: "Customer created successfully",
    data: customer,
  });
});

// @desc    Update customer
// @route   PUT /api/customers/:id
// @access  Public
exports.updateCustomer = asyncHandler(async (req, res, next) => {
  const { name, email, phone, address } = req.body;

  let customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(
      new AppError(`Customer not found with id: ${req.params.id}`, 404),
    );
  }

  // Check if email is being changed to an existing email
  if (email && email !== customer.email) {
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return next(
        new AppError("Email already in use by another customer", 400),
      );
    }
  }

  customer = await Customer.findByIdAndUpdate(
    req.params.id,
    { name, email, phone, address },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    success: true,
    message: "Customer updated successfully",
    data: customer,
  });
});

// @desc    Delete customer
// @route   DELETE /api/customers/:id
// @access  Public
exports.deleteCustomer = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id);

  if (!customer) {
    return next(
      new AppError(`Customer not found with id: ${req.params.id}`, 404),
    );
  }

  // Check if customer has invoices
  if (customer.invoices && customer.invoices.length > 0) {
    return next(
      new AppError(
        "Cannot delete customer with existing invoices. Delete invoices first.",
        400,
      ),
    );
  }

  await Customer.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Customer deleted successfully",
    data: {},
  });
});

// @desc    Get customer statistics
// @route   GET /api/customers/:id/stats
// @access  Public
exports.getCustomerStats = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id).populate("invoices");

  if (!customer) {
    return next(
      new AppError(`Customer not found with id: ${req.params.id}`, 404),
    );
  }

  const stats = {
    totalInvoices: customer.invoices.length,
    paidInvoices: customer.invoices.filter((inv) => inv.status === "Paid")
      .length,
    pendingInvoices: customer.invoices.filter((inv) => inv.status === "Pending")
      .length,
    totalRevenue: customer.invoices
      .filter((inv) => inv.status === "Paid")
      .reduce((sum, inv) => sum + inv.totalAmount, 0),
  };

  res.status(200).json({
    success: true,
    data: {
      customer: {
        id: customer._id,
        name: customer.name,
        email: customer.email,
      },
      stats,
    },
  });
});
