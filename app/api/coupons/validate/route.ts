import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { CouponModel } from "@/lib/db/models/Coupon";
import type { CartLineInput, CouponLean } from "@/lib/coupons/evaluate";
import { validateCouponAgainstCart } from "@/lib/coupons/evaluate";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function parseLines(raw: unknown): CartLineInput[] | null {
  if (!Array.isArray(raw)) return null;
  const out: CartLineInput[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const quantity = typeof o.quantity === "number" ? o.quantity : Number(o.quantity);
    const lineSubtotal = typeof o.lineSubtotal === "number" ? o.lineSubtotal : Number(o.lineSubtotal);
    if (!Number.isFinite(quantity) || !Number.isFinite(lineSubtotal)) continue;
    out.push({
      productMongoId: typeof o.productMongoId === "string" ? o.productMongoId.trim() : undefined,
      categoryMongoId: typeof o.categoryMongoId === "string" ? o.categoryMongoId.trim() : undefined,
      quantity,
      lineSubtotal,
    });
  }
  return out;
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) return err("code is required", 400);
    const lines = parseLines(body.lines);
    if (lines === null) return err("lines must be an array", 400);
    const couponDoc = await CouponModel.findOne({ code }).lean();
    const coupon = couponDoc as unknown as CouponLean | null;
    const result = validateCouponAgainstCart(coupon, lines);
    if (!result.ok) {
      return NextResponse.json({ valid: false, reason: result.reason });
    }
    return NextResponse.json({
      valid: true,
      discountAmount: result.discountAmount,
      freeDispatch: result.freeDispatch,
      freeShipping: result.freeShipping,
      eligibleSubtotal: result.eligibleSubtotal,
      eligibleQuantity: result.eligibleQuantity,
      eligibleLineCount: result.eligibleLineCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
