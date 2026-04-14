import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { ComboModel } from "@/lib/db/models/Combo";
import { serializeComboLean } from "@/lib/db/serialize";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function parseObjectId(id: unknown): mongoose.Types.ObjectId | null {
  if (typeof id !== "string" || !id.trim()) return null;
  if (!mongoose.Types.ObjectId.isValid(id.trim())) return null;
  return new mongoose.Types.ObjectId(id.trim());
}

function parseRequirements(raw: unknown): Array<{
  productId: mongoose.Types.ObjectId;
  thresholdKind: "bag" | "carton";
  minOuterUnits: number;
}> | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const out: Array<{
    productId: mongoose.Types.ObjectId;
    thresholdKind: "bag" | "carton";
    minOuterUnits: number;
  }> = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const pid = parseObjectId(o.productId);
    if (!pid) return null;
    const tk = o.thresholdKind === "carton" ? "carton" : o.thresholdKind === "bag" ? "bag" : null;
    if (!tk) return null;
    const min = typeof o.minOuterUnits === "number" ? o.minOuterUnits : Number(o.minOuterUnits);
    if (!Number.isFinite(min) || min < 1) return null;
    out.push({ productId: pid, thresholdKind: tk, minOuterUnits: Math.floor(min) });
  }
  return out.length ? out : null;
}

function parseBeneficiaryDiscount(body: Record<string, unknown>): { type: "percentage" | "flat"; value: number } | null {
  const t = body.beneficiaryDiscountType === "flat" ? "flat" : "percentage";
  const v =
    typeof body.beneficiaryDiscountValue === "number"
      ? body.beneficiaryDiscountValue
      : Number(body.beneficiaryDiscountValue);
  if (!Number.isFinite(v) || v < 0) return null;
  if (t === "percentage" && v > 100) return null;
  return { type: t, value: v };
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid combo id", 400);
    await connectDb();
    const row = await ComboModel.findById(id)
      .populate("beneficiaryProductId", "sku name slug")
      .populate("requirements.productId", "sku name slug")
      .lean();
    if (!row) return err("Combo not found", 404);
    return NextResponse.json({
      data: serializeComboLean(row as Parameters<typeof serializeComboLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid combo id", 400);
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const $set: Record<string, unknown> = {};

    if (typeof body.name === "string") $set.name = body.name.trim();
    if (typeof body.priority === "number" || typeof body.priority === "string") {
      const p = typeof body.priority === "number" ? body.priority : Number(body.priority);
      if (Number.isFinite(p)) $set.priority = p;
    }
    if (typeof body.isActive === "boolean") $set.isActive = body.isActive;
    if (body.beneficiaryProductId !== undefined) {
      const b = parseObjectId(body.beneficiaryProductId);
      if (!b) return err("beneficiaryProductId must be a valid ObjectId", 400);
      $set.beneficiaryProductId = b;
    }
    if (body.beneficiaryDiscountType !== undefined || body.beneficiaryDiscountValue !== undefined) {
      const disc = parseBeneficiaryDiscount({
        beneficiaryDiscountType: body.beneficiaryDiscountType ?? "percentage",
        beneficiaryDiscountValue: body.beneficiaryDiscountValue,
      });
      if (!disc) return err("beneficiary discount invalid (percentage 0–100, flat ≥ 0)", 400);
      $set.beneficiaryDiscountType = disc.type;
      $set.beneficiaryDiscountValue = disc.value;
    }
    if (body.requirements !== undefined) {
      const req = parseRequirements(body.requirements);
      if (!req) return err("requirements invalid", 400);
      $set.requirements = req;
    }

    const updateDoc: Record<string, unknown> = {
      $unset: {
        beneficiarySize: "",
        comboBasicPrice: "",
        comboPriceWithGst: "",
      },
    };
    if (Object.keys($set).length > 0) {
      updateDoc.$set = $set;
    }

    const updated = await ComboModel.findByIdAndUpdate(id, updateDoc as never, { new: true, runValidators: true })
      .populate("beneficiaryProductId", "sku name slug")
      .populate("requirements.productId", "sku name slug")
      .lean();
    if (!updated) return err("Combo not found", 404);
    return NextResponse.json({
      data: serializeComboLean(updated as Parameters<typeof serializeComboLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid combo id", 400);
    await connectDb();
    const deleted = await ComboModel.findByIdAndDelete(id).lean();
    if (!deleted) return err("Combo not found", 404);
    return NextResponse.json({ ok: true });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
