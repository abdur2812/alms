const mongoose = require("mongoose");

const staffSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Staff name is required"],
      trim: true,
      minlength: [2, "Name must be at least 2 characters long"],
    },
    phone: {
      type: String,
      trim: true,
    },
    role: {
      type: String,
      required: [true, "Role is required"],
      trim: true,
    },
    dailyWage: {
      type: Number,
      required: [true, "Daily wage is required"],
      min: [0, "Daily wage cannot be negative"],
    },
    address: {
      type: String,
      trim: true,
    },
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  },
);

staffSchema.index({ isActive: 1, name: 1 });
staffSchema.index({ createdAt: -1 });

staffSchema.set("toJSON", { virtuals: true });
staffSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Staff", staffSchema);