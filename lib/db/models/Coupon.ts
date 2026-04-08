import mongoose, { Schema, models, model } from "mongoose";

const THEME_KEYS = ["blue", "indigo", "green", "amber", "brown"] as const;
export type CouponThemeKey = (typeof THEME_KEYS)[number];

const DISCOUNT_TYPES = ["percentage", "fixed_amount", "free_dispatch", "free_shipping"] as const;

const customColorsSchema = new Schema(
  {
    accent: { type: String, trim: true },
    stubBackground: { type: String, trim: true },
    border: { type: String, trim: true },
    buttonBackground: { type: String, trim: true },
    buttonText: { type: String, trim: true },
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
    /** Admin-only label */
    name: { type: String, trim: true },
    discountType: {
      type: String,
      enum: DISCOUNT_TYPES,
      required: true,
    },
    discountPercent: { type: Number, min: 0, max: 100 },
    /** INR off eligible subtotal */
    fixedAmountOff: { type: Number, min: 0 },
    /** Left stub — main line (e.g. 7%, FREE) */
    displayPrimary: { type: String, required: true, trim: true },
    /** Left stub — secondary (e.g. OFF, DISPATCH) */
    displaySecondary: { type: String, trim: true, default: "" },
    title: { type: String, required: true, trim: true },
    description: { type: String, trim: true, default: "" },
    themeKey: {
      type: String,
      enum: THEME_KEYS,
      default: "blue",
    },
    /** Optional hex overrides for the storefront card (inline styles) */
    customColors: { type: customColorsSchema, default: undefined },
    /** Empty arrays = all products / categories allowed */
    applicableProductIds: [{ type: Schema.Types.ObjectId, ref: "Product" }],
    applicableCategoryIds: [{ type: Schema.Types.ObjectId, ref: "Category" }],
    minOrderValue: { type: Number, min: 0, default: 0 },
    /** Sum of quantities on eligible lines (e.g. total cartons) */
    minTotalQuantity: { type: Number, min: 0, default: 0 },
    /** Minimum number of eligible line items with quantity > 0 */
    minEligibleLines: { type: Number, min: 0, default: 0 },
    startAt: { type: Date },
    endAt: { type: Date },
    isActive: { type: Boolean, default: true },
    displayInBanner: { type: Boolean, default: true },
    /** Shown in cart coupon picker when true */
    showInCart: { type: Boolean, default: true },
    sortOrder: { type: Number, default: 0 },
    internalNotes: { type: String, trim: true },
  },
  { timestamps: true }
);

couponSchema.index({ isActive: 1, displayInBanner: 1, sortOrder: 1 });
couponSchema.index({ isActive: 1, showInCart: 1, sortOrder: 1 });

export const CouponModel = models.Coupon ?? model("Coupon", couponSchema);
