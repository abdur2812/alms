const express = require("express");
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  getInvoiceStats,
  getInvoicesByDateRange,
  getBulkInvoicePDF,
  generateInvoicePDF,
} = require("../controllers/invoiceController");

// Statistics and reports routes (must be before :id routes)
router.get("/stats/summary", getInvoiceStats);
router.get("/reports/date-range", getInvoicesByDateRange);
router.get("/reports/bulk-pdf", getBulkInvoicePDF);
router.get("/:id/pdf", generateInvoicePDF);

// Basic CRUD routes
router.route("/").get(getAllInvoices).post(createInvoice);

router
  .route("/:id")
  .get(getInvoiceById)
  .put(updateInvoice)
  .delete(deleteInvoice);

module.exports = router;
