import mongoose from "mongoose";
import { ProductModel } from "@/lib/db/models/Product";
import { parseSortOrderInput } from "@/lib/db/categorySortOrder";

export { parseSortOrderInput };

export async function findProductSortOrderConflict(
  categoryId: mongoose.Types.ObjectId,
  sortOrder: number,
  excludeProductId?: mongoose.Types.ObjectId | string | null
) {
  const q: Record<string, unknown> = { category: categoryId, sortOrder };
  if (excludeProductId) {
    const ex =
      typeof excludeProductId === "string"
        ? new mongoose.Types.ObjectId(excludeProductId)
        : excludeProductId;
    q._id = { $ne: ex };
  }
  return ProductModel.findOne(q).select("_id name sortOrder").lean();
}

export async function maxSortOrderInCategory(
  categoryId: mongoose.Types.ObjectId
): Promise<number> {
  const doc = await ProductModel.findOne({ category: categoryId })
    .sort({ sortOrder: -1 })
    .select("sortOrder")
    .lean();
  return typeof doc?.sortOrder === "number" ? doc.sortOrder : 0;
}

export function productSortOrderConflictPayload(conflict: {
  _id: mongoose.Types.ObjectId;
  name: string;
  sortOrder: number;
}) {
  return {
    message: "Another product already uses this sort order in this category.",
    code: "SORT_ORDER_CONFLICT" as const,
    conflict: {
      _id: String(conflict._id),
      name: conflict.name,
      sortOrder: conflict.sortOrder,
    },
  };
}
