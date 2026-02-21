const express = require("express");
const router = express.Router();
const {
  getAllProducts,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  adjustStock,
  getLowStockProducts,
  getOutOfStockProducts,
  bulkCreateProducts,
  getStockPDF,
} = require("../controllers/productController");

// Report routes (must be before other routes)
router.get("/reports/stock-pdf", getStockPDF);

// Alert routes (must be before :id routes)
router.get("/alerts/low-stock", getLowStockProducts);
router.get("/alerts/out-of-stock", getOutOfStockProducts);

// Bulk import route
router.post("/bulk", bulkCreateProducts);

// Basic CRUD routes
router.route("/").get(getAllProducts).post(createProduct);

router
  .route("/:id")
  .get(getProductById)
  .put(updateProduct)
  .delete(deleteProduct);

// Stock adjustment route
router.patch("/:id/stock", adjustStock);

module.exports = router;
