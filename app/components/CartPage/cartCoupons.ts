import type { CartItem } from "../../context/CartWishlistContext";

/** Shape returned by GET /api/coupons (see `toPublicCouponBanner` in lib/coupons/evaluate.ts) */
export type PublicCouponBannerJson = {
  code: string;
  discount?: unknown;
  label?: unknown;
  condition?: unknown;
  desc?: unknown;
  theme?: unknown;
  customColors?: {
    accent?: string;
    stubBackground?: string;
    border?: string;
    buttonBackground?: string;
    buttonText?: string;
  };
};

export type CartCouponOption = {
  code: string;
  /** Left stub primary (e.g. 7%, ₹500) */
  discount: string;
  /** Left stub secondary (e.g. OFF) */
  label: string;
  /** Title line */
  condition: string;
  desc: string;
  /** Accent for card strip (theme or custom accent) */
  color: string;
};

export const COUPON_THEME_HEX: Record<string, string> = {
  blue: "#2563eb",
  indigo: "#4f46e5",
  green: "#059669",
  amber: "#d97706",
  brown: "#92400e",
};

export function mapPublicCouponToOption(c: PublicCouponBannerJson): CartCouponOption {
  const theme = typeof c.theme === "string" ? c.theme : "blue";
  const accent = c.customColors?.accent?.trim();
  const color =
    accent && accent.length > 0 ? accent : COUPON_THEME_HEX[theme] ?? COUPON_THEME_HEX.blue;
  return {
    code: String(c.code ?? "").trim(),
    discount: String(c.discount ?? ""),
    label: typeof c.label === "string" ? c.label : "",
    condition: String(c.condition ?? ""),
    desc: typeof c.desc === "string" ? c.desc : "",
    color,
  };
}

export function cartLinesForCouponApi(items: CartItem[]) {
  return items.map((ci) => ({
    productMongoId: ci.mongoProductId,
    /** Matches MongoDB Product.legacyId — lets coupons work when mongo ids were not stored on cart add */
    legacyProductId: ci.productId,
    categoryMongoId: ci.categoryMongoId,
    sellerId: ci.sellerId,
    size: ci.size,
    quantity: ci.quantity,
    lineSubtotal: ci.pricePerUnit * ci.quantity,
    lineBasicSubtotal: ci.basicPricePerUnit * ci.quantity,
  }));
}

export type CouponApplyResult = { ok: true } | { ok: false; message: string };

/** POST /api/coupons/validate success and error bodies */
export type CouponValidateResponseJson = {
  valid?: boolean;
  reason?: string;
  message?: string;
  discountAmount?: number;
  freeDispatch?: boolean;
  freeShipping?: boolean;
  /** Server-computed GST-inclusive cart subtotal (authoritative when lines use Mongo product ids) */
  cartSubtotalInclGst?: number;
};
