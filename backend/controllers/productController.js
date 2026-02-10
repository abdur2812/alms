const Product = require("../models/Product");
const { AppError, asyncHandler } = require("../middleware/errorHandler");

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = asyncHandler(async (req, res, next) => {
  console.log("=== GET ALL PRODUCTS START ===");
  console.log("Query params:", req.query);

  const { page = 1, limit = 10, search, inStock, lowStock } = req.query;
  const shopId = req.headers["x-shop-id"];

  const query = {};

  // Multi-tenancy: Only show products for current shop
  if (shopId) {
    query.shopId = shopId;
  }

  // Search by name or description
  if (search) {
    query.$or = [
      { name: { $regex: search, $options: "i" } },
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

  console.log("Query:", JSON.stringify(query));

  try {
    const products = await Product.find(query)
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    console.log("Products found:", products.length);

    const count = await Product.countDocuments(query);
    console.log("Total count:", count);

    res.status(200).json({
      success: true,
      count: products.length,
      total: count,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      data: products,
    });

    console.log("=== GET ALL PRODUCTS SUCCESS ===");
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
  const shopId = req.headers["x-shop-id"];
  let query = { _id: req.params.id };

  // Multi-tenancy: Only allow access to product from same shop
  if (shopId) {
    query.shopId = shopId;
  }

  const product = await Product.findOne(query);

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
  const shopId = req.headers["x-shop-id"];

  if (!shopId) {
    return next(new AppError("Shop ID is required", 400));
  }

  const { name, description, price, stockQuantity, sku } = req.body;

  // Check if product with SKU already exists in this shop
  const existingProduct = await Product.findOne({
    sku: sku.toUpperCase(),
    shopId,
  });
  if (existingProduct) {
    return next(new AppError("Product with this SKU already exists", 400));
  }

  const product = await Product.create({
    shopId,
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
  const shopId = req.headers["x-shop-id"];

  let product = await Product.findOne({ _id: req.params.id, shopId });

  if (!product) {
    return next(
      new AppError(`Product not found with id: ${req.params.id}`, 404),
    );
  }

  // Check if SKU is being changed to an existing SKU in the same shop
  if (sku && sku.toUpperCase() !== product.sku) {
    const shopId = req.headers["x-shop-id"];
    const existingProduct = await Product.findOne({
      sku: sku.toUpperCase(),
      shopId: shopId,
    });
    if (existingProduct) {
      return next(
        new AppError("SKU already in use by another product in this shop", 400),
      );
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
  const shopId = req.headers["x-shop-id"];
  const product = await Product.findOne({ _id: req.params.id, shopId });

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
  const shopId = req.headers["x-shop-id"];
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

  const product = await Product.findOne({ _id: req.params.id, shopId });

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
  const shopId = req.headers["x-shop-id"];

  const query = {
    stockQuantity: { $gt: 0, $lt: 10 },
  };

  // Multi-tenancy: Only show products for current shop
  if (shopId) {
    query.shopId = shopId;
  }

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
  const shopId = req.headers["x-shop-id"];

  const query = { stockQuantity: 0 };

  // Multi-tenancy: Only show products for current shop
  if (shopId) {
    query.shopId = shopId;
  }

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
  const shopId = req.headers["x-shop-id"];

  if (!shopId) {
    return next(new AppError("Shop ID is required", 400));
  }

  if (!Array.isArray(products) || products.length === 0) {
    return next(new AppError("Products array is required", 400));
  }

  const results = {
    success: [],
    failed: [],
  };

  for (const productData of products) {
    try {
      const { name, description, price, stockQuantity, sku } = productData;

      // Validate required fields
      if (!name || !price || !sku) {
        results.failed.push({
          data: productData,
          error: "Missing required fields (name, price, sku)",
        });
        continue;
      }

      // Check if product with SKU already exists in this shop
      const existingProduct = await Product.findOne({
        sku: sku.toUpperCase(),
        shopId,
      });
      if (existingProduct) {
        results.failed.push({
          data: productData,
          error: `Product with SKU ${sku} already exists in this shop`,
        });
        continue;
      }

      const product = await Product.create({
        shopId,
        name,
        description: description || "",
        price: Number(price),
        stockQuantity: Number(stockQuantity) || 0,
        sku: sku.toUpperCase(),
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
