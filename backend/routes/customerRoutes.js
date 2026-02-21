const express = require("express");
const router = express.Router();
const {
  getAllCustomers,
  getCustomerById,
  createCustomer,
  updateCustomer,
  deleteCustomer,
  getCustomerStats,
  getCreditInvoices,
} = require("../controllers/customerController");

// Basic CRUD routes
router.route("/").get(getAllCustomers).post(createCustomer);

router
  .route("/:id")
  .get(getCustomerById)
  .put(updateCustomer)
  .delete(deleteCustomer);

// Statistics route
router.get("/:id/stats", getCustomerStats);

// Credit invoices route
router.get("/:id/credit", getCreditInvoices);

module.exports = router;
