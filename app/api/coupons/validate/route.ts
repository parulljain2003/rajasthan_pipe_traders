import { NextRequest, NextResponse } from "next/server";
import { connectDb } from "@/lib/db/connect";
import { CouponModel } from "@/lib/db/models/Coupon";
import type { CouponLean } from "@/lib/coupons/evaluate";
import { validateCouponAgainstCart } from "@/lib/coupons/evaluate";
import { resolveCartLinesForCoupon, type IncomingCouponLine } from "@/lib/coupons/resolveCartLines";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

function parseIncomingLines(raw: unknown): IncomingCouponLine[] | null {
  if (!Array.isArray(raw)) return null;
  const out: IncomingCouponLine[] = [];
  for (const row of raw) {
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const quantity = typeof o.quantity === "number" ? o.quantity : Number(o.quantity);
    if (!Number.isFinite(quantity)) continue;

    let lineSubtotal: number | undefined;
    if (o.lineSubtotal !== undefined) {
      const n = typeof o.lineSubtotal === "number" ? o.lineSubtotal : Number(o.lineSubtotal);
      if (!Number.isFinite(n)) continue;
      lineSubtotal = n;
    }

    let lineBasicSubtotal: number | undefined;
    if (o.lineBasicSubtotal !== undefined) {
      const n = typeof o.lineBasicSubtotal === "number" ? o.lineBasicSubtotal : Number(o.lineBasicSubtotal);
      if (!Number.isFinite(n)) continue;
      lineBasicSubtotal = n;
    }

    let legacyProductId: number | undefined;
    if (o.legacyProductId !== undefined && o.legacyProductId !== null) {
      const n = typeof o.legacyProductId === "number" ? o.legacyProductId : Number(o.legacyProductId);
      if (Number.isFinite(n) && n > 0) legacyProductId = Math.floor(n);
    }

    let comboSubtotalInclGst: number | undefined;
    if (o.comboSubtotalInclGst !== undefined && o.comboSubtotalInclGst !== null) {
      const c = typeof o.comboSubtotalInclGst === "number" ? o.comboSubtotalInclGst : Number(o.comboSubtotalInclGst);
      if (Number.isFinite(c) && c >= 0) comboSubtotalInclGst = c;
    }

    out.push({
      productMongoId: typeof o.productMongoId === "string" ? o.productMongoId.trim() : undefined,
      legacyProductId,
      categoryMongoId: typeof o.categoryMongoId === "string" ? o.categoryMongoId.trim() : undefined,
      sellerId: typeof o.sellerId === "string" ? o.sellerId.trim() : undefined,
      size: typeof o.size === "string" ? o.size.trim() : undefined,
      quantity,
      lineSubtotal,
      lineBasicSubtotal,
      comboSubtotalInclGst,
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
    const incoming = parseIncomingLines(body.lines);
    if (incoming === null) return err("lines must be an array", 400);

    const resolved = await resolveCartLinesForCoupon(incoming);
    if (!resolved.ok) {
      return NextResponse.json({ valid: false, reason: resolved.reason });
    }

    const couponDoc = await CouponModel.findOne({ code }).lean();
    const coupon = couponDoc as unknown as CouponLean | null;
    const result = validateCouponAgainstCart(coupon, resolved.lines);
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
      cartSubtotalInclGst: result.cartSubtotalInclGst,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
