/**
 * Reads active products from MongoDB and upserts 2 sample Combo documents
 * (deterministic names so re-runs update the same rows).
 *
 * Usage (from project root):
 *   npm run seed:combos
 * Or:
 *   node --env-file=.env.local scripts/seed-sample-combos.cjs
 */

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Use: npm run seed:combos (loads .env.local)");
  process.exit(1);
}

const SEED_NAME_1 = "RPT Seed — Carton threshold → % off beneficiary";
const SEED_NAME_2 = "RPT Seed — Bag threshold → flat ₹ off beneficiary";

function pickProductIds(products) {
  if (products.length < 2) {
    throw new Error(
      "Need at least 2 products in the database. Import or create products first."
    );
  }
  const p0 = products[0]._id;
  const p1 = products[1]._id;
  // Prefer 4 distinct products when available
  const p2 = products[2] ? products[2]._id : p1;
  const p3 = products[3] ? products[3]._id : p0;
  return {
    combo1: { requirement: p0, beneficiary: p1 },
    combo2: { requirement: p2, beneficiary: p3 },
    labels: {
      c1r: products[0],
      c1b: products[1],
      c2r: products[2] ?? products[1],
      c2b: products[3] ?? products[0],
    },
  };
}

async function main() {
  await mongoose.connect(MONGODB_URI);
  const productsCol = mongoose.connection.collection("products");
  const combosCol = mongoose.connection.collection("combos");

  const products = await productsCol.find({}).sort({ _id: 1 }).limit(8).toArray();

  const { combo1, combo2, labels } = pickProductIds(products);
  const now = new Date();

  const doc1 = {
    name: SEED_NAME_1,
    isActive: true,
    priority: 100,
    beneficiaryProductId: combo1.beneficiary,
    beneficiaryDiscountType: "percentage",
    beneficiaryDiscountValue: 8,
    requirements: [
      {
        productId: combo1.requirement,
        thresholdKind: "carton",
        minOuterUnits: 1,
      },
    ],
    updatedAt: now,
  };

  const doc2 = {
    name: SEED_NAME_2,
    isActive: true,
    priority: 110,
    beneficiaryProductId: combo2.beneficiary,
    beneficiaryDiscountType: "flat",
    beneficiaryDiscountValue: 10,
    requirements: [
      {
        productId: combo2.requirement,
        thresholdKind: "bag",
        minOuterUnits: 1,
      },
    ],
    updatedAt: now,
  };

  for (const doc of [doc1, doc2]) {
    const res = await combosCol.updateOne(
      { name: doc.name },
      {
        $set: doc,
        $setOnInsert: { createdAt: now },
      },
      { upsert: true }
    );
    const action =
      res.upsertedCount > 0 ? "inserted" : res.modifiedCount > 0 ? "updated" : "unchanged";
    console.log(`${action}: ${doc.name}`);
  }

  console.log("");
  console.log("Combo 1 — requirement:", skuName(labels.c1r), "| beneficiary:", skuName(labels.c1b));
  console.log("Combo 2 — requirement:", skuName(labels.c2r), "| beneficiary:", skuName(labels.c2b));
  console.log("Done.");

  await mongoose.disconnect();
}

function skuName(p) {
  const sku = p.sku ?? "?";
  const name = (p.name && String(p.name).slice(0, 48)) || "";
  return name ? `${sku} (${name}${p.name && String(p.name).length > 48 ? "…" : ""})` : String(sku);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
