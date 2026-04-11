import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { CouponModel } from "@/lib/db/models/Coupon";
import { serializeCouponLean } from "@/lib/db/serialize";
import {
  isDiscountType,
  normalizeThemeKey,
  parseObjectIdList,
  parseOfferAppliesTo,
  parseOptionalDate,
} from "@/lib/coupons/couponPayload";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid coupon id", 400);
    await connectDb();
    const row = await CouponModel.findById(id)
      .populate("applicableProductIds", "sku name slug")
      .populate("applicableCategoryIds", "name slug")
      .lean();
    if (!row) return err("Coupon not found", 404);
    return NextResponse.json({
      data: serializeCouponLean(row as Parameters<typeof serializeCouponLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid coupon id", 400);
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};
    if (typeof body.code === "string") $set.code = body.code.trim().toUpperCase();
    if (typeof body.name === "string") $set.name = body.name.trim();
    if (body.discountType !== undefined) {
      if (!isDiscountType(body.discountType)) {
        return err("discountType must be percentage, fixed_amount, free_dispatch, or free_shipping", 400);
      }
      $set.discountType = body.discountType;
    }
    if (typeof body.discountPercent === "number") $set.discountPercent = body.discountPercent;
    if (typeof body.fixedAmountOff === "number") $set.fixedAmountOff = body.fixedAmountOff;
    if (typeof body.displayPrimary === "string") $set.displayPrimary = body.displayPrimary.trim();
    if (typeof body.displaySecondary === "string") $set.displaySecondary = body.displaySecondary.trim();
    if (typeof body.title === "string") $set.title = body.title.trim();
    if (typeof body.description === "string") $set.description = body.description.trim();
    if (body.themeKey !== undefined) $set.themeKey = normalizeThemeKey(body.themeKey);
    if (body.offerAppliesTo !== undefined) $set.offerAppliesTo = parseOfferAppliesTo(body.offerAppliesTo);
    if (body.applicableProductIds !== undefined) {
      $set.applicableProductIds = parseObjectIdList(body.applicableProductIds);
    }
    if (body.applicableCategoryIds !== undefined) {
      $set.applicableCategoryIds = parseObjectIdList(body.applicableCategoryIds);
    }
    if (typeof body.minOrderValue === "number") $set.minOrderValue = Math.max(0, body.minOrderValue);
    if (typeof body.minTotalQuantity === "number") $set.minTotalQuantity = Math.max(0, body.minTotalQuantity);
    if (typeof body.minEligibleLines === "number") $set.minEligibleLines = Math.max(0, body.minEligibleLines);
    if ("startAt" in body) {
      const d = parseOptionalDate(body.startAt);
      $set.startAt = d === undefined ? null : d;
    }
    if ("endAt" in body) {
      const d = parseOptionalDate(body.endAt);
      $set.endAt = d === undefined ? null : d;
    }
    if (typeof body.isActive === "boolean") $set.isActive = body.isActive;
    if (typeof body.displayInBanner === "boolean") $set.displayInBanner = body.displayInBanner;
    if (typeof body.showInCart === "boolean") $set.showInCart = body.showInCart;
    if (typeof body.sortOrder === "number") $set.sortOrder = body.sortOrder;
    if (typeof body.internalNotes === "string") $set.internalNotes = body.internalNotes.trim();

    const mongoUpdate: { $set?: Record<string, unknown>; $unset?: Record<string, 1> } = {};
    if (Object.keys($set).length) mongoUpdate.$set = $set;
    if (Object.keys($unset).length) mongoUpdate.$unset = $unset;
    let row;
    if (!mongoUpdate.$set && !mongoUpdate.$unset) {
      row = await CouponModel.findById(id)
        .populate("applicableProductIds", "sku name slug")
        .populate("applicableCategoryIds", "name slug")
        .lean();
    } else {
      row = await CouponModel.findByIdAndUpdate(id, mongoUpdate, { new: true, runValidators: true })
        .populate("applicableProductIds", "sku name slug")
        .populate("applicableCategoryIds", "name slug")
        .lean();
    }
    if (!row) return err("Coupon not found", 404);
    return NextResponse.json({
      data: serializeCouponLean(row as Parameters<typeof serializeCouponLean>[0]),
    });
  } catch (e) {
    if (e instanceof mongoose.mongo.MongoServerError && e.code === 11000) {
      return err("A coupon with this code already exists", 409);
    }
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return err("Invalid coupon id", 400);
    await connectDb();
    const deleted = await CouponModel.findByIdAndDelete(id).lean();
    if (!deleted) return err("Coupon not found", 404);
    return NextResponse.json({ data: { _id: id, deleted: true } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
