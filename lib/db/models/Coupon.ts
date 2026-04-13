import mongoose, { Schema, models, model } from "mongoose";

const DISCOUNT_TYPES = ["percentage", "flat"] as const;

/**
 * Discount steps by total eligible packet count (same unit as cart `quantity` from
 * `pricedPacketCount` — bags are expanded to packets). Example rows:
 * 7% from 15 packets, 8% from 30, … (you can still describe these as cartons/bags in `description`).
 */
const packetTierSchema = new Schema(
  {
    minPackets: { type: Number, required: true, min: 0 },
    /** Percent (0–100) when discountType is `percentage`; INR off when `flat`. */
    value: { type: Number, required: true, min: 0 },
  },
  { _id: false }
);

const couponSchema = new Schema(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true,
    },
    name: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      required: true,
    },
    packetTiers: {
      type: [packetTierSchema],
      required: true,
      validate: {
        validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
        message: "At least one packet tier is required",
      },
    },
    /** Empty = coupon applies to all products */
    applicableProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    /** Empty = all categories (when product lists also empty, entire catalog) */
    applicableCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, code: 1 });

export const CouponModel = models.Coupon ?? model("Coupon", couponSchema);
