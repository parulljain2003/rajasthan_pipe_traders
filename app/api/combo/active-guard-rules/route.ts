import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { ComboRuleModel } from "@/lib/db/models/ComboRule";
import type { ComboRuleGuard } from "@/lib/combo/comboAddGuard";
import { expandManyComboRulesForRuntime } from "@/lib/combo/expandComboRuleSlugs";

function normSlugList(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return [...new Set(arr.map((s) => String(s).trim().toLowerCase()).filter(Boolean))];
}

function categoryIdsToStrings(arr: unknown): string[] {
  if (!Array.isArray(arr)) return [];
  return arr.map((x) => String(x)).filter(Boolean);
}

type ExpandedRow = {
  _id: unknown;
  name?: unknown;
  triggerSlugs: string[];
  targetSlugs: string[];
  fallbackTargetSlugs?: unknown;
  triggerCategoryIds?: unknown;
  targetCategoryIds?: unknown;
  minTriggerBags?: unknown;
  minTargetBags?: unknown;
  triggerThresholdUnit?: unknown;
  targetThresholdUnit?: unknown;
  suggestionMessage?: unknown;
  isActive?: unknown;
};

function asThresholdUnit(
  v: unknown
): "packets" | "bags" | "cartons" {
  return v === "packets" || v === "bags" || v === "cartons" ? v : "bags";
}

/**
 * Public: active combo rules for add-to-cart guard and storefront logic.
 * `triggerSlugs` / `targetSlugs`: explicit DB slugs; category picks expand only when that side’s slug list is empty.
 * Identification of trigger vs target vs fallback is by these slug lists — not by product `isEligibleForCombo`.
 */
export async function GET() {
  try {
    await connectDb();
    const rows = await ComboRuleModel.find({ isActive: true })
      .select(
        "_id name triggerSlugs targetSlugs fallbackTargetSlugs triggerCategoryIds targetCategoryIds minTriggerBags minTargetBags triggerThresholdUnit targetThresholdUnit suggestionMessage isActive"
      )
      .sort({ _id: 1 })
      .lean();

    const expanded = (await expandManyComboRulesForRuntime(
      rows as Parameters<typeof expandManyComboRulesForRuntime>[0]
    )) as ExpandedRow[];

    const rules: ComboRuleGuard[] = expanded.map((r) => ({
      _id: String(r._id),
      name: typeof r.name === "string" ? r.name : "",
      triggerSlugs: r.triggerSlugs,
      targetSlugs: r.targetSlugs,
      fallbackTargetSlugs: normSlugList(r.fallbackTargetSlugs),
      triggerCategoryIds: categoryIdsToStrings(r.triggerCategoryIds),
      targetCategoryIds: categoryIdsToStrings(r.targetCategoryIds),
      minTriggerBags:
        typeof r.minTriggerBags === "number" && Number.isFinite(r.minTriggerBags) ? r.minTriggerBags : 3,
      minTargetBags:
        typeof r.minTargetBags === "number" && Number.isFinite(r.minTargetBags) ? r.minTargetBags : 1,
      triggerThresholdUnit: asThresholdUnit(r.triggerThresholdUnit),
      targetThresholdUnit: asThresholdUnit(r.targetThresholdUnit),
      suggestionMessage: typeof r.suggestionMessage === "string" ? r.suggestionMessage : "",
      isActive: r.isActive === true,
    }));

    return NextResponse.json({ data: { rules } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
