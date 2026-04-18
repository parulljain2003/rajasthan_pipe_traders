import { cache } from "react";
import mongoose from "mongoose";
import { connectDb } from "@/lib/db/connect";
import { CategoryModel } from "@/lib/db/models/Category";
import { ProductModel } from "@/lib/db/models/Product";
import { serializeCategoryLean, serializeProductLean } from "@/lib/db/serialize";
import { apiProductToProduct } from "@/app/lib/api/mapApiProduct";
import type { ApiProduct } from "@/app/lib/api/types";
import type { Product } from "@/app/data/products";

type LeanDoc = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Multi-token AND search across common catalog fields (each token must match at least one field). */
function applyProductTextSearch(filter: Record<string, unknown>, q: string): void {
  const tokens = q
    .trim()
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
  if (tokens.length === 0) return;

  const andClauses = tokens.map((token) => {
    const rx = escapeRegex(token);
    return {
      $or: [
        { name: { $regex: rx, $options: "i" } },
        { sku: { $regex: rx, $options: "i" } },
        { slug: { $regex: rx, $options: "i" } },
        { brand: { $regex: rx, $options: "i" } },
        { brandCode: { $regex: rx, $options: "i" } },
        { description: { $regex: rx, $options: "i" } },
        { longDescription: { $regex: rx, $options: "i" } },
        { subCategory: { $regex: rx, $options: "i" } },
        { sizeOrModel: { $regex: rx, $options: "i" } },
        { productLine: { $regex: rx, $options: "i" } },
        { material: { $regex: rx, $options: "i" } },
        { note: { $regex: rx, $options: "i" } },
        { listNotes: { $regex: rx, $options: "i" } },
        { tags: { $regex: rx, $options: "i" } },
        { alternateSkus: { $regex: rx, $options: "i" } },
        { certifications: { $regex: rx, $options: "i" } },
        { features: { $regex: rx, $options: "i" } },
      ],
    };
  });

  const existing = filter.$and;
  if (Array.isArray(existing)) {
    filter.$and = [...existing, ...andClauses];
  } else {
    filter.$and = andClauses;
  }
}

/**
 * Active product by URL slug: matches stored `slug` (case-insensitive), or derived slug
 * (e.g. catalog SKU-based) consistent with `apiProductToProduct`.
 */
export const getStorefrontProductBySlug = cache(async (slug: string) => {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  await connectDb();

  let row = await ProductModel.findOne({
    isActive: true,
    slug: { $regex: new RegExp(`^${escapeRegex(s)}$`, "i") },
  })
    .populate("category", "name slug")
    .lean();

  if (!row) {
    const rows = await ProductModel.find({ isActive: true })
      .populate("category", "name slug")
      .sort({ sku: 1 })
      .limit(500)
      .lean();
    for (const r of rows) {
      const ser = serializeProductLean(r as LeanDoc);
      if (!ser) continue;
      const p = apiProductToProduct(ser as unknown as ApiProduct);
      if (p.slug.toLowerCase() === s) {
        row = r;
        break;
      }
    }
  }

  if (!row) return null;
  return serializeProductLean(row as LeanDoc)!;
});

/** Other active products in the same category (storefront), excluding one id. */
export async function getStorefrontRelatedProducts(
  categoryMongoId: string | undefined,
  excludeProductMongoId: string,
  limit: number
): Promise<Product[]> {
  if (!categoryMongoId || !mongoose.Types.ObjectId.isValid(categoryMongoId)) return [];
  if (!mongoose.Types.ObjectId.isValid(excludeProductMongoId)) return [];
  await connectDb();
  const catId = new mongoose.Types.ObjectId(categoryMongoId);
  const exId = new mongoose.Types.ObjectId(excludeProductMongoId);
  const rows = await ProductModel.find({
    isActive: true,
    category: catId,
    _id: { $ne: exId },
  })
    .populate("category", "name slug")
    .sort({ sku: 1 })
    .limit(limit)
    .lean();
  return rows
    .map((r) => serializeProductLean(r as LeanDoc))
    .filter(Boolean)
    .map((ser) => apiProductToProduct(ser as unknown as ApiProduct));
}

export async function getStorefrontCategories() {
  await connectDb();
  const rows = await CategoryModel.find({ isActive: true })
    .populate("parent", "name slug")
    .sort({ sortOrder: 1, name: 1 })
    .lean();
  return rows.map((r) => serializeCategoryLean(r as LeanDoc)!);
}

/** Active category by slug (storefront). Cached per request for metadata + page. */
export const getStorefrontCategoryBySlug = cache(async (slug: string) => {
  const s = slug.trim().toLowerCase();
  if (!s) return null;
  await connectDb();
  const row = await CategoryModel.findOne({ slug: s, isActive: true })
    .populate("parent", "name slug")
    .lean();
  return serializeCategoryLean(row as LeanDoc | null);
});

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
  const categorySlug = sp.get("categorySlug")?.trim().toLowerCase();
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
  const q = sp.get("q")?.trim() ?? "";
  if (q.length >= 2) {
    applyProductTextSearch(filter, q);
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
