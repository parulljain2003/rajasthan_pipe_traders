import type { CartOrderMode } from "@/lib/cart/packetLine";
import { normalizeOrderMode, pricedPacketCount } from "@/lib/cart/packetLine";
import type { ComboPricingResult, ComboPricingResultLine } from "@/lib/combo/computeComboPricing";
import type { ComputeComboPricingOptions } from "@/lib/combo/computeComboPricing";
import { normalizeRptSizeKey, RPT_FALLBACK_DNC_20MM_COMBO_BASIC, RPT_FALLBACK_DNC_20MM_COMBO_WITH_GST } from "@/lib/b2b/combo-logic";

const DEFAULT_SELLER = "default";

const COMBO_UNIT_INCL_GST = RPT_FALLBACK_DNC_20MM_COMBO_WITH_GST;
const COMBO_UNIT_BASIC = RPT_FALLBACK_DNC_20MM_COMBO_BASIC;

export type IncomingCartLineForCombo = {
  mongoProductId?: string;
  productId?: number;
  /** Client catalog slug (matches PDP / cart) — used when Mongo `product.slug` is missing or mismatched */
  productSlug?: string;
  size: string;
  sellerId?: string;
  orderMode?: CartOrderMode;
  quantity: number;
  qtyPerBag: number;
  pcsPerPacket: number;
  pricePerUnit: number;
  basicPricePerUnit: number;
};

export type LeanCatalogSize = {
  size: string;
  basicPrice: number;
  priceWithGst: number;
  comboBasicPrice?: number;
  comboPriceWithGst?: number;
  coreComboVariant?: "20" | "25";
  countsTowardComboEligible?: boolean;
  qtyPerBag?: number;
  pcsPerPacket?: number;
};

export type LeanPackaging = {
  packetsInMasterBag?: number;
  pktInMasterBag?: number;
};

export type LeanProductForCombo = {
  _id: { toString: () => string };
  slug?: string;
  legacyId?: number;
  isEligibleForCombo?: boolean;
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
    return offer.sizes ?? [];
  }
  return product.sizes ?? [];
}

function findSizeRow(sizes: LeanCatalogSize[], sizeLabel: string): LeanCatalogSize | null {
  const exact = sizes.find((s) => s.size === sizeLabel);
  if (exact) return exact;
  const n = normalizeRptSizeKey(sizeLabel);
  if (!n) return null;
  return sizes.find((s) => normalizeRptSizeKey(s.size) === n) ?? null;
}

/**
 * Packets per master bag from DB (size row → packaging → client).
 * This is `packetsPerBag` in (bags × packetsPerBag) + packets.
 */
export function resolveDbPacketsPerBag(
  product: LeanProductForCombo,
  row: LeanCatalogSize | null,
  clientQtyPerBag: number
): number {
  const fromRow = row?.qtyPerBag;
  if (typeof fromRow === "number" && fromRow > 0) return fromRow;
  const pack = product.packaging;
  if (pack) {
    const a = pack.packetsInMasterBag;
    const b = pack.pktInMasterBag;
    if (typeof a === "number" && a > 0) return a;
    if (typeof b === "number" && b > 0) return b;
  }
  const c = Number(clientQtyPerBag);
  return c > 0 ? c : 0;
}

/**
 * Absolute quantity for combo: `(bags × packetsPerBag) + loosePackets` on this line.
 * `master_bag` → quantity is bag count; `packets` → quantity is loose packet count.
 */
export function totalPacketsForLine(line: IncomingCartLineForCombo, packetsPerBag: number): number {
  const mode = normalizeOrderMode(line.orderMode);
  const q = Math.max(0, Number(line.quantity) || 0);
  const pb = Math.max(0, packetsPerBag);
  if (mode === "master_bag") return q * pb;
  return q;
}

/** @deprecated Use {@link totalPacketsForLine} — same formula. */
export function pricedPacketsForComboPool(line: IncomingCartLineForCombo, packetsPerBagFromDb: number): number {
  return totalPacketsForLine(line, packetsPerBagFromDb);
}

/** Test / list alignment: Patti lines use exactly `(bags × 750) + loosePackets`. */
const PATTI_PACKETS_PER_BAG = 750;

function isPattiSlug(s: string | null): boolean {
  if (!s) return false;
  return s.toLowerCase().includes("cable-nail");
}

function isCoreSlug(s: string | null): boolean {
  if (!s) return false;
  return s.toLowerCase().includes("nail-clamp");
}

function resolveSlugForLine(
  line: IncomingCartLineForCombo,
  product: LeanProductForCombo | undefined
): string | null {
  const fromClient = typeof line.productSlug === "string" ? line.productSlug.trim() : "";
  const fromDb = product?.slug?.trim() ?? "";
  const merged = (fromClient || fromDb).toLowerCase();
  return merged.length > 0 ? merged : null;
}

/** Patti-only hardcoded bag math: `(bags × 750) + packets` (loose). */
function totalPacketsPattiHardcoded(line: IncomingCartLineForCombo): number {
  const mode = normalizeOrderMode(line.orderMode);
  const q = Math.max(0, Number(line.quantity) || 0);
  if (mode === "master_bag") return q * PATTI_PACKETS_PER_BAG;
  return q;
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}

type PreparedLine = {
  key: string;
  totalPackets: number;
  listBasic: number;
  listGst: number;
  slug: string | null;
};

export function resolveCartComboPricing(
  lines: IncomingCartLineForCombo[],
  productByMongoId: Map<string, LeanProductForCombo>,
  options?: ComputeComboPricingOptions
): ComboPricingResult {
  const cartItems = lines;
  const skipCombo = options?.skipComboAllocation === true;

  const prepared: PreparedLine[] = [];

  for (const line of lines) {
    const mode = normalizeOrderMode(line.orderMode);
    const key = lineKey(line.mongoProductId, line.productId, line.size, line.sellerId ?? "", mode);

    if (!line.mongoProductId) {
      const slug = resolveSlugForLine(line, undefined);
      const tp = isPattiSlug(slug)
        ? totalPacketsPattiHardcoded(line)
        : Math.max(0, pricedPacketCount(line));
      prepared.push({
        key,
        totalPackets: tp,
        listBasic: line.basicPricePerUnit,
        listGst: line.pricePerUnit,
        slug,
      });
      continue;
    }

    const product = productByMongoId.get(line.mongoProductId);
    if (!product) {
      const slug = resolveSlugForLine(line, undefined);
      const tp = isPattiSlug(slug)
        ? totalPacketsPattiHardcoded(line)
        : Math.max(0, pricedPacketCount(line));
      prepared.push({
        key,
        totalPackets: tp,
        listBasic: line.basicPricePerUnit,
        listGst: line.pricePerUnit,
        slug,
      });
      continue;
    }

    const sizes = resolveSizesForSeller(product, line.sellerId ?? "");
    const row = findSizeRow(sizes, line.size);
    const packetsPerBag = resolveDbPacketsPerBag(product, row, line.qtyPerBag);
    const slug = resolveSlugForLine(line, product);

    let totalPackets: number;
    if (isPattiSlug(slug)) {
      totalPackets = totalPacketsPattiHardcoded(line);
    } else {
      totalPackets = totalPacketsForLine(line, packetsPerBag);
    }

    const listBasic = row?.basicPrice ?? product.pricing?.basicPrice ?? line.basicPricePerUnit;
    const listGst = row?.priceWithGst ?? product.pricing?.priceWithGst ?? line.pricePerUnit;

    prepared.push({ key, totalPackets, listBasic, listGst, slug });
  }

  console.log('Current Cart Slugs:', cartItems.map((i) => i.productSlug));

  let pattiAvailable = 0;
  let coreNeeded = 0;
  for (const p of prepared) {
    if (isPattiSlug(p.slug)) {
      pattiAvailable += Math.max(0, p.totalPackets);
    }
    if (isCoreSlug(p.slug)) {
      coreNeeded += Math.max(0, p.totalPackets);
    }
  }

  console.log(
    `Final Match Check -> Patti Available: [${pattiAvailable}], Core Needed: [${coreNeeded}]`
  );

  let pool = pattiAvailable;
  const outLines: ComboPricingResultLine[] = [];
  let cartTotalInclGst = 0;
  let cartBasicTotal = 0;
  let comboMatchedCorePackets = 0;
  let comboSavingsInclGst = 0;

  for (const p of prepared) {
    const pk = Math.max(0, p.totalPackets);
    if (pk === 0) {
      outLines.push({
        key: p.key,
        pricedPacketCount: 0,
        basicPricePerUnit: p.listBasic,
        pricePerUnit: p.listGst,
        comboPricedPackets: 0,
        isComboApplied: false,
        comboSubtotalInclGst: 0,
      });
      continue;
    }

    if (isCoreSlug(p.slug) && !skipCombo) {
      const covered = Math.min(pk, pool);
      pool -= covered;
      const surplus = pk - covered;
      comboMatchedCorePackets += covered;

      const lineInclTotal =
        covered * COMBO_UNIT_INCL_GST + surplus * p.listGst;
      const lineBasicTotal = covered * COMBO_UNIT_BASIC + surplus * p.listBasic;

      if (covered > 0) {
        comboSavingsInclGst += covered * (p.listGst - COMBO_UNIT_INCL_GST);
      }

      cartTotalInclGst += lineInclTotal;
      cartBasicTotal += lineBasicTotal;

      const forceCombo = covered > 0;
      /** Blended unit so `pricePerUnit * pk` matches line total (→ ₹59.35/unit when fully covered). */
      const pricePerUnitOut =
        forceCombo && pk > 0 ? lineInclTotal / pk : p.listGst;
      const basicPricePerUnitOut =
        forceCombo && pk > 0 ? lineBasicTotal / pk : p.listBasic;

      outLines.push({
        key: p.key,
        pricedPacketCount: pk,
        basicPricePerUnit: roundMoney(basicPricePerUnitOut),
        pricePerUnit: roundMoney(pricePerUnitOut),
        comboPricedPackets: covered,
        isComboApplied: forceCombo,
        comboSubtotalInclGst: forceCombo ? roundMoney(covered * COMBO_UNIT_INCL_GST) : 0,
      });
      continue;
    }

    cartTotalInclGst += p.listGst * pk;
    cartBasicTotal += p.listBasic * pk;
    outLines.push({
      key: p.key,
      pricedPacketCount: pk,
      basicPricePerUnit: p.listBasic,
      pricePerUnit: p.listGst,
      comboPricedPackets: 0,
      isComboApplied: false,
      comboSubtotalInclGst: 0,
    });
  }

  let smartSuggestion: string | null = null;
  if (!skipCombo && coreNeeded > pattiAvailable && coreNeeded > 0) {
    smartSuggestion = `Add ${coreNeeded - pattiAvailable} more packet(s) of Single Cable Nail Clips (Patti) to unlock combo net rate on Double Nail Clamps.`;
  }

  return {
    lines: outLines,
    eligiblePacketTotal: pattiAvailable,
    corePacketTotal: coreNeeded,
    comboMatchedCorePackets,
    cartTotalInclGst: roundMoney(cartTotalInclGst),
    cartBasicTotal: roundMoney(cartBasicTotal),
    comboSavingsInclGst: roundMoney(Math.max(0, comboSavingsInclGst)),
    smartSuggestion,
  };
}
