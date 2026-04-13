/**
 * Coupon tier thresholds are stored as `minPackets`. This module converts cart lines to a
 * consistent packet count using MongoDB `packaging` + `pricingUnit` and list price math.
 */

export type PackagingFields = {
  pricingUnit?: string;
  pcsPerPacket?: number;
  pcsInCartoon?: number;
  pcsPerBox?: number;
  packetsInMasterBag?: number;
  pktInMasterBag?: number;
};

export type SizeRowFields = {
  qtyPerBag?: number;
  pcsPerPacket?: number;
};

export type ProductPackagingForCoupon = {
  pricingUnit: string;
  packaging: PackagingFields;
  sizeRow?: SizeRowFields;
};

function num(n: unknown): number | undefined {
  if (typeof n === "number" && Number.isFinite(n)) return n;
  if (typeof n === "string" && n.trim() !== "" && Number.isFinite(Number(n))) return Number(n);
  return undefined;
}

function findSizeRow<T extends { size: string }>(
  rows: T[] | undefined,
  size: string | undefined
): T | undefined {
  if (!rows?.length) return undefined;
  const t = (size ?? "").trim();
  if (!t) return rows[0];
  const exact = rows.find((s) => s.size === t);
  if (exact) return exact;
  const tl = t.toLowerCase();
  return rows.find((s) => s.size.trim().toLowerCase() === tl) ?? rows[0];
}

type LeanProductForPackaging = {
  packaging?: PackagingFields;
  sellers?: Array<{ sellerId: string; sizes?: Array<Record<string, unknown>> }>;
  sizes?: Array<Record<string, unknown>>;
};

/**
 * Reads packaging + the active size row (qtyPerBag, pcsPerPacket) from a product document.
 */
export function buildPackagingContextFromProduct(
  prod: LeanProductForPackaging,
  sellerId: string | undefined,
  size: string | undefined
): ProductPackagingForCoupon {
  const pack = prod.packaging ?? {};
  const sid = (sellerId ?? "").trim();
  let row: Record<string, unknown> | undefined;

  if (prod.sellers && prod.sellers.length > 0) {
    const offer =
      (sid ? prod.sellers.find((s) => s.sellerId === sid) : undefined) ?? prod.sellers[0];
    if (offer?.sizes && offer.sizes.length > 0) {
      row = findSizeRow(
        offer.sizes as Array<{ size: string } & Record<string, unknown>>,
        size
      ) as Record<string, unknown> | undefined;
    }
  }
  if (!row && prod.sizes && prod.sizes.length > 0) {
    row = findSizeRow(
      prod.sizes as Array<{ size: string } & Record<string, unknown>>,
      size
    ) as Record<string, unknown> | undefined;
  }

  const pricingUnit = typeof pack.pricingUnit === "string" && pack.pricingUnit ? pack.pricingUnit : "per_packet";

  return {
    pricingUnit,
    packaging: {
      pcsPerPacket: num(pack.pcsPerPacket),
      pcsInCartoon: num(pack.pcsInCartoon),
      pcsPerBox: num(pack.pcsPerBox),
      packetsInMasterBag: num(pack.packetsInMasterBag),
      pktInMasterBag: num(pack.pktInMasterBag),
    },
    sizeRow: row
      ? {
          qtyPerBag: num(row.qtyPerBag),
          pcsPerPacket: num(row.pcsPerPacket),
        }
      : undefined,
  };
}

function pcsToPackets(pcs: number | undefined, pcsPerPacket: number | undefined): number {
  if (!pcs || pcs <= 0 || !pcsPerPacket || pcsPerPacket <= 0) return 0;
  return Math.max(1, Math.ceil(pcs / pcsPerPacket));
}

/**
 * Converts purchased “pricing units” (packets, cartons, boxes, bags, …) into packet count for tier math.
 */
export function computeCouponTierPacketCount(args: {
  lineSubtotalInclGst: number;
  unitPriceWithGst: number;
  product: ProductPackagingForCoupon | null;
  /** Cart / client: priced packet equivalent (packets, or bags × qtyPerBag) */
  clientPacketQuantity: number;
}): number {
  const { lineSubtotalInclGst, unitPriceWithGst, product, clientPacketQuantity } = args;
  const fallback = Math.max(0, Math.floor(clientPacketQuantity + 1e-9));
  if (lineSubtotalInclGst <= 0 || unitPriceWithGst <= 0) return fallback;

  const pack = product?.packaging ?? {};
  const sr = product?.sizeRow ?? {};
  const ppp = num(sr.pcsPerPacket) ?? num(pack.pcsPerPacket) ?? 0;

  const pu = (product?.pricingUnit ?? "per_packet") as string;
  const unitsPurchased = lineSubtotalInclGst / unitPriceWithGst;

  if (pu === "per_packet" || pu === "per_piece") {
    return Math.max(0, Math.floor(unitsPurchased + 1e-9));
  }

  if (pu === "per_cartoon") {
    const pktPerCarton = pcsToPackets(num(pack.pcsInCartoon), ppp);
    if (pktPerCarton <= 0) return fallback;
    const cartons = Math.max(0, Math.floor(unitsPurchased + 1e-9));
    return cartons * pktPerCarton;
  }

  if (pu === "per_box") {
    const pktPerBox = pcsToPackets(num(pack.pcsPerBox), ppp);
    if (pktPerBox <= 0) return fallback;
    const boxes = Math.max(0, Math.floor(unitsPurchased + 1e-9));
    return boxes * pktPerBox;
  }

  if (pu === "per_bag" || pu === "per_master_bag") {
    const pkt =
      num(sr.qtyPerBag) ?? num(pack.packetsInMasterBag) ?? num(pack.pktInMasterBag) ?? 0;
    if (pkt <= 0) return fallback;
    const outers = Math.max(0, Math.floor(unitsPurchased + 1e-9));
    return outers * pkt;
  }

  if (pu === "per_dozen") {
    const dozens = Math.max(0, Math.floor(unitsPurchased + 1e-9));
    if (ppp > 0) {
      return Math.max(0, Math.floor((dozens * 12) / ppp + 1e-9));
    }
    return Math.max(0, dozens * 12);
  }

  return fallback;
}
