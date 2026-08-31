/* Backfill serialNo for existing products that were created before
   the serial number feature was added. Run:
     node scripts/backfill-product-serial.js
   It assigns the next sequential number to products missing one (sorted by createdAt). */
const mongoose = require("mongoose");
require("dotenv").config();

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("MONGODB_URI is not set. Aborting.");
  process.exit(1);
}

async function run() {
  await mongoose.connect(MONGODB_URI, {
    readPreference: "primary",
    readConcern: { level: "majority" },
    writeConcern: { w: "majority" },
    serverSelectionTimeoutMS: 10000,
  });

  const Product = mongoose.model("Product", require("../models/Product").schema);
  const Counter = mongoose.model("Counter", require("../models/Counter").schema);

  const missing = await Product.find({ serialNo: { $exists: false } }).sort({
    createdAt: 1,
  });

  if (missing.length === 0) {
    console.log("No products missing serialNo. Nothing to backfill.");
    process.exit(0);
  }

  let seq = 0;
  const counter = await Counter.findById("prod").lean();
  if (counter && Number.isFinite(counter.sequence)) {
    seq = counter.sequence;
  } else {
    const dbMax = await Product.findOne()
      .sort({ serialNo: -1 })
      .select("serialNo")
      .lean();
    seq = dbMax?.serialNo || 0;
  }

  for (const product of missing) {
    seq += 1;
    product.serialNo = seq;
    await product.save();
  }

  await Counter.findOneAndUpdate(
    { _id: "prod" },
    { $set: { sequence: seq } },
    { upsert: true },
  );

  console.log(`Backfilled serialNo for ${missing.length} products. Next serial: ${seq + 1}`);
  await mongoose.disconnect();
}

run().catch((err) => {
  console.error("Backfill failed:", err);
  process.exit(1);
});