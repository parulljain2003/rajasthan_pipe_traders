import type { CartItem } from "../../context/CartWishlistContext";
import { pricedPacketCount } from "@/lib/cart/packetLine";
import {
  computeCouponTierPacketCount,
  type ProductPackagingForCoupon,
} from "@/lib/coupons/couponTierQuantity";

/** Shape returned by GET /api/coupons (see `toPublicCouponBanner` in lib/coupons/evaluate.ts) */
export type PublicCouponBannerJson = {
  code: string;
  discount?: unknown;
  label?: unknown;
  condition?: unknown;
  desc?: unknown;
  theme?: unknown;
};

export type CartCouponOption = {
  code: string;
  /** Left stub primary (e.g. Up to 12%) */
  discount: string;
  /** Left stub secondary (e.g. OFF) */
  label: string;
  /** Title line (coupon name) */
  condition: string;
  desc: string;
  /** Accent for card strip (theme) */
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
  const color = COUPON_THEME_HEX[theme] ?? COUPON_THEME_HEX.blue;
  return {
    code: String(c.code ?? "").trim(),
    discount: String(c.discount ?? ""),
    label: typeof c.label === "string" ? c.label : "",
    condition: String(c.condition ?? ""),
    desc: typeof c.desc === "string" ? c.desc : "",
    color,
  };
}

export type { ProductPackagingForCoupon };

/**
 * Builds POST /api/coupons/validate lines. When `packagingPerLine` is provided (from
 * POST /api/cart/coupon-packaging), `quantity` uses MongoDB packaging + pricingUnit so
 * carton/box/bag/list units convert to packets for tier thresholds.
 */
export function cartLinesForCouponApi(
  items: CartItem[],
  packagingPerLine?: (ProductPackagingForCoupon | null)[] | null
) {
  return items.map((ci, idx) => {
    const pk = pricedPacketCount(ci);
    const lineSubtotal = ci.pricePerUnit * pk;
    const pkg = packagingPerLine?.[idx] ?? null;
    const tierQty =
      pkg != null
        ? computeCouponTierPacketCount({
            lineSubtotalInclGst: lineSubtotal,
            unitPriceWithGst: ci.pricePerUnit,
            product: pkg,
            clientPacketQuantity: pk,
          })
        : pk;
    const comboPk = ci.comboPricedPackets ?? 0;
    const comboSubtotalInclGst =
      ci.comboSubtotalInclGst != null && ci.comboSubtotalInclGst > 0
        ? ci.comboSubtotalInclGst
        : comboPk > 0 && pk > 0
          ? (lineSubtotal * comboPk) / pk
          : 0;
    return {
      productMongoId: ci.mongoProductId,
      /** Matches MongoDB Product.legacyId — lets coupons work when mongo ids were not stored on cart add */
      legacyProductId: ci.productId,
      categoryMongoId: ci.categoryMongoId,
      sellerId: ci.sellerId,
      size: ci.size,
      /** Priced packets — combo / couponable split */
      quantity: pk,
      /** Packaging-aware packet count for tier thresholds (omit when same as quantity) */
      ...(tierQty !== pk ? { tierPacketQuantity: tierQty } : {}),
      lineSubtotal,
      lineBasicSubtotal: ci.basicPricePerUnit * pk,
      ...(comboSubtotalInclGst > 0 ? { comboSubtotalInclGst } : {}),
    };
  });
}

export type CouponApplyResult = { ok: true } | { ok: false; message: string };

/** POST /api/coupons/validate success and error bodies */
export type CouponValidateResponseJson = {
  valid?: boolean;
  reason?: string;
  message?: string;
  discountAmount?: number;
  /** Server-computed GST-inclusive cart subtotal (authoritative when lines use Mongo product ids) */
  cartSubtotalInclGst?: number;
  eligiblePacketCount?: number;
};
