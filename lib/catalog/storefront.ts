import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { CategoryModel } from "@/lib/db/models/Category";
import { ProductModel } from "@/lib/db/models/Product";
import { serializeCategoryLean, serializeProductLean } from "@/lib/db/serialize";

type LeanDoc = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

export async function getStorefrontCategories() {
  await connectDb();
  const rows = await CategoryModel.find({ isActive: true })
    .populate("parent", "name slug")
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  return rows.map((r) => serializeCategoryLean(r as LeanDoc)!);
}

export type StorefrontProductsResult =
  | {
      ok: true;
      data: NonNullable<ReturnType<typeof serializeProductLean>>[];
      meta: { total: number; limit: number; skip: number };
    }
  | { ok: false; status: number; message: string };

/** Storefront listing: active products only; same query semantics as GET /api/products. */
export async function getStorefrontProductsFromSearchParams(
  sp: URLSearchParams
): Promise<StorefrontProductsResult> {
  await connectDb();
  const filter: Record<string, unknown> = { isActive: true };
  const categorySlug = sp.get("categorySlug");
  if (categorySlug) {
    const cat = await CategoryModel.findOne({ slug: categorySlug }).select("_id").lean();
    if (!cat) {
      return { ok: false, status: 404, message: "No category matches categorySlug" };
    }
    filter.category = cat._id;
  }
  const productKind = sp.get("productKind");
  if (productKind === "sku" || productKind === "catalog") {
    filter.productKind = productKind;
  }
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
  const data = rows.map((r) => serializeProductLean(r as LeanDoc)!);
  return { ok: true, data, meta: { total, limit, skip } };
}
