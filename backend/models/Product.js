const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, "Product name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Product name must be at least 2 characters long"],
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    hsnCode: {
      type: String,
      trim: true,
    },
    partNo: {
      type: String,
      trim: true,
    },
    gst: {
      type: Number,
      default: 0,
      min: [0, "GST cannot be negative"],
      max: [100, "GST cannot exceed 100%"],
    },
    price: {
      type: Number,
      required: [true, "Price is required"],
      min: [0, "Price cannot be negative"],
    },
    stockQuantity: {
      type: Number,
      required: [true, "Stock quantity is required"],
      min: [0, "Stock quantity cannot be negative"],
      default: 0,
    },
  },
  {
    timestamps: true,
  },
);

// Virtual to check if product is in stock
productSchema.virtual("inStock").get(function () {
  return this.stockQuantity > 0;
});

// Virtual to check if stock is low (less than 10)
productSchema.virtual("lowStock").get(function () {
  return this.stockQuantity > 0 && this.stockQuantity < 10;
});

// Method to decrease stock
productSchema.methods.decreaseStock = async function (quantity) {
  this.stockQuantity = Math.max(0, this.stockQuantity - quantity);
  return await this.save();
};

// Method to increase stock
productSchema.methods.increaseStock = async function (quantity) {
  this.stockQuantity += quantity;
  return await this.save();
};

// Ensure virtuals are included when converting to JSON
productSchema.set("toJSON", { virtuals: true });
productSchema.set("toObject", { virtuals: true });

module.exports = mongoose.model("Product", productSchema);
