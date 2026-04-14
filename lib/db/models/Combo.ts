import mongoose, { Schema, model } from "mongoose";

const THRESHOLD_KINDS = ["bag", "carton"] as const;
const BENEFICIARY_DISCOUNT_TYPES = ["percentage", "flat"] as const;

const comboRequirementSchema = new Schema(
  {
    productId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    thresholdKind: {
      type: String,
      enum: THRESHOLD_KINDS,
      required: true,
    },
    minOuterUnits: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const comboSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    isActive: { type: Boolean, default: true },
    /** Lower runs first when multiple combos match */
    priority: { type: Number, default: 100 },
    beneficiaryProductId: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    /**
     * Discount on the beneficiary product’s list unit prices (all sizes / lines for that product).
     * Percentage: 0–100 off list. Flat: ₹ off per priced unit (GST-inclusive); ex-GST scales proportionally.
     */
    beneficiaryDiscountType: {
      type: String,
      enum: BENEFICIARY_DISCOUNT_TYPES,
      default: "percentage",
    },
    beneficiaryDiscountValue: { type: Number, required: true, min: 0 },
    requirements: {
      type: [comboRequirementSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
        message: "At least one requirement is required",
      },
    },
  },
  { timestamps: true }
);

comboSchema.index({ isActive: 1, priority: 1 });
comboSchema.index({ beneficiaryProductId: 1 });

// Next.js / dev can keep a stale `Combo` in mongoose.models after schema changes.
// `models.Combo ?? model(...)` would then never pick up new paths and old required fields
// (e.g. comboBasicPrice) keep validating. Always register from the schema in this file.
if (mongoose.models.Combo) {
  mongoose.deleteModel("Combo");
}
export const ComboModel = model("Combo", comboSchema);

export type ComboThresholdKind = (typeof THRESHOLD_KINDS)[number];
export type BeneficiaryDiscountType = (typeof BENEFICIARY_DISCOUNT_TYPES)[number];
