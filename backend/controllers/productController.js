const Product = require("../models/Product");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, inStock, lowStock } = req.query;

  const query = {};

  // Search by name, SKU, or description
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
      { sku: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  // Filter by stock status
  if (inStock === "true") {
    query.stockQuantity = { $gt: 0 };
  } else if (inStock === "false") {
    query.stockQuantity = 0;
  }

  // Filter by low stock
  if (lowStock === "true") {
    query.stockQuantity = { $gt: 0, $lt: 10 };
  }

  const products = await Product.find(query)
    .limit(limit * 1)
    .skip((page - 1) * limit)
    .sort({ createdAt: -1 });

  const count = await Product.countDocuments(query);

  res.status(200).json({
    success: true,
    count: products.length,
    total: count,
    totalPages: Math.ceil(count / limit),
    currentPage: page,
    data: products,
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new AppError(`Product not found with id: ${req.params.id}`, 404),
    );
  }

  res.status(200).json({
    success: true,
    data: product,
  });
});

// @desc    Create new product
// @route   POST /api/products
// @access  Public
exports.createProduct = asyncHandler(async (req, res, next) => {
  const { name, description, price, stockQuantity, sku } = req.body;

  // Check if product with SKU already exists
  const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
  if (existingProduct) {
    return next(new AppError("Product with this SKU already exists", 400));
  }

  const product = await Product.create({
    name,
    description,
    price,
    stockQuantity,
    sku: sku.toUpperCase(),
  });

  res.status(201).json({
    success: true,
    message: "Product created successfully",
    data: product,
  });
});

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Public
exports.updateProduct = asyncHandler(async (req, res, next) => {
  const { name, description, price, stockQuantity, sku } = req.body;

  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new AppError(`Product not found with id: ${req.params.id}`, 404),
    );
  }

  // Check if SKU is being changed to an existing SKU
  if (sku && sku.toUpperCase() !== product.sku) {
    const existingProduct = await Product.findOne({ sku: sku.toUpperCase() });
    if (existingProduct) {
      return next(new AppError("SKU already in use by another product", 400));
    }
  }

  product = await Product.findByIdAndUpdate(
    req.params.id,
    {
      name,
      description,
      price,
      stockQuantity,
      sku: sku ? sku.toUpperCase() : product.sku,
    },
    { new: true, runValidators: true },
  );

  res.status(200).json({
    success: true,
    message: "Product updated successfully",
    data: product,
  });
});

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Public
exports.deleteProduct = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new AppError(`Product not found with id: ${req.params.id}`, 404),
    );
  }

  await Product.findByIdAndDelete(req.params.id);

  res.status(200).json({
    success: true,
    message: "Product deleted successfully",
    data: {},
  });
});

// @desc    Adjust stock quantity
// @route   PATCH /api/products/:id/stock
// @access  Public
exports.adjustStock = asyncHandler(async (req, res, next) => {
  const { adjustment, action } = req.body; // action: 'add' or 'subtract'

  if (!adjustment || adjustment <= 0) {
    return next(
      new AppError("Please provide a valid adjustment quantity", 400),
    );
  }

  if (!action || !["add", "subtract"].includes(action)) {
    return next(
      new AppError("Please provide a valid action (add or subtract)", 400),
    );
  }

  const product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new AppError(`Product not found with id: ${req.params.id}`, 404),
    );
  }

  if (action === "add") {
    await product.increaseStock(adjustment);
  } else {
    if (product.stockQuantity < adjustment) {
      return next(
        new AppError(
          `Insufficient stock. Available: ${product.stockQuantity}, Requested: ${adjustment}`,
          400,
        ),
      );
    }
    await product.decreaseStock(adjustment);
  }

  res.status(200).json({
    success: true,
    message: `Stock ${action === "add" ? "increased" : "decreased"} successfully`,
    data: product,
  });
});

// @desc    Get low stock products
// @route   GET /api/products/alerts/low-stock
// @access  Public
exports.getLowStockProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({
    stockQuantity: { $gt: 0, $lt: 10 },
  }).sort({ stockQuantity: 1 });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

// @desc    Get out of stock products
// @route   GET /api/products/alerts/out-of-stock
// @access  Public
exports.getOutOfStockProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ stockQuantity: 0 }).sort({
    updatedAt: -1,
  });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});
