const mongoose = require("mongoose");

// Atomic counter for sequential ID generation.
// Using findOneAndUpdate + $inc guarantees uniqueness with no race conditions.
const counterSchema = new mongoose.Schema({
  _id: { type: String }, // e.g. "inv-2526", "est"
  sequence: { type: Number, default: 0 },
});

module.exports = mongoose.model("Counter", counterSchema);
