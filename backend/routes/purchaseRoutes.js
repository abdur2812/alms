const express = require("express");
const router = express.Router();
const {
  getAllPurchases,
  getPurchaseById,
  createPurchase,
  updatePurchase,
  deletePurchase,
  getNextPurchaseNumber,
  getMonthlyReport,
} = require("../controllers/purchaseController");

router.get("/preview-number", getNextPurchaseNumber);
router.get("/reports/monthly", getMonthlyReport);
router.route("/").get(getAllPurchases).post(createPurchase);
router.route("/:id").get(getPurchaseById).put(updatePurchase).delete(deletePurchase);

module.exports = router;