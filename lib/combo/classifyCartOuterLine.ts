import { normalizeOrderMode, type CartOrderMode } from "@/lib/cart/packetLine";
import {
  buildPackagingContextFromProduct,
  linePricingFamilyFromPackaging,
  type LeanProductForPackaging,
} from "@/lib/coupons/couponTierQuantity";

export type CartOuterClass =
  | "packet_style"
  | "bag_outer"
  | "carton_outer"
  | "box_outer"
  | "other";

/**
 * Classifies a cart line for combo thresholds: only `bag_outer` / `carton_outer` may count toward
 * min bags / min cartons; packets and box-priced outers are excluded.
 */
export function classifyCartOuterLine(args: {
  orderMode?: CartOrderMode;
  product: LeanProductForPackaging | null | undefined;
  sellerId?: string;
  size?: string;
}): CartOuterClass {
  const mode = normalizeOrderMode(args.orderMode);
  const ctx = buildPackagingContextFromProduct(args.product ?? {}, args.sellerId, args.size);
  const pu = String(ctx.pricingUnit ?? "per_packet").trim().toLowerCase();

  if (pu === "per_box") {
    return "box_outer";
  }

  if (mode === "carton") {
    if (pu === "per_cartoon" || pu === "per_carton") return "carton_outer";
    return "other";
  }

  if (mode === "master_bag") {
    if (pu === "per_box") return "box_outer";
    const fam = linePricingFamilyFromPackaging(ctx, "master_bag");
    if (fam === "outerish") return "bag_outer";
    return "other";
  }

  /* packets mode */
  if (pu === "per_packet" || pu === "per_piece" || pu === "per_dozen") {
    return "packet_style";
  }
  if (pu === "per_cartoon" || pu === "per_carton") {
    /* User bought inner units while product is priced per carton — treat as packet-style for thresholds */
    return "packet_style";
  }
  if (pu === "per_box") return "box_outer";
  if (pu === "per_bag" || pu === "per_master_bag") return "packet_style";

  return "other";
}
