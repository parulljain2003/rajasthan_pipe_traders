import { NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { ComboRuleModel } from "@/lib/db/models/ComboRule";
import type { ComboRuleGuard } from "@/lib/combo/comboAddGuard";
import { expandManyComboRulesForRuntime } from "@/lib/combo/expandComboRuleSlugs";

type ExpandedGuardRow = {
  _id: unknown;
  triggerSlugs: string[];
  targetSlugs: string[];
  minTargetBags?: number;
  targetThresholdUnit?: string;
};

/**
 * Public: minimal active combo rules for add-to-cart guard (target vs trigger slugs).
 * Category selections are expanded to product slugs here.
 */
export async function GET() {
  try {
    await connectDb();
    const rows = await ComboRuleModel.find({ isActive: true })
      .select("_id triggerSlugs targetSlugs triggerCategoryIds targetCategoryIds minTargetBags targetThresholdUnit")
      .sort({ _id: 1 })
      .lean();

    const expanded = (await expandManyComboRulesForRuntime(
      rows as Parameters<typeof expandManyComboRulesForRuntime>[0]
    )) as ExpandedGuardRow[];

    const rules: ComboRuleGuard[] = expanded.map((r) => ({
      _id: String(r._id),
      triggerSlugs: r.triggerSlugs,
      targetSlugs: r.targetSlugs,
      minTargetBags: typeof r.minTargetBags === "number" && Number.isFinite(r.minTargetBags) ? r.minTargetBags : 1,
      targetThresholdUnit:
        r.targetThresholdUnit === "packets" || r.targetThresholdUnit === "bags" || r.targetThresholdUnit === "cartons"
          ? r.targetThresholdUnit
          : "bags",
    }));

    return NextResponse.json({ data: { rules } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return NextResponse.json({ message }, { status: 500 });
  }
}
