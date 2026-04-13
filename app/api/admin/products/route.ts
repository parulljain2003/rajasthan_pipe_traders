import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { ProductModel } from "@/lib/db/models/Product";
import { CategoryModel } from "@/lib/db/models/Category";
import { serializeProductLean } from "@/lib/db/serialize";

function err(message: string, status: number) {
  return NextResponse.json({ message }, { status });
}

export async function GET(req: NextRequest) {
  try {
    await connectDb();
    const sp = req.nextUrl.searchParams;
    const filter: Record<string, unknown> = {};
    const categorySlug = sp.get("categorySlug");
    if (categorySlug) {
      const cat = await CategoryModel.findOne({ slug: categorySlug }).select("_id").lean();
      if (!cat) return err("No category matches categorySlug", 404);
      filter.category = cat._id;
    }
    const productKind = sp.get("productKind");
    if (productKind === "sku" || productKind === "catalog") {
      filter.productKind = productKind;
    }
    const isActiveParam = sp.get("isActive");
    if (isActiveParam === "true") filter.isActive = true;
    else if (isActiveParam === "false") filter.isActive = false;
    const limit = Math.min(500, Math.max(1, Number(sp.get("limit")) || 100));
    const skip = Math.max(0, Number(sp.get("skip")) || 0);
    const [rows, total] = await Promise.all([
      ProductModel.find(filter)
        .populate("category", "name slug")
        .sort({ sku: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      ProductModel.countDocuments(filter),
    ]);
    const data = rows.map((r) => serializeProductLean(r as Parameters<typeof serializeProductLean>[0])!);
    return NextResponse.json({
      data,
      meta: { total, limit, skip },
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    await connectDb();
    const body = (await req.json()) as Record<string, unknown>;
    const sku = typeof body.sku === "string" ? body.sku.trim().toUpperCase() : "";
    const name = typeof body.name === "string" ? body.name.trim() : "";
    const categoryId = typeof body.category === "string" ? body.category : "";
    if (!sku || !name || !mongoose.Types.ObjectId.isValid(categoryId)) {
      return err("sku, name, and valid category (ObjectId) are required", 400);
    }
    const cat = await CategoryModel.findById(categoryId).lean();
    if (!cat) return err("Category not found", 400);
    const pricing = body.pricing as Record<string, unknown> | undefined;
    if (
      !pricing ||
      typeof pricing.basicPrice !== "number" ||
      typeof pricing.priceWithGst !== "number"
    ) {
      return err("pricing.basicPrice and pricing.priceWithGst (numbers) are required", 400);
    }
    const productKind = body.productKind === "catalog" ? "catalog" : "sku";
    const slug =
      typeof body.slug === "string" && body.slug.trim()
        ? body.slug.trim().toLowerCase()
        : undefined;
    const doc = await ProductModel.create({
      sku,
      name,
      productKind,
      slug,
      category: new mongoose.Types.ObjectId(categoryId),
      description: typeof body.description === "string" ? body.description : undefined,
      longDescription: typeof body.longDescription === "string" ? body.longDescription : undefined,
      subCategory: typeof body.subCategory === "string" ? body.subCategory : undefined,
      brand: typeof body.brand === "string" ? body.brand : undefined,
      brandCode: typeof body.brandCode === "string" ? body.brandCode : undefined,
      productLine: typeof body.productLine === "string" ? body.productLine : undefined,
      sizeOrModel: typeof body.sizeOrModel === "string" ? body.sizeOrModel : undefined,
      features: Array.isArray(body.features) ? body.features : undefined,
      image: typeof body.image === "string" ? body.image : undefined,
      images: Array.isArray(body.images) ? body.images : undefined,
      isNew: typeof body.isNew === "boolean" ? body.isNew : false,
      isBestseller: typeof body.isBestseller === "boolean" ? body.isBestseller : undefined,
      tags: Array.isArray(body.tags) ? body.tags : undefined,
      certifications: Array.isArray(body.certifications) ? body.certifications : undefined,
      material: typeof body.material === "string" ? body.material : undefined,
      minOrder: typeof body.minOrder === "string" ? body.minOrder : undefined,
      moq: typeof body.moq === "number" ? body.moq : undefined,
      note: typeof body.note === "string" ? body.note : undefined,
      listNotes: typeof body.listNotes === "string" ? body.listNotes : undefined,
      alternateSkus: Array.isArray(body.alternateSkus) ? body.alternateSkus : undefined,
      discountTiers: body.discountTiers,
      sizes: body.sizes,
      sellers: body.sellers,
      pricing: {
        basicPrice: pricing.basicPrice,
        priceWithGst: pricing.priceWithGst,
        currency: typeof pricing.currency === "string" ? pricing.currency : "INR",
        priceListEffectiveDate: pricing.priceListEffectiveDate
          ? new Date(String(pricing.priceListEffectiveDate))
          : undefined,
      },
      packaging: typeof body.packaging === "object" && body.packaging !== null ? body.packaging : {},
      isActive: typeof body.isActive === "boolean" ? body.isActive : true,
      isEligibleForCombo: typeof body.isEligibleForCombo === "boolean" ? body.isEligibleForCombo : false,
      sourceDocument:
        typeof body.sourceDocument === "string" ? body.sourceDocument : "RPT PRICE LIST",
      legacyId: typeof body.legacyId === "number" ? body.legacyId : undefined,
    });
    const populated = await ProductModel.findById(doc._id).populate("category", "name slug").lean();
    return NextResponse.json({
      data: serializeProductLean(populated as Parameters<typeof serializeProductLean>[0]),
    });
  } catch (e) {
    if (e instanceof mongoose.mongo.MongoServerError && e.code === 11000) {
      return err("Duplicate key (e.g. SKU or slug already exists)", 409);
    }
    const message = e instanceof Error ? e.message : "Server error";
    return err(message, 500);
  }
}
