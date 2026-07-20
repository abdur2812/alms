const Customer = require("../models/Customer");
const Invoice = require("../models/Invoice");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get all customers
// @route   GET /api/customers
// @access  Public
exports.getAllCustomers = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, hasCreditInvoices } = req.query;

  const query = {};

  // Filter by credit invoices
  if (hasCreditInvoices === "true") {
    // Find all customers who have at least one invoice with billType="credit"
    const creditInvoices = await Invoice.find({ billType: "credit" }).distinct(
      "customerId",
    );
    query._id = { $in: creditInvoices };
  }

  // Search by name or phone
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
    ];
  }

  try {
    const customers = await Customer.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 })
      .populate({
        path: "invoices",
        select: "invoiceNumber totalAmount status date dueDate billType",
        options: { sort: { date: -1 } },
      });

    const customersWithCredit = customers.map((customer) => {
      const customerObj = customer.toObject();

      // Filter credit invoices (billType "credit" only)
      const creditInvoices = customer.invoices.filter(
        (inv) => inv.billType === "credit",
      );

      customerObj.creditAmount = creditInvoices.reduce(
        (sum, inv) => sum + inv.totalAmount,
        0,
      );
      customerObj.creditInvoices = creditInvoices;
      customerObj.totalInvoices = customer.invoices.length;

      return customerObj;
    });

    const count = await Customer.countDocuments(query);

    res.status(200).json({
      success: true,
      count: customers.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: customersWithCredit,
    });
  } catch (error) {
    throw error;
  }
});

// @desc    Get single customer by ID
// @route   GET /api/customers/:id
// @access  Public
exports.getCustomerById = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id).populate({
    path: "invoices",
    select: "invoiceNumber totalAmount status createdAt",
  });

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
  const {
    name,
    email,
    phone,
    address,
    customerType,
    gstNumber,
    permanentAddress,
    shippingAddress,
  } = req.body;

  // Check if customer with email already exists
  if (email) {
    const existingCustomer = await Customer.findOne({ email });
    if (existingCustomer) {
      return next(new AppError("Customer with this email already exists", 400));
    }
  }

  const customer = await Customer.create({
    name,
    email,
    phone,
    address,
    customerType,
    gstNumber,
    permanentAddress,
    shippingAddress,
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
  const {
    name,
    email,
    phone,
    address,
    customerType,
    gstNumber,
    permanentAddress,
    shippingAddress,
  } = req.body;

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
    {
      name,
      email,
      phone,
      address,
      customerType,
      gstNumber,
      permanentAddress,
      shippingAddress,
    },
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
    paidInvoices: customer.invoices.filter((inv) => inv.billType === "pay")
      .length,
    pendingInvoices: customer.invoices.filter((inv) => inv.billType === "credit")
      .length,
    totalRevenue: customer.invoices
      .filter((inv) => inv.billType === "pay")
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

// Get customer credit invoices
exports.getCreditInvoices = asyncHandler(async (req, res, next) => {
  const customer = await Customer.findById(req.params.id).populate({
    path: "invoices",
    match: { billType: "credit" },
    select: "invoiceNumber totalAmount dueDate date billType",
    options: { sort: { date: -1 } },
  });

  if (!customer) {
    return next(
      new AppError(`Customer not found with id: ${req.params.id}`, 404),
    );
  }

  const totalCredit = customer.invoices.reduce(
    (sum, inv) => sum + inv.totalAmount,
    0,
  );

  res.status(200).json({
    success: true,
    data: {
      totalCredit,
      creditInvoices: customer.invoices,
    },
  });
});
