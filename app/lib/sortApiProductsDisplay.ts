import type { Product } from "@/app/data/products";
import type { ApiProduct } from "@/app/lib/api/types";

type ApiProductWithSort = ApiProduct & { sortOrder?: number };

const ranked = (n: unknown) => typeof n === "number" && n > 0;

/**
 * Admin sort order is 1-based: `0` (or missing) means “no position”.
 * Ranked items (`sortOrder` &gt; 0) sort first by that number; ties use name.
 * Unranked items stay **in original list order** (no reordering / “swapping” among zeros).
 */
export function sortApiProductsForDisplayOrder(products: ApiProduct[]): ApiProduct[] {
  return products
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ar = (a.item as ApiProductWithSort).sortOrder;
      const br = (b.item as ApiProductWithSort).sortOrder;
      const ae = ranked(ar) ? ar! : Number.POSITIVE_INFINITY;
      const be = ranked(br) ? br! : Number.POSITIVE_INFINITY;
      if (ae !== be) return ae - be;
      if (ae === Number.POSITIVE_INFINITY) {
        return a.index - b.index;
      }
      return a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
    })
    .map(({ item }) => item);
}

/** Same rules as {@link sortApiProductsForDisplayOrder} for mapped `Product` rows. */
export function sortProductsForDisplayOrder(products: Product[]): Product[] {
  return products
    .map((item, index) => ({ item, index }))
    .sort((a, b) => {
      const ar = a.item.sortOrder;
      const br = b.item.sortOrder;
      const ae = ranked(ar) ? ar! : Number.POSITIVE_INFINITY;
      const be = ranked(br) ? br! : Number.POSITIVE_INFINITY;
      if (ae !== be) return ae - be;
      if (ae === Number.POSITIVE_INFINITY) {
        return a.index - b.index;
      }
      return a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
    })
    .map(({ item }) => item);
}
