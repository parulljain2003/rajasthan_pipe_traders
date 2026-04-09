import mongoose from "mongoose";

type LeanDoc = Record<string, unknown> & { _id: mongoose.Types.ObjectId };

function idString(id: unknown): string {
  if (id instanceof mongoose.Types.ObjectId) return id.toHexString();
  return String(id);
}

/** Shape aligned with FRONTEND_API_INTEGRATION.md Category */
export function serializeCategoryLean(doc: LeanDoc | null): Record<string, unknown> | null {
  if (!doc) return null;
  const out: Record<string, unknown> = { ...doc, _id: idString(doc._id) };
  const parent = doc.parent as LeanDoc | null | undefined;
  if (parent && typeof parent === "object" && parent._id) {
    out.parent = {
      _id: idString(parent._id),
      name: parent.name,
      slug: parent.slug,
    };
  } else {
    out.parent = null;
  }
  return out;
}

/** Shape aligned with FRONTEND_API_INTEGRATION.md Product */
export function serializeProductLean(doc: LeanDoc | null): Record<string, unknown> | null {
  if (!doc) return null;
  const out: Record<string, unknown> = { ...doc, _id: idString(doc._id) };
  const cat = doc.category as LeanDoc | null | undefined;
  if (cat && typeof cat === "object" && cat._id) {
    out.category = {
      _id: idString(cat._id),
      name: cat.name,
      slug: cat.slug,
    };
  }
  return out;
}

function mapIdArray(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw.map((x) => {
    if (x && typeof x === "object" && "_id" in x) {
      return idString((x as LeanDoc)._id);
    }
    return idString(x);
  });
}

/** Coupon for admin/public JSON */
export function serializeCouponLean(doc: LeanDoc | null): Record<string, unknown> | null {
  if (!doc) return null;
  const out: Record<string, unknown> = { ...doc, _id: idString(doc._id) };
  const prods = doc.applicableProductIds as unknown;
  const cats = doc.applicableCategoryIds as unknown;
  if (Array.isArray(prods) && prods[0] && typeof prods[0] === "object" && "_id" in (prods[0] as object)) {
    const list = prods as LeanDoc[];
    out.applicableProductIds = list.map((p) => idString(p._id));
    out.applicableProducts = list.map((p) => ({
      _id: idString(p._id),
      sku: p.sku,
      name: p.name,
      slug: p.slug,
    }));
  } else {
    out.applicableProductIds = mapIdArray(prods);
  }
  if (Array.isArray(cats) && cats[0] && typeof cats[0] === "object" && "_id" in (cats[0] as object)) {
    const list = cats as LeanDoc[];
    out.applicableCategoryIds = list.map((c) => idString(c._id));
    out.applicableCategories = list.map((c) => ({
      _id: idString(c._id),
      name: c.name,
      slug: c.slug,
    }));
  } else {
    out.applicableCategoryIds = mapIdArray(cats);
  }
  return out;
}
