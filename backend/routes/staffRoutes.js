const express = require("express");
const router = express.Router();
const {
  getAllStaff,
  getStaffById,
  createStaff,
  updateStaff,
  deleteStaff,
  getDailyAttendance,
  saveDailyAttendance,
  getPayments,
  getStaffCalendar,
  getDailyPayments,
  markDayPaid,
  markDayUnpaid,
} = require("../controllers/staffController");

// Basic CRUD routes
router.route("/").get(getAllStaff).post(createStaff);

// Daily attendance
router.get("/attendance/daily", getDailyAttendance);
router.post("/attendance/daily", saveDailyAttendance);

// Daily per-day payments (track each staff's particular day's payment)
router.get("/payments/daily", getDailyPayments);
router.post("/payments/daily", markDayPaid);
router.delete("/payments/daily", markDayUnpaid);

// Payment history (accounts)
router.get("/payments", getPayments);

// Individual staff calendar (attendance + payments for month/range) — must be before /:id
router.get("/:id/calendar", getStaffCalendar);

router
  .route("/:id")
  .get(getStaffById)
  .put(updateStaff)
  .delete(deleteStaff);

module.exports = router;