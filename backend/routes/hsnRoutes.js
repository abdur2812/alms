const express = require("express");
const router = express.Router();
const { getAllHsns, createHsn, deleteHsn } = require("../controllers/hsnController");

router.route("/").get(getAllHsns).post(createHsn);
router.route("/:id").delete(deleteHsn);

module.exports = router;