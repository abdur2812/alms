const Product = require("../models/Product");
const Invoice = require("../models/Invoice");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// @desc    Get products sorted by most billed (invoice frequency)
// @route   GET /api/products/popular
// @access  Public
exports.getPopularProducts = asyncHandler(async (req, res, next) => {
  const { limit = 1000, search } = req.query;

  // Aggregate invoice items to count how many times each product was billed
  const billed = await Invoice.aggregate([
    { $unwind: "$items" },
    { $match: { "items.productId": { $ne: null } } },
    {
      $group: {
        _id: "$items.productId",
        billedCount: { $sum: "$items.quantity" },
      },
    },
    { $sort: { billedCount: -1 } },
  ]);

  // Map productId -> billedCount for quick lookup
  const countMap = {};
  billed.forEach((b) => {
    countMap[b._id.toString()] = b.billedCount;
  });

  const query = {};
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { description: { $regex: safe, $options: "i" } },
    ];
  }

  const products = await Product.find(query).limit(Number(limit));

  // Sort: products that appear in invoices first (desc), rest after
  products.sort((a, b) => {
    const ca = countMap[a._id.toString()] || 0;
    const cb = countMap[b._id.toString()] || 0;
    return cb - ca;
  });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = asyncHandler(async (req, res, next) => {
  const { page = 1, limit = 10, search, inStock, lowStock } = req.query;

  const query = {};

  // Search by name or description
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { description: { $regex: safe, $options: "i" } },
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

  try {
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
  } catch (error) {
    console.error("=== GET ALL PRODUCTS ERROR ===");
    console.error("Error:", error);
    throw error;
  }
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
  const { name, description, price, stockQuantity, gst, hsnCode, partNo } =
    req.body;

  // Check if product with this name already exists
  const existingProduct = await Product.findOne({ name });
  if (existingProduct) {
    return next(new AppError("Product with this name already exists", 400));
  }

  const productData = {
    name,
    description,
    price,
    stockQuantity,
    gst: Number(gst) || 0,
    hsnCode,
    partNo,
  };

  const product = await Product.create(productData);

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
  const { name, description, price, stockQuantity, gst, hsnCode, partNo } =
    req.body;

  let product = await Product.findById(req.params.id);

  if (!product) {
    return next(
      new AppError(`Product not found with id: ${req.params.id}`, 404),
    );
  }

  // Check if name is being changed to an existing name
  if (name && name !== product.name) {
    const existingProduct = await Product.findOne({ name });
    if (existingProduct) {
      return next(new AppError("Product name already in use", 400));
    }
  }

  const updateData = {
    name,
    description,
    price,
    stockQuantity,
    gst: Number(gst) || 0,
    hsnCode,
    partNo,
  };

  product = await Product.findByIdAndUpdate(req.params.id, updateData, {
    new: true,
    runValidators: true,
  });

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
  const query = {
    stockQuantity: { $gt: 0, $lt: 10 },
  };

  const products = await Product.find(query).sort({ stockQuantity: 1 });

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
  const query = { stockQuantity: 0 };

  const products = await Product.find(query).sort({
    updatedAt: -1,
  });

  res.status(200).json({
    success: true,
    count: products.length,
    data: products,
  });
});

// @desc    Bulk create products
// @route   POST /api/products/bulk
// @access  Public
exports.bulkCreateProducts = asyncHandler(async (req, res, next) => {
  const { products } = req.body;

  if (!Array.isArray(products) || products.length === 0) {
    return next(new AppError("Products array is required", 400));
  }

  const results = {
    success: [],
    failed: [],
  };

  for (const productData of products) {
    try {
      const { name, description, price, stockQuantity, gst, hsnCode, partNo } =
        productData;

      // Validate required fields
      if (!name || !price) {
        results.failed.push({
          data: productData,
          error: "Missing required fields (name, price)",
        });
        continue;
      }

      // Check if product with this name already exists
      const existingProduct = await Product.findOne({ name });
      if (existingProduct) {
        results.failed.push({
          data: productData,
          error: `Product with name "${name}" already exists`,
        });
        continue;
      }

      const product = await Product.create({
        name,
        description: description || "",
        price: Number(price),
        stockQuantity: Number(stockQuantity) || 0,
        gst: Number(gst) || 0,
        hsnCode,
        partNo,
      });

      results.success.push(product);
    } catch (error) {
      results.failed.push({
        data: productData,
        error: error.message,
      });
    }
  }

  res.status(201).json({
    success: true,
    message: `Bulk import completed: ${results.success.length} succeeded, ${results.failed.length} failed`,
    data: results,
  });
});
// @desc    Get stock data for PDF generation
// @route   GET /api/products/reports/stock-pdf
// @access  Public
exports.getStockPDF = asyncHandler(async (req, res, next) => {
  const products = await Product.find({})
    .select("name price gst hsnCode stockQuantity")
    .sort({ name: 1 });

  // Format data for PDF: name, price, gst, hsn, stock qty
  const stockData = products.map((product) => ({
    name: product.name,
    price: product.price,
    gst: product.gst,
    hsnCode: product.hsnCode || "-",
    stockQuantity: product.stockQuantity,
  }));

  res.status(200).json({
    success: true,
    count: stockData.length,
    data: stockData,
  });
});
