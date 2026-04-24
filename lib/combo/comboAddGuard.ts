import type { ThresholdUnit } from "@/lib/comboRules/thresholdUnits";

/**
 * Client + server: decide if a product slug may be newly added to the cart
 * when it appears as a combo *target* (requires corresponding *trigger* lines first).
 * `minTargetBags` + `targetThresholdUnit` define the max target-side amount for combo (see comboTargetCap).
 */

export type ComboRuleGuard = {
  _id: string;
  /** Rule display name (from DB) */
  name?: string;
  /** Trigger pool: explicit `triggerSlugs`, or if empty then products in `triggerCategoryIds` */
  triggerSlugs: string[];
  /** Target pool: explicit `targetSlugs`, or if empty then products in `targetCategoryIds` */
  targetSlugs: string[];
  /** Fallback targets (explicit slugs only; not expanded from categories) */
  fallbackTargetSlugs?: string[];
  minTriggerBags?: number;
  minTargetBags?: number;
  triggerThresholdUnit?: ThresholdUnit;
  targetThresholdUnit?: ThresholdUnit;
  suggestionMessage?: string;
  /** Category ObjectIds as strings (for admin / diagnostics) */
  triggerCategoryIds?: string[];
  targetCategoryIds?: string[];
  isActive?: boolean;
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

/** True if slug appears in any active rule’s trigger pool (not based on product `isEligibleForCombo`). */
export function isComboTriggerSlug(productSlug: string, rules: ComboRuleGuard[]): boolean {
  return rules.some((r) => slugInList(productSlug, r.triggerSlugs));
}

/** True if slug appears in any active rule’s target pool. */
export function isComboTargetSlug(productSlug: string, rules: ComboRuleGuard[]): boolean {
  return rules.some((r) => slugInList(productSlug, r.targetSlugs));
}

/** True if slug appears in any active rule’s fallback target list. */
export function isComboFallbackTargetSlug(productSlug: string, rules: ComboRuleGuard[]): boolean {
  return rules.some((r) => slugInList(productSlug, r.fallbackTargetSlugs ?? []));
}

export const COMBO_TARGET_ADD_BLOCKED_MESSAGE =
  "This is a combo-only product. Please add the required category products (e.g., Patti) first to purchase this.";
