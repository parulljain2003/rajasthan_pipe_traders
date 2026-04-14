import type { CartItem } from "@/app/context/CartWishlistContext";
import { normalizeOrderMode } from "@/lib/cart/packetLine";

export function cartGroupKey(item: Pick<CartItem, "productId" | "size" | "sellerId">): string {
  return `${item.productId}\u001f${item.size}\u001f${item.sellerId}`;
}

/** Merge lines that share product + size + seller (different `orderMode`) for a single card UI */
export function groupCartItemsByProductLine(items: CartItem[]): CartItem[][] {
  const map = new Map<string, CartItem[]>();
  for (const ci of items) {
    const k = cartGroupKey(ci);
    const arr = map.get(k) ?? [];
    arr.push(ci);
    map.set(k, arr);
  }
  return Array.from(map.values()).map((lines) =>
    [...lines].sort((a, b) => {
      const rank = (m: ReturnType<typeof normalizeOrderMode>) =>
        m === "master_bag" ? 2 : m === "carton" ? 1 : 0;
      const ao = rank(normalizeOrderMode(a.orderMode));
      const bo = rank(normalizeOrderMode(b.orderMode));
      return ao - bo;
    })
  );
}
