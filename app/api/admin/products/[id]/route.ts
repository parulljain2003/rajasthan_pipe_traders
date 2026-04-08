import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { ProductModel } from "@/lib/db/models/Product";
import { CategoryModel } from "@/lib/db/models/Category";
import { serializeProductLean } from "@/lib/db/serialize";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return err("Invalid product id", 400);
    }
    await connectDb();
    const row = await ProductModel.findById(id).populate("category", "name slug").lean();
    if (!row) return err("Product not found", 404);
    return NextResponse.json({
      data: serializeProductLean(row as Parameters<typeof serializeProductLean>[0]),
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return err("Invalid product id", 400);
    }
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const $set: Record<string, unknown> = {};
    const $unset: Record<string, 1> = {};
    const scalarString = [
      "name",
      "description",
      "longDescription",
      "subCategory",
      "brand",
      "brandCode",
      "productLine",
      "sizeOrModel",
      "minOrder",
      "note",
      "listNotes",
      "sourceDocument",
      "slug",
    ] as const;
    for (const key of scalarString) {
      if (typeof body[key] === "string") {
        $set[key] = key === "slug" ? (body[key] as string).trim().toLowerCase() : (body[key] as string);
      }
    }
    if ("image" in body) {
      if (body.image === null || body.image === "") {
        $unset.image = 1;
      } else if (typeof body.image === "string") {
        $set.image = body.image.trim();
      }
    }
    if (typeof body.sku === "string") $set.sku = body.sku.trim().toUpperCase();
    if (body.productKind === "sku" || body.productKind === "catalog") $set.productKind = body.productKind;
    if (typeof body.isNew === "boolean") $set.isNew = body.isNew;
    if (typeof body.isBestseller === "boolean") $set.isBestseller = body.isBestseller;
    if (typeof body.isActive === "boolean") $set.isActive = body.isActive;
    if (typeof body.moq === "number") $set.moq = body.moq;
    if (typeof body.legacyId === "number") $set.legacyId = body.legacyId;
    if (Array.isArray(body.features)) $set.features = body.features;
    if (body.images === null) {
      $unset.images = 1;
    } else if (Array.isArray(body.images)) {
      $set.images = body.images;
    }
    if (Array.isArray(body.tags)) $set.tags = body.tags;
    if (Array.isArray(body.certifications)) $set.certifications = body.certifications;
    if (Array.isArray(body.alternateSkus)) $set.alternateSkus = body.alternateSkus;
    if (body.discountTiers !== undefined) $set.discountTiers = body.discountTiers;
    if (body.sizes !== undefined) $set.sizes = body.sizes;
    if (body.sellers !== undefined) $set.sellers = body.sellers;
    if (typeof body.category === "string" && mongoose.Types.ObjectId.isValid(body.category)) {
      const cat = await CategoryModel.findById(body.category).lean();
      if (!cat) return err("Category not found", 400);
      $set.category = new mongoose.Types.ObjectId(body.category);
    }
    if (body.pricing && typeof body.pricing === "object") {
      const p = body.pricing as Record<string, unknown>;
      if (typeof p.basicPrice === "number") $set["pricing.basicPrice"] = p.basicPrice;
      if (typeof p.priceWithGst === "number") $set["pricing.priceWithGst"] = p.priceWithGst;
      if (typeof p.currency === "string") $set["pricing.currency"] = p.currency;
      if (p.priceListEffectiveDate !== undefined && p.priceListEffectiveDate !== null) {
        $set["pricing.priceListEffectiveDate"] = new Date(String(p.priceListEffectiveDate));
      }
    }
    if (body.packaging && typeof body.packaging === "object") {
      const pk = body.packaging as Record<string, unknown>;
      const packagingKeys = [
        "innerBoxPacking",
        "pcsInCartoon",
        "pcsPerPacket",
        "packetsInMasterBag",
        "pktInMasterBag",
        "pcsInPacket",
        "pcsPerBox",
        "boxesInMasterCartoon",
        "masterCartoonQty",
        "pricingUnit",
        "notes",
      ] as const;
      for (const k of packagingKeys) {
        if (pk[k] !== undefined) {
          $set[`packaging.${k}`] = pk[k];
        }
      }
    }
    const mongoUpdate: { $set?: Record<string, unknown>; $unset?: Record<string, 1> } = {};
    if (Object.keys($set).length) mongoUpdate.$set = $set;
    if (Object.keys($unset).length) mongoUpdate.$unset = $unset;
    let row;
    if (!mongoUpdate.$set && !mongoUpdate.$unset) {
      row = await ProductModel.findById(id).populate("category", "name slug").lean();
    } else {
      row = await ProductModel.findByIdAndUpdate(id, mongoUpdate, { new: true, runValidators: true })
        .populate("category", "name slug")
        .lean();
    }
    if (!row) return err("Product not found", 404);
    return NextResponse.json({
      data: serializeProductLean(row as Parameters<typeof serializeProductLean>[0]),
    });
  } catch (e) {
    if (e instanceof mongoose.mongo.MongoServerError && e.code === 11000) {
      return err("Duplicate key (e.g. SKU or slug already exists)", 409);
    }
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    const { id } = await ctx.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return err("Invalid product id", 400);
    }
    await connectDb();
    const deleted = await ProductModel.findByIdAndDelete(id).lean();
    if (!deleted) return err("Product not found", 404);
    return NextResponse.json({ data: { _id: id, deleted: true } });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
