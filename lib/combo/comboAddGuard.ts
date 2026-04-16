import type { ThresholdUnit } from "@/lib/comboRules/thresholdUnits";

/**
 * Client + server: decide if a product slug may be newly added to the cart
 * when it appears as a combo *target* (requires corresponding *trigger* lines first).
 * `minTargetBags` + `targetThresholdUnit` define the max target-side amount for combo (see comboTargetCap).
 */

export type ComboRuleGuard = {
  _id: string;
  triggerSlugs: string[];
  targetSlugs: string[];
  minTargetBags?: number;
  targetThresholdUnit?: ThresholdUnit;
};

function normalizeSlug(s: string): string {
  return s.trim().toLowerCase();
}

function slugInList(slug: string, list: string[]): boolean {
  if (!list.length) return false;
  const n = normalizeSlug(slug);
  return list.some((t) => normalizeSlug(t) === n);
}

/**
 * True if `productSlug` is not constrained by any active rule, OR the cart already
 * contains at least one trigger slug for every active rule that lists this slug as a target.
 */
export function isEligibleForCombo(
  productSlug: string,
  cartItems: Array<{ productSlug: string }>,
  rules: ComboRuleGuard[]
): boolean {
  const applicable = rules.filter((r) => slugInList(productSlug, r.targetSlugs));
  if (applicable.length === 0) return true;

  const cartSlugs = new Set(cartItems.map((c) => normalizeSlug(c.productSlug)));
  return applicable.every((rule) => rule.triggerSlugs.some((t) => cartSlugs.has(normalizeSlug(t))));
}

export const COMBO_TARGET_ADD_BLOCKED_MESSAGE =
  "This is a combo-only product. Please add the required category products (e.g., Patti) first to purchase this.";
