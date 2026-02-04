const express = require("express");
const router = express.Router();
const {
  getAllInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoice,
  deleteInvoice,
  updateInvoiceStatus,
  getInvoiceStats,
  getInvoicesByDateRange,
} = require("../controllers/invoiceController");

// Statistics and reports routes (must be before :id routes)
router.get("/stats/summary", getInvoiceStats);
router.get("/reports/date-range", getInvoicesByDateRange);

// Basic CRUD routes
router.route("/").get(getAllInvoices).post(createInvoice);

router
  .route("/:id")
  .get(getInvoiceById)
  .put(updateInvoice)
  .delete(deleteInvoice);

// Status update route
router.patch("/:id/status", updateInvoiceStatus);

module.exports = router;
