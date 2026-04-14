export type CartOrderMode = "packets" | "master_bag" | "carton";

/** Minimal fields for per-packet pricing (matches `CartItem`). */
export interface CartLineForPricing {
  orderMode?: CartOrderMode;
  quantity: number;
  qtyPerBag: number;
  pcsPerPacket: number;
  /**
   * When `orderMode` is `carton`, packets per outer carton (for packet-equivalent totals).
   * Derived from packaging (e.g. ceil(pcsInCartoon / pcsPerPacket)).
   */
  packetsPerCarton?: number;
}

export function normalizeOrderMode(mode: CartLineForPricing["orderMode"]): CartOrderMode {
  if (mode === "master_bag") return "master_bag";
  if (mode === "carton") return "carton";
  return "packets";
}

/** Packets priced at `pricePerUnit` (per packet). For master-bag lines, `quantity` is bag count. */
export function pricedPacketCount(item: CartLineForPricing): number {
  const mode = normalizeOrderMode(item.orderMode);
  if (mode === "master_bag") {
    const bags = Number(item.quantity) || 0;
    const pktsPerBag = Number(item.qtyPerBag) || 0;
    return bags * pktsPerBag;
  }
  if (mode === "carton") {
    const cartons = Math.max(0, Number(item.quantity) || 0);
    const ppc = Math.max(0, Number(item.packetsPerCarton) || 0);
    return cartons * ppc;
  }
  return Number(item.quantity) || 0;
}

export function totalPiecesForLine(item: CartLineForPricing): number {
  const pkts = pricedPacketCount(item);
  const ppp = Number(item.pcsPerPacket) || 0;
  return pkts * ppp;
}
