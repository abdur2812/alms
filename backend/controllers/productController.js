const Product = require("../models/Product");
const Counter = require("../models/Counter");
const { AppError, asyncHandler } = require("../middleware/errorHandler");
const { parsePagination } = require("../utils/queryHelpers");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// NOTE: backfillMissingSerialNumbers is now run once at server startup (see index.js)
// to avoid per-request COLLSCAN on 3k docs. Kept export for manual migration.
const backfillMissingSerialNumbers = async () => {
  const missing = await Product.find({
    $or: [{ serialNo: null }, { serialNo: { $exists: false } }, { serialNo: 0 }],
  }).select("_id serialNo createdAt").sort({ createdAt: 1 }).lean();
  if (missing.length === 0) return 0;
  // Batch allocate serial numbers: one atomic increment by missing.length
  const counterId = "prod";
  const dbMaxDoc = await Product.findOne().sort({ serialNo: -1 }).select("serialNo").lean();
  const dbMax = dbMaxDoc?.serialNo || 0;
  const counter = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $setOnInsert: { sequence: dbMax } },
    { upsert: true, new: true }
  );
  // Actually need to bump to dbMax if counter is stale
  if (counter.sequence < dbMax) {
    await Counter.findOneAndUpdate({ _id: counterId }, { $set: { sequence: dbMax } });
  }
  const inc = await Counter.findOneAndUpdate(
    { _id: counterId },
    { $inc: { sequence: missing.length } },
    { new: true }
  );
  const start = inc.sequence - missing.length + 1;
  const ops = missing.map((p, i) => ({
    updateOne: { filter: { _id: p._id }, update: { $set: { serialNo: start + i } } },
  }));
  await Product.bulkWrite(ops, { ordered: false });
  return missing.length;
};

// @desc    Get products sorted by serial number (ascending)
// @route   GET /api/products/popular
// @access  Public
exports.getPopularProducts = asyncHandler(async (req, res, next) => {
  const { search } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 20 });

  const query = {};
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { description: { $regex: safe, $options: "i" } },
    ];
  }

  const [total, data] = await Promise.all([
    Product.countDocuments(query),
    Product.find(query).sort({ serialNo: 1 }).skip(skip).limit(limit).lean(),
  ]);

  res.status(200).json({
    success: true,
    count: data.length,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: page,
    data,
  });
});

// @desc    Get all products
// @route   GET /api/products
// @access  Public
exports.getAllProducts = asyncHandler(async (req, res, next) => {
  const { search, inStock, lowStock } = req.query;
  const wantLarge = String(req.query.limit) === "10000" || Number(req.query.limit) > 50;
  const { page, limit, skip } = parsePagination(req.query, {
    defaultLimit: 10,
    allowLarge: wantLarge,
  });
  const effLimit = limit; // already capped to 50 or 5000 by parsePagination

  const query = {};

  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { description: { $regex: safe, $options: "i" } },
    ];
  }

  if (inStock === "true") {
    query.stockQuantity = { $gt: 0 };
  } else if (inStock === "false") {
    query.stockQuantity = 0;
  }

  if (lowStock === "true") {
    query.stockQuantity = { $gt: 0, $lt: 10 };
  }

  const [products, count] = await Promise.all([
    Product.find(query).sort({ serialNo: 1 }).skip(skip).limit(effLimit).lean(),
    Product.countDocuments(query),
  ]);

  res.status(200).json({
    success: true,
    count: products.length,
    total: count,
    totalPages: Math.ceil(count / effLimit),
    currentPage: page,
    data: products,
  });
});

// @desc    Get single product by ID
// @route   GET /api/products/:id
// @access  Public
exports.getProductById = asyncHandler(async (req, res, next) => {
  const product = await Product.findById(req.params.id).lean();
  if (!product) {
    return next(new AppError(`Product not found with id: ${req.params.id}`, 404));
  }
  res.status(200).json({ success: true, data: product });
});

// @desc    Create new product
// @route   POST /api/products
// @access  Public
exports.createProduct = asyncHandler(async (req, res, next) => {
  const { name, description, price, stockQuantity, gst, hsnCode, partNo } = req.body;

  const existingProduct = await Product.findOne({ name }).lean();
  if (existingProduct) {
    return next(new AppError("Product with this name already exists", 400));
  }

  const serialNo = await Product.generateSerialNo();

  const product = await Product.create({
    name,
    description,
    price,
    stockQuantity,
    gst: Number(gst) || 0,
    hsnCode,
    partNo,
    serialNo,
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
  const { name, description, price, stockQuantity, gst, hsnCode, partNo } = req.body;

  let product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError(`Product not found with id: ${req.params.id}`, 404));
  }

  if (name && name !== product.name) {
    const existingProduct = await Product.findOne({ name }).lean();
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
    return next(new AppError(`Product not found with id: ${req.params.id}`, 404));
  }
  await Product.findByIdAndDelete(req.params.id);
  await Product.syncCounterAfterDelete();
  res.status(200).json({ success: true, message: "Product deleted successfully", data: {} });
});

// @desc    Adjust stock quantity
// @route   PATCH /api/products/:id/stock
// @access  Public
exports.adjustStock = asyncHandler(async (req, res, next) => {
  const { adjustment, action } = req.body;
  if (!adjustment || adjustment <= 0) {
    return next(new AppError("Please provide a valid adjustment quantity", 400));
  }
  if (!action || !["add", "subtract"].includes(action)) {
    return next(new AppError("Please provide a valid action (add or subtract)", 400));
  }
  const product = await Product.findById(req.params.id);
  if (!product) {
    return next(new AppError(`Product not found with id: ${req.params.id}`, 404));
  }
  if (action === "add") {
    await product.increaseStock(adjustment);
  } else {
    if (product.stockQuantity < adjustment) {
      return next(
        new AppError(`Insufficient stock. Available: ${product.stockQuantity}, Requested: ${adjustment}`, 400)
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
  const products = await Product.find({ stockQuantity: { $gt: 0, $lt: 10 } })
    .sort({ stockQuantity: 1 })
    .select("name price stockQuantity serialNo")
    .lean();
  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Get out of stock products
// @route   GET /api/products/alerts/out-of-stock
// @access  Public
exports.getOutOfStockProducts = asyncHandler(async (req, res, next) => {
  const products = await Product.find({ stockQuantity: 0 })
    .sort({ updatedAt: -1 })
    .select("name price stockQuantity serialNo updatedAt")
    .lean();
  res.status(200).json({ success: true, count: products.length, data: products });
});

// @desc    Bulk create products - DSA-optimized O(n) dedup + single counter increment
// @route   POST /api/products/bulk
// @access  Public
exports.bulkCreateProducts = asyncHandler(async (req, res, next) => {
  const { products } = req.body;
  if (!Array.isArray(products) || products.length === 0) {
    return next(new AppError("Products array is required", 400));
  }
  // Hard cap bulk size to avoid OOM on 512 MB
  if (products.length > 500) {
    return next(new AppError("Bulk limit is 500 products per request. Split into smaller batches.", 400));
  }

  const results = { success: [], failed: [] };

  // 1) Validate + collect names; O(n) hash map for intra-batch duplicates
  const nameSet = new Set();
  const toInsert = [];
  for (const pd of products) {
    const { name, price } = pd;
    if (!name || price === undefined || String(name).trim() === "" || String(price).trim() === "") {
      results.failed.push({ data: pd, error: "Missing required fields (name, price)" });
      continue;
    }
    const norm = String(name).trim();
    if (nameSet.has(norm.toLowerCase())) {
      results.failed.push({ data: pd, error: `Duplicate name in batch: "${norm}"` });
      continue;
    }
    nameSet.add(norm.toLowerCase());
    toInsert.push({ ...pd, _norm: norm.toLowerCase(), _origName: norm });
  }

  if (toInsert.length === 0) {
    return res.status(201).json({
      success: true,
      message: `Bulk import completed: 0 succeeded, ${results.failed.length} failed`,
      data: results,
    });
  }

  // 2) Single DB query to find existing names (instead of N findOne)
  const names = toInsert.map((p) => p._origName);
  const existing = await Product.find({ name: { $in: names } }).select("name").lean();
  const existingSet = new Set(existing.map((e) => String(e.name).toLowerCase()));
  const filtered = [];
  for (const pd of toInsert) {
    if (existingSet.has(pd._norm)) {
      results.failed.push({ data: pd, error: `Product with name "${pd._origName}" already exists` });
    } else {
      filtered.push(pd);
    }
  }

  if (filtered.length === 0) {
    return res.status(201).json({
      success: true,
      message: `Bulk import completed: 0 succeeded, ${results.failed.length} failed`,
      data: results,
    });
  }

  // 3) Batch allocate serial numbers: one atomic $inc by filtered.length
  // Ensure counter exists
  const dbMaxDoc = await Product.findOne().sort({ serialNo: -1 }).select("serialNo").lean();
  const dbMax = dbMaxDoc?.serialNo || 0;
  await Counter.findOneAndUpdate(
    { _id: "prod" },
    { $setOnInsert: { sequence: dbMax } },
    { upsert: true }
  );
  // Ensure counter >= dbMax
  await Counter.findOneAndUpdate(
    { _id: "prod", sequence: { $lt: dbMax } },
    { $set: { sequence: dbMax } }
  );
  const counter = await Counter.findOneAndUpdate(
    { _id: "prod" },
    { $inc: { sequence: filtered.length } },
    { new: true }
  );
  const startSerial = counter.sequence - filtered.length + 1;

  const docs = filtered.map((pd, i) => ({
    name: pd._origName,
    description: pd.description || "",
    price: Number(pd.price),
    stockQuantity: Number(pd.stockQuantity) || 0,
    gst: Number(pd.gst) || 0,
    hsnCode: pd.hsnCode,
    partNo: pd.partNo,
    serialNo: startSerial + i,
  }));

  try {
    const inserted = await Product.insertMany(docs, { ordered: false });
    results.success = inserted;
  } catch (e) {
    // insertMany ordered:false may still throw BulkWriteError with partial success
    if (e.insertedDocs) {
      results.success = e.insertedDocs;
    }
    const writeErrors = e.writeErrors || [];
    const failedMap = new Map(writeErrors.map((we) => [we.index, we.errmsg]));
    for (let i = 0; i < docs.length; i++) {
      if (!results.success.find((s) => s.name === docs[i].name)) {
        if (!failedMap.has(i)) results.failed.push({ data: filtered[i], error: e.message });
        else results.failed.push({ data: filtered[i], error: failedMap.get(i) });
      }
    }
    // Honour partial success if any inserted
    if (results.success.length === 0 && !e.insertedDocs) {
      // fallback: report all as failed
      for (const d of filtered) {
        if (!results.failed.find((f) => f.data._origName === d._origName)) {
          results.failed.push({ data: d, error: e.message });
        }
      }
    }
  }

  res.status(201).json({
    success: true,
    message: `Bulk import completed: ${results.success.length} succeeded, ${results.failed.length} failed`,
    data: results,
  });
});

// @desc    Get stock data for PDF generation - lean + capped sort
// @route   GET /api/products/reports/stock-pdf
// @access  Public
exports.getStockPDF = asyncHandler(async (req, res, next) => {
  const products = await Product.find({})
    .select("name price gst hsnCode stockQuantity")
    .sort({ name: 1 })
    .lean();
  const stockData = products.map((p) => ({
    name: p.name,
    price: p.price,
    gst: p.gst,
    hsnCode: p.hsnCode || "-",
    stockQuantity: p.stockQuantity,
  }));
  res.status(200).json({ success: true, count: stockData.length, data: stockData });
});

module.exports.backfillMissingSerialNumbers = backfillMissingSerialNumbers;
