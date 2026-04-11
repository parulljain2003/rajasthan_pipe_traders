import type { CouponThemeKey } from "@/lib/db/models/Coupon";

export type CouponLean = {
  code: string;
  discountType: "percentage" | "fixed_amount" | "free_dispatch" | "free_shipping";
  discountPercent?: number;
  fixedAmountOff?: number;
  applicableProductIds?: { toString(): string }[];
  applicableCategoryIds?: { toString(): string }[];
  minOrderValue?: number;
  minTotalQuantity?: number;
  minEligibleLines?: number;
  startAt?: Date | null;
  endAt?: Date | null;
  isActive?: boolean;
};

/**
 * Cart line for coupon math. `lineSubtotal` is always GST-inclusive (matches storefront cart totals).
 * `lineBasicSubtotal` is optional ex-GST; used for reporting only when present.
 */
export type CartLineInput = {
  productMongoId?: string;
  categoryMongoId?: string;
  quantity: number;
  /** GST-inclusive line total (₹) */
  lineSubtotal: number;
  /** Ex-GST line total when known (₹) */
  lineBasicSubtotal?: number;
};

export function isCouponInSchedule(
  coupon: Pick<CouponLean, "startAt" | "endAt">,
  now: Date = new Date()
): boolean {
  if (coupon.startAt && now < new Date(coupon.startAt)) return false;
  if (coupon.endAt && now > new Date(coupon.endAt)) return false;
  return true;
}

function idSet(ids: unknown[] | undefined): Set<string> {
  const s = new Set<string>();
  if (!ids?.length) return s;
  for (const x of ids) {
    if (x != null) s.add(String(x));
  }
  return s;
}

/** Line qualifies when product or category matches restriction lists; empty lists = all lines qualify. */
export function lineMatchesScope(
  line: CartLineInput,
  productIds: Set<string>,
  categoryIds: Set<string>
): boolean {
  const restricted = productIds.size > 0 || categoryIds.size > 0;
  if (!restricted) return true;
  const pid = line.productMongoId?.trim();
  const cid = line.categoryMongoId?.trim();
  if (productIds.size > 0 && pid && productIds.has(pid)) return true;
  if (categoryIds.size > 0 && cid && categoryIds.has(cid)) return true;
  return false;
}

export type EligibleTotals = {
  eligibleSubtotal: number;
  eligibleQuantity: number;
  eligibleLineCount: number;
};

export function eligibleTotalsForCoupon(coupon: CouponLean, lines: CartLineInput[]): EligibleTotals {
  const productIds = idSet(coupon.applicableProductIds as unknown[]);
  const categoryIds = idSet(coupon.applicableCategoryIds as unknown[]);
  let eligibleSubtotal = 0;
  let eligibleQuantity = 0;
  let eligibleLineCount = 0;
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    if (!lineMatchesScope(line, productIds, categoryIds)) continue;
    eligibleSubtotal += Math.max(0, line.lineSubtotal);
    eligibleQuantity += line.quantity;
    eligibleLineCount += 1;
  }
  return { eligibleSubtotal, eligibleQuantity, eligibleLineCount };
}

export type DiscountResult = {
  discountAmount: number;
  freeDispatch: boolean;
  freeShipping: boolean;
};

export function computeDiscountAmount(coupon: CouponLean, eligibleSubtotal: number): DiscountResult {
  const sub = Math.max(0, eligibleSubtotal);
  if (coupon.discountType === "free_dispatch") {
    return { discountAmount: 0, freeDispatch: true, freeShipping: false };
  }
  if (coupon.discountType === "free_shipping") {
    return { discountAmount: 0, freeDispatch: false, freeShipping: true };
  }
  if (coupon.discountType === "fixed_amount") {
    const off = Math.max(0, Number(coupon.fixedAmountOff) || 0);
    return {
      discountAmount: Math.min(sub, off),
      freeDispatch: false,
      freeShipping: false,
    };
  }
  if (coupon.discountType !== "percentage") {
    return { discountAmount: 0, freeDispatch: false, freeShipping: false };
  }
  const pct = Math.max(0, Math.min(100, Number(coupon.discountPercent) || 0));
  return {
    discountAmount: Math.round((sub * pct) / 100),
    freeDispatch: false,
    freeShipping: false,
  };
}

export type ValidateCouponResult =
  | {
      ok: true;
      discountAmount: number;
      freeDispatch: boolean;
      freeShipping: boolean;
      /** Sum of GST-inclusive subtotals for lines that count toward this coupon */
      eligibleSubtotal: number;
      eligibleQuantity: number;
      eligibleLineCount: number;
      /** Full cart GST-inclusive subtotal (all lines), for reconciliation */
      cartSubtotalInclGst: number;
    }
  | { ok: false; reason: string };

function sumCartSubtotal(lines: CartLineInput[]): number {
  let t = 0;
  for (const line of lines) {
    if (line.quantity <= 0) continue;
    t += Math.max(0, line.lineSubtotal);
  }
  return roundMoney(t);
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * `minOrderValue` applies to the GST-inclusive eligible subtotal (same basis as cart “Grand Total”).
 */
export function validateCouponAgainstCart(
  coupon: CouponLean | null,
  lines: CartLineInput[],
  now: Date = new Date()
): ValidateCouponResult {
  const activeLines = lines.filter((l) => l.quantity > 0 && Number.isFinite(l.lineSubtotal));
  if (activeLines.length === 0) {
    return { ok: false, reason: "Cart is empty" };
  }

  if (!coupon) {
    return { ok: false, reason: "Invalid or expired coupon" };
  }
  if (!coupon.isActive) {
    return { ok: false, reason: "Coupon is not active" };
  }
  if (!isCouponInSchedule(coupon, now)) {
    return { ok: false, reason: "Coupon is not valid at this time" };
  }
  const cartSubtotalInclGst = sumCartSubtotal(activeLines);
  const { eligibleSubtotal, eligibleQuantity, eligibleLineCount } = eligibleTotalsForCoupon(coupon, activeLines);
  const productIds = idSet(coupon.applicableProductIds as unknown[]);
  const categoryIds = idSet(coupon.applicableCategoryIds as unknown[]);
  const restricted = productIds.size > 0 || categoryIds.size > 0;
  if (restricted && eligibleLineCount === 0) {
    return { ok: false, reason: "No items in your cart match this coupon" };
  }
  const minOrder = Number(coupon.minOrderValue) || 0;
  if (minOrder > 0 && eligibleSubtotal < minOrder) {
    return {
      ok: false,
      reason: `Minimum order value ₹${minOrder.toLocaleString("en-IN")} on eligible items not met`,
    };
  }
  const minQty = Number(coupon.minTotalQuantity) || 0;
  if (minQty > 0 && eligibleQuantity < minQty) {
    return {
      ok: false,
      reason: `Minimum quantity ${minQty} on eligible items not met`,
    };
  }
  const minLines = Number(coupon.minEligibleLines) || 0;
  if (minLines > 0 && eligibleLineCount < minLines) {
    return {
      ok: false,
      reason: `At least ${minLines} eligible product line(s) required`,
    };
  }
  let { discountAmount, freeDispatch, freeShipping } = computeDiscountAmount(coupon, eligibleSubtotal);
  discountAmount = roundMoney(discountAmount);
  if (discountAmount > cartSubtotalInclGst) {
    discountAmount = cartSubtotalInclGst;
  }
  return {
    ok: true,
    discountAmount,
    freeDispatch,
    freeShipping,
    eligibleSubtotal: roundMoney(eligibleSubtotal),
    eligibleQuantity,
    eligibleLineCount,
    cartSubtotalInclGst,
  };
}

export function themeKeyOrDefault(key: string | undefined): CouponThemeKey {
  const allowed: CouponThemeKey[] = ["blue", "indigo", "green", "amber", "brown"];
  if (key && allowed.includes(key as CouponThemeKey)) return key as CouponThemeKey;
  return "blue";
}

export function toPublicCouponBanner(doc: Record<string, unknown>): Record<string, unknown> {
  const offerRaw = doc.offerAppliesTo;
  const offerAppliesTo =
    typeof offerRaw === "string" && offerRaw.trim() !== "" ? offerRaw.trim() : undefined;
  const out: Record<string, unknown> = {
    code: doc.code,
    discount: doc.displayPrimary,
    label: doc.displaySecondary ?? "",
    condition: doc.title,
    desc: doc.description ?? "",
    theme: themeKeyOrDefault(String(doc.themeKey ?? "blue")),
  };
  if (offerAppliesTo) out.offerAppliesTo = offerAppliesTo;
  return out;
}
