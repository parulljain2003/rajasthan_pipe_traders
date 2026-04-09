import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { CouponModel } from "@/lib/db/models/Coupon";
import { serializeCouponLean } from "@/lib/db/serialize";
import {
  isDiscountType,
  normalizeThemeKey,
  parseCustomColors,
  parseObjectIdList,
  parseOptionalDate,
} from "@/lib/coupons/couponPayload";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const sp = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = {};
    if (sp.get("isActive") === "true") filter.isActive = true;
    if (sp.get("isActive") === "false") filter.isActive = false;
    const rows = await CouponModel.find(filter)
      .populate("applicableProductIds", "sku name slug")
      .populate("applicableCategoryIds", "name slug")
      .sort({ sortOrder: 1, code: 1 })
      .lean();
    const data = rows.map((r) => serializeCouponLean(r as Parameters<typeof serializeCouponLean>[0])!);
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
    const code = typeof body.code === "string" ? body.code.trim().toUpperCase() : "";
    if (!code) return err("code is required", 400);
    if (!isDiscountType(body.discountType)) {
      return err("discountType must be percentage, fixed_amount, free_dispatch, or free_shipping", 400);
    }
    const displayPrimary =
      typeof body.displayPrimary === "string" ? body.displayPrimary.trim() : "";
    const title = typeof body.title === "string" ? body.title.trim() : "";
    if (!displayPrimary || !title) {
      return err("displayPrimary and title are required", 400);
    }
    const discountType = body.discountType;
    if (discountType === "percentage") {
      if (typeof body.discountPercent !== "number" || body.discountPercent < 0 || body.discountPercent > 100) {
        return err("discountPercent (0–100) is required for percentage coupons", 400);
      }
    }
    if (discountType === "fixed_amount") {
      if (typeof body.fixedAmountOff !== "number" || body.fixedAmountOff <= 0) {
        return err("fixedAmountOff (positive number) is required for fixed_amount coupons", 400);
      }
    }
    const customColors = parseCustomColors(body);
    const doc = await CouponModel.create({
      code,
      name: typeof body.name === "string" ? body.name.trim() : undefined,
      discountType,
      discountPercent: typeof body.discountPercent === "number" ? body.discountPercent : undefined,
      fixedAmountOff: typeof body.fixedAmountOff === "number" ? body.fixedAmountOff : undefined,
      displayPrimary,
      displaySecondary: typeof body.displaySecondary === "string" ? body.displaySecondary.trim() : "",
      title,
      description: typeof body.description === "string" ? body.description.trim() : "",
      themeKey: normalizeThemeKey(body.themeKey),
      customColors,
      applicableProductIds: parseObjectIdList(body.applicableProductIds),
      applicableCategoryIds: parseObjectIdList(body.applicableCategoryIds),
      minOrderValue: typeof body.minOrderValue === "number" ? Math.max(0, body.minOrderValue) : 0,
      minTotalQuantity: typeof body.minTotalQuantity === "number" ? Math.max(0, body.minTotalQuantity) : 0,
      minEligibleLines: typeof body.minEligibleLines === "number" ? Math.max(0, body.minEligibleLines) : 0,
      startAt: parseOptionalDate(body.startAt),
      endAt: parseOptionalDate(body.endAt),
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      displayInBanner: typeof body.displayInBanner === "boolean" ? body.displayInBanner : true,
      showInCart: typeof body.showInCart === "boolean" ? body.showInCart : true,
      sortOrder: typeof body.sortOrder === "number" ? body.sortOrder : 0,
      internalNotes: typeof body.internalNotes === "string" ? body.internalNotes.trim() : undefined,
    });
    const populated = await CouponModel.findById(doc._id)
      .populate("applicableProductIds", "sku name slug")
      .populate("applicableCategoryIds", "name slug")
      .lean();
    return NextResponse.json({
      data: serializeCouponLean(populated as Parameters<typeof serializeCouponLean>[0]),
    });
  } catch (e) {
    if (e instanceof mongoose.mongo.MongoServerError && e.code === 11000) {
      return err("A coupon with this code already exists", 409);
    }
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
