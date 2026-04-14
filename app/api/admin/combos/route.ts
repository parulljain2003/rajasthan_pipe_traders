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

export async function GET() {
  try {
    await connectDb();
    const rows = await ComboModel.find({})
      .populate("beneficiaryProductId", "sku name slug")
      .populate("requirements.productId", "sku name slug")
      .sort({ priority: 1, name: 1 })
      .lean();
    const data = rows.map((r) => serializeComboLean(r as Parameters<typeof serializeComboLean>[0])!);
    return NextResponse.json({ data });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const name = typeof body.name === "string" ? body.name.trim() : "";
    if (!name) return err("name is required", 400);
    const beneficiaryProductId = parseObjectId(body.beneficiaryProductId);
    if (!beneficiaryProductId) return err("beneficiaryProductId must be a valid ObjectId", 400);
    const disc = parseBeneficiaryDiscount(body);
    if (!disc) {
      return err("beneficiaryDiscountType must be percentage or flat; beneficiaryDiscountValue must be valid (0–100 for %)", 400);
    }
    const requirements = parseRequirements(body.requirements);
    if (!requirements) return err("requirements must be a non-empty array of valid rows", 400);
    const priority = typeof body.priority === "number" ? body.priority : Number(body.priority);
    const doc = await ComboModel.create({
      name,
      priority: Number.isFinite(priority) ? priority : 100,
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      beneficiaryProductId,
      beneficiaryDiscountType: disc.type,
      beneficiaryDiscountValue: disc.value,
      requirements,
    });
    const populated = await ComboModel.findById(doc._id)
      .populate("beneficiaryProductId", "sku name slug")
      .populate("requirements.productId", "sku name slug")
      .lean();
    return NextResponse.json({
      data: serializeComboLean(populated as Parameters<typeof serializeComboLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
