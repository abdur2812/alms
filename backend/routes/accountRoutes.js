const express = require("express");
const router = express.Router();
const { getAccountsSummary, getHsnSummary, getAccountsReport } = require("../controllers/accountController");

router.get("/summary", getAccountsSummary);
router.get("/hsn", getHsnSummary);
router.get("/report", getAccountsReport);

module.exports = router;