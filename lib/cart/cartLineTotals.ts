import { normalizeOrderMode, pricedPacketCount, type CartLineForPricing } from "@/lib/cart/packetLine";

/** GST-inclusive line merchandise (per `pricePerUnit` semantics: per packet, per bag’s packet, or per carton). */
export function cartLineSubtotalInclGst(
  ci: CartLineForPricing & { pricePerUnit: number }
): number {
  if (normalizeOrderMode(ci.orderMode) === "carton") {
    return Math.max(0, Number(ci.quantity) || 0) * (Number(ci.pricePerUnit) || 0);
  }
  return pricedPacketCount(ci) * (Number(ci.pricePerUnit) || 0);
}

/** Basic (ex-GST) line merchandise */
export function cartLineSubtotalBasic(
  ci: CartLineForPricing & { basicPricePerUnit: number }
): number {
  if (normalizeOrderMode(ci.orderMode) === "carton") {
    return Math.max(0, Number(ci.quantity) || 0) * (Number(ci.basicPricePerUnit) || 0);
  }
  return pricedPacketCount(ci) * (Number(ci.basicPricePerUnit) || 0);
}
