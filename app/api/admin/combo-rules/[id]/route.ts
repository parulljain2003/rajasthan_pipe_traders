import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { ComboRuleModel } from "@/lib/db/models/ComboRule";
import { serializeComboRuleLean } from "@/lib/db/serialize";
import {
  hasComboPriceInclGstInput,
  parseComboPriceInclGst,
  parseMinTriggerBags,
  parseObjectIdList,
  parseSlugList,
} from "@/lib/comboRules/comboRulePayload";
import { parseThresholdUnit } from "@/lib/comboRules/thresholdUnits";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid combo rule id", 400);
    await connectDb();
    const row = await ComboRuleModel.findById(id).lean();
    if (!row) return err("Combo rule not found", 404);
    return NextResponse.json({
      data: serializeComboRuleLean(row as Parameters<typeof serializeComboRuleLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid combo rule id", 400);
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const $set: Record<string, unknown> = {};
    let $unset: Record<string, 1> | undefined;

    if (typeof body.name === "string") {
      const n = body.name.trim();
      if (!n) return err("name cannot be empty", 400);
      $set.name = n;
    }
    if (body.triggerSlugs !== undefined) $set.triggerSlugs = parseSlugList(body.triggerSlugs);
    if (body.targetSlugs !== undefined) $set.targetSlugs = parseSlugList(body.targetSlugs);
    if (body.triggerCategoryIds !== undefined) {
      $set.triggerCategoryIds = parseObjectIdList(body.triggerCategoryIds).map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }
    if (body.targetCategoryIds !== undefined) {
      $set.targetCategoryIds = parseObjectIdList(body.targetCategoryIds).map(
        (id) => new mongoose.Types.ObjectId(id)
      );
    }
    if (Object.prototype.hasOwnProperty.call(body, "minTriggerBags")) {
      $set.minTriggerBags = parseMinTriggerBags(body.minTriggerBags, 3);
    }
    if (Object.prototype.hasOwnProperty.call(body, "minTargetBags")) {
      $set.minTargetBags = parseMinTriggerBags(body.minTargetBags, 1);
    }
    if (Object.prototype.hasOwnProperty.call(body, "triggerThresholdUnit")) {
      $set.triggerThresholdUnit = parseThresholdUnit(body.triggerThresholdUnit, "bags");
    }
    if (Object.prototype.hasOwnProperty.call(body, "targetThresholdUnit")) {
      $set.targetThresholdUnit = parseThresholdUnit(body.targetThresholdUnit, "bags");
    }
    if (Object.prototype.hasOwnProperty.call(body, "comboPriceInclGst")) {
      const raw = body.comboPriceInclGst;
      if (!hasComboPriceInclGstInput(raw)) {
        $unset = { comboPriceInclGst: 1 };
      } else {
        const p = parseComboPriceInclGst(raw);
        if (p === null) {
          return err("comboPriceInclGst must be a non-negative number", 400);
        }
        $set.comboPriceInclGst = p;
      }
    }
    if (typeof body.suggestionMessage === "string") $set.suggestionMessage = body.suggestionMessage.trim();
    if (typeof body.isActive === "boolean") $set.isActive = body.isActive;

    if (Object.keys($set).length === 0 && !$unset) {
      const row = await ComboRuleModel.findById(id).lean();
      if (!row) return err("Combo rule not found", 404);
      return NextResponse.json({
        data: serializeComboRuleLean(row as Parameters<typeof serializeComboRuleLean>[0]),
      });
    }

    const updatePayload: mongoose.UpdateQuery<unknown> = {};
    if (Object.keys($set).length > 0) updatePayload.$set = $set;
    if ($unset) updatePayload.$unset = $unset;

    const row = await ComboRuleModel.findByIdAndUpdate(id, updatePayload, { new: true, runValidators: true }).lean();
    if (!row) return err("Combo rule not found", 404);
    return NextResponse.json({
      data: serializeComboRuleLean(row as Parameters<typeof serializeComboRuleLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid combo rule id", 400);
    await connectDb();
    const deleted = await ComboRuleModel.findByIdAndDelete(id).lean();
    if (!deleted) return err("Combo rule not found", 404);
    return NextResponse.json({ data: { _id: id, deleted: true } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
