/**
 * Inserts 5 sample coupons tied to your catalog (products + categories).
 *
 * Usage (from project root):
 *   node --env-file=.env.local scripts/seed-sample-coupons.cjs
 * Or:
 *   set MONGODB_URI=... && node scripts/seed-sample-coupons.cjs
 *
 * Safe to run once; duplicate codes will fail with E11000 (skip or delete old coupons first).
 */

const mongoose = require("mongoose");

const MONGODB_URI = process.env.MONGODB_URI;
if (!MONGODB_URI) {
  console.error("Missing MONGODB_URI. Use: node --env-file=.env.local scripts/seed-sample-coupons.cjs");
  process.exit(1);
}

/** Your shared IDs */
const IDS = {
  productCableNailClips: "69d5597e987bfbfd3f2038cc",
  productDoubleNailClamp: "69d5597e987bfbfd3f2038cd",
  categoryCableNailClips: "69d5597c987bfbfd3f2038b2",
  categoryDoubleClamp: "69d5597c987bfbfd3f2038b3",
  catCrystalTaps: "69d5597d987bfbfd3f2038c7",
  catUpvcPpBallValve: "69d5597e987bfbfd3f2038c8",
  catPpSolidBallValve: "69d5597e987bfbfd3f2038c9",
  catUpvcCpvcBallValve: "69d5597e987bfbfd3f2038ca",
};

function oid(hex) {
  return new mongoose.Types.ObjectId(hex);
}

const now = new Date();

const coupons = [
  {
    code: "NAILCLIP7",
    name: "Cable nail clips — 7% off",
    discountType: "percentage",
    discountPercent: 7,
    displayPrimary: "7%",
    displaySecondary: "OFF",
    title: "Single Cable Nail Clips only",
    description: "Applies to eligible value on cable nail clips (CAT-CABLE-NAIL-CLIPS) in your cart.",
    themeKey: "green",
    applicableProductIds: [oid(IDS.productCableNailClips)],
    applicableCategoryIds: [],
    minOrderValue: 0,
    minTotalQuantity: 0,
    minEligibleLines: 0,
    isActive: true,
    displayInBanner: true,
    showInCart: true,
    sortOrder: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    code: "DNC500",
    name: "Double nail clamp — flat ₹500",
    discountType: "fixed_amount",
    fixedAmountOff: 500,
    displayPrimary: "₹500",
    displaySecondary: "OFF",
    title: "Double Nail Clamps",
    description: "Flat ₹500 off eligible subtotal on double nail clamp line(s). Min ₹5,000 eligible.",
    themeKey: "indigo",
    applicableProductIds: [oid(IDS.productDoubleNailClamp)],
    applicableCategoryIds: [],
    minOrderValue: 5000,
    minTotalQuantity: 0,
    minEligibleLines: 0,
    isActive: true,
    displayInBanner: true,
    showInCart: true,
    sortOrder: 20,
    createdAt: now,
    updatedAt: now,
  },
  {
    code: "BALLVALVE5",
    name: "Ball valve categories — 5%",
    discountType: "percentage",
    discountPercent: 5,
    displayPrimary: "5%",
    displaySecondary: "OFF",
    title: "UPVC / PP ball valves",
    description: "On RPT ball valve categories (UPVC-PP, PP solid, UPVC/CPVC).",
    themeKey: "blue",
    applicableProductIds: [],
    applicableCategoryIds: [
      oid(IDS.catUpvcPpBallValve),
      oid(IDS.catPpSolidBallValve),
      oid(IDS.catUpvcCpvcBallValve),
    ],
    minOrderValue: 0,
    minTotalQuantity: 0,
    minEligibleLines: 0,
    isActive: true,
    displayInBanner: true,
    showInCart: true,
    sortOrder: 30,
    createdAt: now,
    updatedAt: now,
  },
  {
    code: "CRYSTALSHIP",
    name: "Crystal taps — free shipping",
    discountType: "free_shipping",
    displayPrimary: "FREE",
    displaySecondary: "SHIP",
    title: "Crystal / PVC platinum series taps",
    description: "Free shipping on eligible crystal/PVC platinum taps category orders.",
    themeKey: "amber",
    applicableProductIds: [],
    applicableCategoryIds: [oid(IDS.catCrystalTaps)],
    minOrderValue: 15000,
    minTotalQuantity: 0,
    minEligibleLines: 1,
    isActive: true,
    displayInBanner: true,
    showInCart: true,
    sortOrder: 40,
    createdAt: now,
    updatedAt: now,
  },
  {
    code: "CABLECAT3",
    name: "Cable clips category — 3%",
    discountType: "percentage",
    discountPercent: 3,
    displayPrimary: "3%",
    displaySecondary: "OFF",
    title: "Cable clips category",
    description: "All products under the cable nail clips category (min 2 eligible lines).",
    themeKey: "brown",
    applicableProductIds: [],
    applicableCategoryIds: [oid(IDS.categoryCableNailClips)],
    minOrderValue: 0,
    minTotalQuantity: 0,
    minEligibleLines: 2,
    isActive: true,
    displayInBanner: true,
    showInCart: true,
    sortOrder: 50,
    createdAt: now,
    updatedAt: now,
  },
];

async function main() {
  await mongoose.connect(MONGODB_URI);
  const col = mongoose.connection.collection("coupons");
  const result = await col.insertMany(coupons, { ordered: false });
  console.log("Inserted coupons:", result.insertedCount);
  for (const c of coupons) {
    console.log(`  - ${c.code} (${c.discountType})`);
  }
  await mongoose.disconnect();
}

main().catch((e) => {
  if (e?.code === 11000 || e?.writeErrors?.some((w) => w.code === 11000)) {
    console.error("Duplicate coupon code(s). Remove existing coupons with these codes or rename them.");
  }
  console.error(e);
  process.exit(1);
});
