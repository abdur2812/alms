const mongoose = require("mongoose");

// One attendance record per staff member per day.
// Salary for a week is derived from these records.
const attendanceSchema = new mongoose.Schema(
  {
    staffId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Staff",
      required: [true, "Staff reference is required"],
    },
    date: {
      type: Date,
      required: [true, "Attendance date is required"],
    },
    present: {
      type: Boolean,
      default: true,
    },
    status: {
      type: String,
      enum: ["present", "absent", "half"],
      default: "present",
    },
  },
  {
    timestamps: true,
  },
);

// Sync legacy `present` boolean with new `status` enum
attendanceSchema.pre("validate", function (next) {
  // If status is explicitly set, derive present from it
  if (this.isModified("status") && this.status) {
    if (this.status === "absent") this.present = false;
    else this.present = true; // present or half
  } else if (this.isModified("present") && !this.isModified("status")) {
    // Legacy clients sending only present
    if (this.present === false) this.status = "absent";
    else if (this.status !== "half") this.status = "present";
  }
  if (!this.status) {
    this.status = this.present ? "present" : "absent";
  }
  next();
});

// One record per staff per day (dates stored as UTC midnight)
attendanceSchema.index({ staffId: 1, date: 1 }, { unique: true });
attendanceSchema.index({ date: 1 });

attendanceSchema.set("toJSON", { virtuals: true });
attendanceSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Attendance", attendanceSchema);