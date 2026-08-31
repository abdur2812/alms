const Staff = require("../models/Staff");
const Attendance = require("../models/Attendance");
const StaffDailyPayment = require("../models/StaffDailyPayment");
const { AppError, asyncHandler } = require("../middleware/errorHandler");
const { parsePagination } = require("../utils/queryHelpers");

const escapeRegex = (str) => str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// Parse a YYYY-MM-DD string (or Date) into a UTC-midnight Date so date
// comparisons are timezone-stable regardless of where the server runs.
const toUTCStart = (dateInput) => {
  if (dateInput instanceof Date) {
    return new Date(
      Date.UTC(
        dateInput.getUTCFullYear(),
        dateInput.getUTCMonth(),
        dateInput.getUTCDate(),
      ),
    );
  }
  if (typeof dateInput !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(dateInput)) {
    return null;
  }
  const d = new Date(`${dateInput}T00:00:00.000Z`);
  return isNaN(d.getTime()) ? null : d;
};

const toDateString = (d) => d.toISOString().split("T")[0];

const DAY_MS = 86400000;

// @desc    Get all staff - lean + bounded
// @route   GET /api/staff
// @access  Public
exports.getAllStaff = asyncHandler(async (req, res, next) => {
  const { search, isActive } = req.query;
  const { page, limit, skip } = parsePagination(req.query, { defaultLimit: 10 });

  const query = {};
  if (search) {
    const safe = escapeRegex(search);
    query.$or = [
      { name: { $regex: safe, $options: "i" } },
      { phone: { $regex: safe, $options: "i" } },
      { role: { $regex: safe, $options: "i" } },
    ];
  }
  if (isActive !== undefined && isActive !== "") query.isActive = isActive === "true";

  const [staff, total] = await Promise.all([
    Staff.find(query).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
    Staff.countDocuments(query),
  ]);

  res.status(200).json({ success: true, count: staff.length, total, totalPages: Math.ceil(total / limit), currentPage: page, data: staff });
});

// @desc    Get single staff by ID
// @route   GET /api/staff/:id
// @access  Public
exports.getStaffById = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findById(req.params.id).lean();
  if (!staff) return next(new AppError(`Staff not found with id: ${req.params.id}`, 404));
  res.status(200).json({ success: true, data: staff });
});

// @desc    Create new staff member
// @route   POST /api/staff
// @access  Public
exports.createStaff = asyncHandler(async (req, res, next) => {
  const { name, phone, role, dailyWage, address, isActive } = req.body;

  if (dailyWage === undefined || dailyWage === null || dailyWage === "") {
    return next(new AppError("Daily wage is required", 400));
  }
  const wage = parseFloat(dailyWage);
  if (isNaN(wage) || wage < 0) {
    return next(new AppError("Daily wage must be a non-negative number", 400));
  }

  const staff = await Staff.create({
    name,
    phone,
    role,
    dailyWage: wage,
    address,
    isActive,
  });

  res.status(201).json({
    success: true,
    message: "Staff created successfully",
    data: staff,
  });
});

// @desc    Update staff member
// @route   PUT /api/staff/:id
// @access  Public
exports.updateStaff = asyncHandler(async (req, res, next) => {
  const { name, phone, role, dailyWage, address, isActive } = req.body;

  let staff = await Staff.findById(req.params.id);
  if (!staff) {
    return next(new AppError(`Staff not found with id: ${req.params.id}`, 404));
  }

  const update = {};
  if (name !== undefined) update.name = name;
  if (phone !== undefined) update.phone = phone;
  if (role !== undefined) update.role = role;
  if (dailyWage !== undefined && dailyWage !== "") {
    const wage = parseFloat(dailyWage);
    if (isNaN(wage) || wage < 0) {
      return next(new AppError("Daily wage must be a non-negative number", 400));
    }
    update.dailyWage = wage;
  }
  if (address !== undefined) update.address = address;
  if (isActive !== undefined) update.isActive = isActive;

  staff = await Staff.findByIdAndUpdate(req.params.id, update, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    message: "Staff updated successfully",
    data: staff,
  });
});

// @desc    Delete staff member (soft delete: keeps all attendance & payments)
// @route   DELETE /api/staff/:id
// @access  Public
exports.deleteStaff = asyncHandler(async (req, res, next) => {
  const staff = await Staff.findById(req.params.id);
  if (!staff) {
    return next(new AppError(`Staff not found with id: ${req.params.id}`, 404));
  }

  // Soft delete: deactivate the staff so they stop appearing for future
  // attendance/salary entry, but their attendance and salary payment history
  // stays intact (and keeps affecting accounts).
  await Staff.findByIdAndUpdate(
    req.params.id,
    { isActive: false },
    { runValidators: true },
  );

  res.status(200).json({
    success: true,
    message: "Staff deactivated. Attendance and salary history are preserved.",
    data: { staff: await Staff.findById(req.params.id) },
  });
});

// @desc    Get daily attendance for a date (all active staff)
// @route   GET /api/staff/attendance/daily?date=YYYY-MM-DD
// @access  Public
exports.getDailyAttendance = asyncHandler(async (req, res, next) => {
  const { date } = req.query;
  const dayStart = toUTCStart(date);
  if (!dayStart) {
    return next(
      new AppError("date query parameter is required (YYYY-MM-DD)", 400),
    );
  }
  const dayEnd = new Date(dayStart.getTime() + DAY_MS);

  // Active staff, plus deactivated staff who already have a record for this day
  const [activeStaff, records, dailyPayments] = await Promise.all([
    Staff.find({ isActive: true }).sort({ name: 1 }).select("name phone role dailyWage isActive").lean(),
    Attendance.find({ date: { $gte: dayStart, $lt: dayEnd } }).lean(),
    StaffDailyPayment.find({ date: dayStart }).lean(),
  ]);
  const recordedStaffIds = records.map((r) => r.staffId);
  const inactiveWithRecords = recordedStaffIds.length
    ? await Staff.find({ _id: { $in: recordedStaffIds }, isActive: false }).sort({ name: 1 }).select("name phone role dailyWage isActive").lean()
    : [];
  const staff = [...activeStaff, ...inactiveWithRecords];

  const recordMap = new Map(records.map((r) => [r.staffId.toString(), r]));
  const paymentMap = new Map(dailyPayments.map((p) => [p.staffId.toString(), p]));

  const data = staff.map((s) => {
    const r = recordMap.get(s._id.toString());
    const payment = paymentMap.get(s._id.toString());
    if (!r) {
      return {
        staff: s,
        attendance: null,
        payment: payment
          ? {
              _id: payment._id,
              amount: payment.amount,
              status: payment.status,
              paidAt: payment.paidAt,
              date: toDateString(payment.date),
            }
          : null,
      };
    }
    const status = r.status || (r.present ? "present" : "absent");
    return {
      staff: s,
      attendance: { present: r.present, status, _id: r._id },
      payment: payment
        ? {
            _id: payment._id,
            amount: payment.amount,
            status: payment.status,
            paidAt: payment.paidAt,
            date: toDateString(payment.date),
          }
        : null,
    };
  });

  res.status(200).json({ success: true, date: toDateString(dayStart), data });
});

// @desc    Save daily attendance (bulk upsert for a date)
// @route   POST /api/staff/attendance/daily
// @access  Public
exports.saveDailyAttendance = asyncHandler(async (req, res, next) => {
  const { date, records } = req.body;
  const dayStart = toUTCStart(date);
  if (!dayStart) {
    return next(new AppError("date is required (YYYY-MM-DD)", 400));
  }
  if (!Array.isArray(records) || records.length === 0) {
    return next(new AppError("records array is required", 400));
  }

  const staffIds = [...new Set(records.map((r) => r.staffId))];
  const validCount = await Staff.countDocuments({ _id: { $in: staffIds } });
  if (validCount !== staffIds.length) {
    return next(new AppError("One or more staff IDs are invalid", 400));
  }

  for (const r of records) {
    // status null explicitly means delete (deselect) - allow without validation
    if (r.status === null) continue;
    if (r.status !== undefined && r.status !== null && String(r.status).trim() !== "") {
      const s = String(r.status).trim().toLowerCase();
      if (!["present", "absent", "half"].includes(s)) {
        return next(new AppError(`Invalid attendance status: ${r.status}`, 400));
      }
    } else if (r.status === "" && r.present === null) {
      // explicit deselect via empty + null present - allow
      continue;
    }
  }

  const deleteIds = [];
  const ops = [];
  for (const r of records) {
    // null status means delete the attendance record (toggle to no selection)
    if (r.status === null || (r.status === "" && r.present === null)) {
      deleteIds.push(r.staffId);
      continue;
    }
    let status;
    if (r.status !== undefined && r.status !== null && String(r.status).trim() !== "") {
      status = String(r.status).trim().toLowerCase();
    } else if (r.present !== undefined && r.present !== null) {
      status = r.present ? "present" : "absent";
    } else {
      status = "present";
    }
    const present = status === "absent" ? false : true;
    ops.push({
      updateOne: {
        filter: { staffId: r.staffId, date: dayStart },
        update: {
          $set: {
            status,
            present,
          },
        },
        upsert: true,
      },
    });
  }

  if (deleteIds.length) {
    await Attendance.deleteMany({ staffId: { $in: deleteIds }, date: dayStart });
    // Also remove any daily payment for that deselected day (no wage)
    await require("../models/StaffDailyPayment").deleteMany({ staffId: { $in: deleteIds }, date: dayStart });
  }
  if (ops.length) {
    await Attendance.bulkWrite(ops, { ordered: false });
  }
  if (!deleteIds.length && !ops.length) {
    return res.status(200).json({
      success: true,
      message: "No attendance changes",
      date: toDateString(dayStart),
      saved: 0,
      deleted: deleteIds.length,
    });
  }

  res.status(200).json({
    success: true,
    message: "Attendance saved successfully",
    date: toDateString(dayStart),
    saved: ops.length,
    deleted: deleteIds.length,
  });
});

// @desc    Get salary payment history (for accounts) — daily only
// @route   GET /api/staff/payments?start=YYYY-MM-DD&end=YYYY-MM-DD
// @access  Public
exports.getPayments = asyncHandler(async (req, res, next) => {
  const { start, end } = req.query;

  const query = {};
  if (start) {
    const startDate = toUTCStart(start);
    if (!startDate) return next(new AppError("Invalid start date", 400));
    query.paidAt = { ...(query.paidAt || {}), $gte: startDate };
  }
  if (end) {
    const endDate = toUTCStart(end);
    if (!endDate) return next(new AppError("Invalid end date", 400));
    query.paidAt = {
      ...(query.paidAt || {}),
      $lte: new Date(endDate.getTime() + DAY_MS - 1),
    };
  }

  const payments = await StaffDailyPayment.find(query).populate("staffId", "name role dailyWage").sort({ paidAt: -1 }).limit(500).lean();

  res.status(200).json({ success: true, count: payments.length, data: payments });
});

// @desc    Get individual staff calendar (attendance + daily payments for a month/range)
// @route   GET /api/staff/:id/calendar?month=YYYY-MM&startDate=YYYY-MM-DD&endDate=YYYY-MM-DD
// @access  Public
exports.getStaffCalendar = asyncHandler(async (req, res, next) => {
  const { id } = req.params;
  const { month, startDate, endDate } = req.query;

  const staff = await Staff.findById(id).lean();
  if (!staff) return next(new AppError(`Staff not found with id: ${id}`, 404));

  let start;
  let endExclusive;

  if (startDate || endDate) {
    if (startDate) {
      start = toUTCStart(startDate);
      if (!start) return next(new AppError("Invalid startDate (YYYY-MM-DD)", 400));
    } else {
      // no start, default to 30 days before end
      const e = toUTCStart(endDate);
      if (!e) return next(new AppError("Invalid endDate (YYYY-MM-DD)", 400));
      start = new Date(e.getTime() - 29 * DAY_MS);
    }
    if (endDate) {
      const e = toUTCStart(endDate);
      if (!e) return next(new AppError("Invalid endDate (YYYY-MM-DD)", 400));
      endExclusive = new Date(e.getTime() + DAY_MS);
    } else {
      // only start provided → 30 day window
      endExclusive = new Date(start.getTime() + 30 * DAY_MS);
    }
  } else if (month && /^\d{4}-\d{2}$/.test(month)) {
    const [y, m] = month.split("-").map(Number);
    start = new Date(Date.UTC(y, m - 1, 1));
    endExclusive = new Date(Date.UTC(y, m, 1));
  } else {
    // default to current month
    const now = new Date();
    start = new Date(Date.UTC(now.getFullYear(), now.getMonth(), 1));
    endExclusive = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1));
  }

  // Attendance + payments in parallel lean
  const [attendanceRecords, dailyPayments] = await Promise.all([
    Attendance.find({ staffId: id, date: { $gte: start, $lt: endExclusive } }).sort({ date: 1 }).lean(),
    StaffDailyPayment.find({ staffId: id, date: { $gte: start, $lt: endExclusive } }).sort({ date: 1 }).lean(),
  ]);

  const attendance = attendanceRecords.map((r) => ({
    date: toDateString(r.date),
    status: r.status || (r.present ? "present" : "absent"),
    present: r.present,
    _id: r._id,
  }));

  const dailyPaymentsData = dailyPayments.map((p) => ({
    _id: p._id,
    date: toDateString(p.date),
    amount: p.amount,
    status: p.status,
    paidAt: p.paidAt,
  }));

  // Also compute current week salary for reference (today's week)
  const today = new Date();
  const todayUTC = new Date(Date.UTC(today.getFullYear(), today.getMonth(), today.getDate()));
  // Not needed for calendar, but include total days

  res.status(200).json({
    success: true,
    data: {
      staff: {
        _id: staff._id,
        name: staff.name,
        role: staff.role,
        phone: staff.phone,
        dailyWage: staff.dailyWage,
        isActive: staff.isActive,
      },
      range: {
        start: toDateString(start),
        end: toDateString(new Date(endExclusive.getTime() - DAY_MS)),
        month: month || null,
      },
      attendance,
      dailyPayments: dailyPaymentsData,
    },
  });
});

// @desc    Get daily payments (per-staff per-day)
// @route   GET /api/staff/payments/daily?staffId=&date=YYYY-MM-DD&startDate=&endDate=
// @access  Public
exports.getDailyPayments = asyncHandler(async (req, res, next) => {
  const { staffId, date, startDate, endDate } = req.query;

  const query = {};
  if (staffId) query.staffId = staffId;

  if (date) {
    const d = toUTCStart(date);
    if (!d) return next(new AppError("Invalid date (YYYY-MM-DD)", 400));
    query.date = d;
  } else if (startDate || endDate) {
    const range = {};
    if (startDate) {
      const s = toUTCStart(startDate);
      if (!s) return next(new AppError("Invalid startDate (YYYY-MM-DD)", 400));
      range.$gte = s;
    }
    if (endDate) {
      const e = toUTCStart(endDate);
      if (!e) return next(new AppError("Invalid endDate (YYYY-MM-DD)", 400));
      range.$lte = e;
    }
    if (Object.keys(range).length) query.date = range;
  }

  const payments = await StaffDailyPayment.find(query).populate("staffId", "name role dailyWage").sort({ date: -1, paidAt: -1 }).limit(500).lean();

  res.status(200).json({
    success: true,
    count: payments.length,
    data: payments.map((p) => ({
      _id: p._id,
      staffId: p.staffId,
      date: toDateString(p.date),
      amount: p.amount,
      status: p.status,
      paidAt: p.paidAt,
    })),
  });
});

// @desc    Mark a specific day as paid (per-staff per-day)
// @route   POST /api/staff/payments/daily
// @access  Public
exports.markDayPaid = asyncHandler(async (req, res, next) => {
  const { staffId, date, amount } = req.body;
  const dayStart = toUTCStart(date);
  if (!staffId || !dayStart) {
    return next(new AppError("staffId and date (YYYY-MM-DD) are required", 400));
  }

  const staff = await Staff.findById(staffId);
  if (!staff) {
    return next(new AppError("Staff not found", 404));
  }

  // Determine amount from attendance status and dailyWage if not explicitly provided
  // Unmarked days have no attendance record — treat as 0 wage and don't default to present
  let status = null;
  let computedAmount = 0;

  const attendance = await Attendance.findOne({
    staffId,
    date: dayStart,
  });
  if (attendance) {
    status = attendance.status || (attendance.present ? "present" : "absent");
    if (status === "half") computedAmount = staff.dailyWage * 0.5;
    else if (status === "absent") computedAmount = 0;
    else computedAmount = staff.dailyWage;
  } else {
    return next(new AppError("Attendance not marked for this date. Please mark attendance first.", 400));
  }

  // Allow explicit amount override (e.g. custom pay)
  const finalAmount =
    amount !== undefined && amount !== "" && !isNaN(parseFloat(amount))
      ? Math.round(parseFloat(amount) * 100) / 100
      : Math.round(computedAmount * 100) / 100;

  const payment = await StaffDailyPayment.findOneAndUpdate(
    { staffId, date: dayStart },
    {
      staffId,
      date: dayStart,
      amount: finalAmount,
      status,
      paidAt: new Date(),
    },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  );

  res.status(201).json({
    success: true,
    message: "Daily salary marked as paid",
    data: {
      _id: payment._id,
      staffId: payment.staffId,
      date: toDateString(payment.date),
      amount: payment.amount,
      status: payment.status,
      paidAt: payment.paidAt,
    },
  });
});

// @desc    Mark a specific day as unpaid (undo daily payment)
// @route   DELETE /api/staff/payments/daily?staffId=...&date=YYYY-MM-DD
// @access  Public
exports.markDayUnpaid = asyncHandler(async (req, res, next) => {
  const { staffId, date } = req.query;
  const dayStart = toUTCStart(date);
  if (!staffId || !dayStart) {
    return next(
      new AppError("staffId and date query parameters are required (YYYY-MM-DD)", 400),
    );
  }

  const result = await StaffDailyPayment.deleteMany({ staffId, date: dayStart });

  res.status(200).json({
    success: true,
    message: "Daily salary marked as unpaid",
    data: { deleted: result.deletedCount },
  });
});