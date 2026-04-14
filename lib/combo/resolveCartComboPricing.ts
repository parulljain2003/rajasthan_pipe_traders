import type { CartOrderMode } from "@/lib/cart/packetLine";
import { normalizeOrderMode, pricedPacketCount } from "@/lib/cart/packetLine";
import { classifyCartOuterLine } from "@/lib/combo/classifyCartOuterLine";
import type {
  ComboPricingResult,
  ComboPricingResultLine,
  ComputeComboPricingOptions,
} from "@/lib/combo/comboPricingTypes";
import type { LeanProductForPackaging } from "@/lib/coupons/couponTierQuantity";

const DEFAULT_SELLER = "default";

export type IncomingCartLineForCombo = {
  mongoProductId?: string;
  productId?: number;
  productSlug?: string;
  size: string;
  sellerId?: string;
  orderMode?: CartOrderMode;
  quantity: number;
  qtyPerBag: number;
  pcsPerPacket: number;
  packetsPerCarton?: number;
  pricePerUnit: number;
  basicPricePerUnit: number;
};

export type LeanCatalogSize = {
  size: string;
  basicPrice: number;
  priceWithGst: number;
  qtyPerBag?: number;
  pcsPerPacket?: number;
};

export type LeanPackaging = {
  packetsInMasterBag?: number;
  pktInMasterBag?: number;
  pricingUnit?: string;
  pcsInCartoon?: number;
  pcsPerPacket?: number;
};

export type LeanProductForCombo = LeanProductForPackaging & {
  _id: { toString: () => string };
  slug?: string;
  legacyId?: number;
  category?: unknown;
  packaging?: LeanPackaging;
  sizes?: LeanCatalogSize[];
  sellers?: Array<{
    sellerId: string;
    sizes?: LeanCatalogSize[];
  }>;
  pricing?: { basicPrice: number; priceWithGst: number };
  sizeOrModel?: string;
};

export type ComboRuleLean = {
  _id: string;
  name: string;
  priority: number;
  beneficiaryProductId: string;
  beneficiaryDiscountType: "percentage" | "flat";
  /** Percentage: 0–100. Flat: ₹ off per list unit (GST-inclusive). */
  beneficiaryDiscountValue: number;
  requirements: Array<{
    productId: string;
    thresholdKind: "bag" | "carton";
    minOuterUnits: number;
  }>;
};

function normalizeSellerId(sellerId: string | undefined): string {
  return sellerId && sellerId.length > 0 ? sellerId : DEFAULT_SELLER;
}

function lineKey(
  mongoId: string | undefined,
  legacyId: number | undefined,
  size: string,
  sellerId: string,
  mode: CartOrderMode
): string {
  const id = mongoId ?? `legacy:${legacyId ?? 0}`;
  return `${id}|${size}|${normalizeSellerId(sellerId)}|${mode}`;
}

function resolveSizesForSeller(product: LeanProductForCombo, sellerId: string): LeanCatalogSize[] {
  const sid = normalizeSellerId(sellerId);
  if (product.sellers && product.sellers.length > 0) {
    const offer = product.sellers.find((s) => s.sellerId === sid) ?? product.sellers[0];
    return (offer.sizes ?? []) as LeanCatalogSize[];
  }
  return (product.sizes ?? []) as LeanCatalogSize[];
}

function findSizeRow(sizes: LeanCatalogSize[], sizeLabel: string): LeanCatalogSize | null {
  const exact = sizes.find((s) => s.size === sizeLabel);
  if (exact) return exact;
  const t = sizeLabel.trim().toLowerCase();
  return sizes.find((s) => s.size.trim().toLowerCase() === t) ?? null;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

/** Line list subtotal (GST incl) — carton lines use per-carton client prices; others use packet-expanded units. */
function lineListSubtotalInclGst(line: IncomingCartLineForCombo, listGstRow: number): number {
  if (normalizeOrderMode(line.orderMode) === "carton") {
    const q = Math.max(0, Number(line.quantity) || 0);
    const unit = Number(line.pricePerUnit) > 0 ? Number(line.pricePerUnit) : listGstRow;
    return q * unit;
  }
  const pk = Math.max(
    0,
    pricedPacketCount({
      orderMode: line.orderMode,
      quantity: line.quantity,
      qtyPerBag: line.qtyPerBag,
      pcsPerPacket: line.pcsPerPacket,
      packetsPerCarton: line.packetsPerCarton,
    })
  );
  return pk * listGstRow;
}

function lineListSubtotalBasic(line: IncomingCartLineForCombo, listBasicRow: number): number {
  if (normalizeOrderMode(line.orderMode) === "carton") {
    const q = Math.max(0, Number(line.quantity) || 0);
    const unit = Number(line.basicPricePerUnit) > 0 ? Number(line.basicPricePerUnit) : listBasicRow;
    return q * unit;
  }
  const pk = Math.max(
    0,
    pricedPacketCount({
      orderMode: line.orderMode,
      quantity: line.quantity,
      qtyPerBag: line.qtyPerBag,
      pcsPerPacket: line.pcsPerPacket,
      packetsPerCarton: line.packetsPerCarton,
    })
  );
  return pk * listBasicRow;
}

/** Units for combo pricing (same unit as combo list price from admin). */
function comboPricedUnits(line: IncomingCartLineForCombo): number {
  if (normalizeOrderMode(line.orderMode) === "carton") {
    return Math.max(0, Number(line.quantity) || 0);
  }
  return Math.max(
    0,
    pricedPacketCount({
      orderMode: line.orderMode,
      quantity: line.quantity,
      qtyPerBag: line.qtyPerBag,
      pcsPerPacket: line.pcsPerPacket,
      packetsPerCarton: line.packetsPerCarton,
    })
  );
}

type AggKey = string;

function aggKey(productId: string, size: string): AggKey {
  return `${productId}|${size.trim()}`;
}

function addOuterCount(
  map: Map<AggKey, { bags: number; cartons: number }>,
  productId: string,
  size: string,
  cls: ReturnType<typeof classifyCartOuterLine>,
  quantity: number
): void {
  if (cls !== "bag_outer" && cls !== "carton_outer") return;
  const k = aggKey(productId, size);
  const o = map.get(k) ?? { bags: 0, cartons: 0 };
  if (cls === "bag_outer") o.bags += Math.max(0, quantity);
  else o.cartons += Math.max(0, quantity);
  map.set(k, o);
}

/** Sum outer units for a product across all catalog sizes (requirement has no size filter). */
function outerCountForRequirement(
  map: Map<AggKey, { bags: number; cartons: number }>,
  productId: string,
  kind: "bag" | "carton"
): number {
  const field = kind === "bag" ? "bags" : "cartons";
  const prefix = `${productId}|`;
  let total = 0;
  for (const [key, v] of map) {
    if (key.startsWith(prefix)) total += v[field];
  }
  return total;
}

function comboMatches(rule: ComboRuleLean, outerMap: Map<AggKey, { bags: number; cartons: number }>): boolean {
  for (const r of rule.requirements) {
    const pid = r.productId;
    const need = r.minOuterUnits;
    const got = outerCountForRequirement(outerMap, pid, r.thresholdKind);
    if (got < need) return false;
  }
  return true;
}

function beneficiaryMatchesLine(rule: ComboRuleLean, mongoProductId: string | undefined): boolean {
  if (!mongoProductId) return false;
  return rule.beneficiaryProductId === mongoProductId;
}

/** List unit prices after beneficiary discount (percentage or flat ₹ off GST-inclusive unit). */
function discountedUnitPrices(
  listBasic: number,
  listGst: number,
  rule: ComboRuleLean
): { cb: number; cg: number } {
  const t = rule.beneficiaryDiscountType;
  const v = Math.max(0, rule.beneficiaryDiscountValue);
  if (t === "percentage") {
    const p = Math.min(100, v);
    return {
      cb: roundMoney(listBasic * (1 - p / 100)),
      cg: roundMoney(listGst * (1 - p / 100)),
    };
  }
  const cg = Math.max(0, listGst - v);
  const cb =
    listGst > 0 ? roundMoney(listBasic * (cg / listGst)) : Math.max(0, listBasic - v);
  return { cb, cg };
}

/**
 * Resolves admin-defined combo pricing. Aggregates bag/carton counts per product+size (ignores seller).
 */
export function resolveCartComboPricing(
  lines: IncomingCartLineForCombo[],
  productByMongoId: Map<string, LeanProductForCombo>,
  combos: ComboRuleLean[],
  options: ComputeComboPricingOptions = {}
): ComboPricingResult {
  const { skipComboAllocation = false } = options;

  const outerMap = new Map<AggKey, { bags: number; cartons: number }>();

  for (const line of lines) {
    const pid = line.mongoProductId?.trim();
    if (!pid) continue;
    const product = productByMongoId.get(pid);
    const cls = classifyCartOuterLine({
      orderMode: line.orderMode,
      product: product ?? undefined,
      sellerId: line.sellerId,
      size: line.size,
    });
    const q = Math.max(0, Number(line.quantity) || 0);
    addOuterCount(outerMap, pid, line.size, cls, q);
  }

  const sortedCombos = [...combos].sort((a, b) => a.priority - b.priority);
  let matched: ComboRuleLean | null = null;
  if (!skipComboAllocation) {
    for (const c of sortedCombos) {
      if (comboMatches(c, outerMap)) {
        matched = c;
        break;
      }
    }
  }

  const outLines: ComboPricingResultLine[] = [];
  let cartTotalInclGst = 0;
  let cartBasicTotal = 0;
  let comboSavingsInclGst = 0;
  let comboMatchedUnits = 0;

  for (const line of lines) {
    const mode = normalizeOrderMode(line.orderMode);
    const key = lineKey(line.mongoProductId, line.productId, line.size, line.sellerId ?? "", mode);
    const product = line.mongoProductId ? productByMongoId.get(line.mongoProductId) : undefined;
    const sizes = product ? resolveSizesForSeller(product, line.sellerId ?? "") : [];
    const row = findSizeRow(sizes, line.size);
    const listBasic = row?.basicPrice ?? product?.pricing?.basicPrice ?? line.basicPricePerUnit;
    const listGst = row?.priceWithGst ?? product?.pricing?.priceWithGst ?? line.pricePerUnit;

    const pk = Math.max(
      0,
      pricedPacketCount({
        orderMode: line.orderMode,
        quantity: line.quantity,
        qtyPerBag: line.qtyPerBag,
        pcsPerPacket: line.pcsPerPacket,
        packetsPerCarton: line.packetsPerCarton,
      })
    );

    if (pk === 0 && normalizeOrderMode(line.orderMode) !== "carton") {
      outLines.push({
        key,
        pricedPacketCount: 0,
        basicPricePerUnit: listBasic,
        pricePerUnit: listGst,
        comboPricedPackets: 0,
        isComboApplied: false,
        comboSubtotalInclGst: 0,
      });
      continue;
    }
    if (normalizeOrderMode(line.orderMode) === "carton" && Math.max(0, Number(line.quantity) || 0) === 0) {
      outLines.push({
        key,
        pricedPacketCount: 0,
        basicPricePerUnit: listBasic,
        pricePerUnit: listGst,
        comboPricedPackets: 0,
        isComboApplied: false,
        comboSubtotalInclGst: 0,
      });
      continue;
    }

    const applyCombo =
      matched != null && line.mongoProductId && beneficiaryMatchesLine(matched, line.mongoProductId);

    const cu = comboPricedUnits(line);

    if (applyCombo && matched) {
      const { cb, cg } = discountedUnitPrices(listBasic, listGst, matched);
      const lineIncl = cu * cg;
      const lineBasicTot = cu * cb;
      const listInclBefore = lineListSubtotalInclGst(line, listGst);
      cartTotalInclGst += lineIncl;
      cartBasicTotal += lineBasicTot;
      comboSavingsInclGst += Math.max(0, listInclBefore - lineIncl);
      comboMatchedUnits += cu;
      const comboSubtotalInclGst = roundMoney(lineIncl);
      const displayPk = normalizeOrderMode(line.orderMode) === "carton" ? pk || cu : pk;
      outLines.push({
        key,
        pricedPacketCount: displayPk > 0 ? displayPk : cu,
        basicPricePerUnit: roundMoney(cb),
        pricePerUnit: roundMoney(cg),
        comboPricedPackets: displayPk > 0 ? displayPk : cu,
        isComboApplied: true,
        comboSubtotalInclGst,
      });
      continue;
    }

    const lineIncl = lineListSubtotalInclGst(line, listGst);
    const lineBas = lineListSubtotalBasic(line, listBasic);
    cartTotalInclGst += lineIncl;
    cartBasicTotal += lineBas;
    outLines.push({
      key,
      pricedPacketCount: pk > 0 ? pk : cu,
      basicPricePerUnit: listBasic,
      pricePerUnit: listGst,
      comboPricedPackets: 0,
      isComboApplied: false,
      comboSubtotalInclGst: 0,
    });
  }

  let smartSuggestion: string | null = null;
  if (!skipComboAllocation && sortedCombos.length > 0 && !matched) {
    const first = sortedCombos[0];
    const miss = first.requirements.find((r) => {
      const got = outerCountForRequirement(outerMap, r.productId, r.thresholdKind);
      return got < r.minOuterUnits;
    });
    if (miss) {
      const need = miss.minOuterUnits;
      const got = outerCountForRequirement(outerMap, miss.productId, miss.thresholdKind);
      const kind = miss.thresholdKind === "bag" ? "bag(s)" : "carton(s)";
      smartSuggestion = `Add ${need - got} more ${kind} to unlock combo “${first.name}”.`;
    }
  }

  return {
    lines: outLines,
    eligiblePacketTotal: 0,
    corePacketTotal: 0,
    comboMatchedCorePackets: comboMatchedUnits,
    cartTotalInclGst: roundMoney(cartTotalInclGst),
    cartBasicTotal: roundMoney(cartBasicTotal),
    comboSavingsInclGst: roundMoney(Math.max(0, comboSavingsInclGst)),
    smartSuggestion,
  };
}
