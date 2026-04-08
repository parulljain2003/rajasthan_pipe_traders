import type { CartItem } from "../../context/CartWishlistContext";

export type CartCouponOption = {
  code: string;
  discount: string;
  condition: string;
  desc: string;
  color: string;
};

export const COUPON_THEME_HEX: Record<string, string> = {
  blue: "#2563eb",
  indigo: "#4f46e5",
  green: "#059669",
  amber: "#d97706",
  brown: "#92400e",
};

export function cartLinesForCouponApi(items: CartItem[]) {
  return items.map((ci) => ({
    productMongoId: ci.mongoProductId,
    categoryMongoId: ci.categoryMongoId,
    quantity: ci.quantity,
    lineSubtotal: ci.pricePerUnit * ci.quantity,
  }));
}

export type CouponApplyResult = { ok: true } | { ok: false; message: string };
