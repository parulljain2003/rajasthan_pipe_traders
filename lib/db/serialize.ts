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
