const express = require("express");
const router = express.Router();
const {
  getAllVendors,
  getVendorById,
  createVendor,
  updateVendor,
  deleteVendor,
} = require("../controllers/vendorController");

router.route("/").get(getAllVendors).post(createVendor);
router.route("/:id").get(getVendorById).put(updateVendor).delete(deleteVendor);

module.exports = router;