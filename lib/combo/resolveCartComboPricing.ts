import type { CartOrderMode } from "@/lib/cart/packetLine";
import { normalizeOrderMode, pricedPacketCount } from "@/lib/cart/packetLine";
import {
  computeComboPricing,
  type ComboPricingInputLine,
  type ComputeComboPricingOptions,
} from "@/lib/combo/computeComboPricing";

const DEFAULT_SELLER = "default";

export type IncomingCartLineForCombo = {
  mongoProductId?: string;
  productId?: number;
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
};

export type LeanProductForCombo = {
  _id: { toString: () => string };
  isEligibleForCombo?: boolean;
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
  return null;
}

function inferCoreVariant(sizeLabel: string): "20" | "25" | null {
  const u = sizeLabel.toUpperCase();
  if (u.includes("NO COMBO")) return null;
  if (/\b20\s*MM\b/.test(u) || u.includes("20MM")) return "20";
  if (/\b25\s*MM\b/.test(u) || u.includes("25MM")) return "25";
  return null;
}

export function buildComboInputFromProduct(
  product: LeanProductForCombo,
  line: IncomingCartLineForCombo,
  key: string
): ComboPricingInputLine {
  const pk = pricedPacketCount({
    orderMode: line.orderMode,
    quantity: line.quantity,
    qtyPerBag: line.qtyPerBag,
    pcsPerPacket: line.pcsPerPacket,
  });

  const sizes = resolveSizesForSeller(product, line.sellerId ?? "");
  const row = findSizeRow(sizes, line.size);

  const listBasic = row?.basicPrice ?? product.pricing?.basicPrice ?? line.basicPricePerUnit;
  const listGst = row?.priceWithGst ?? product.pricing?.priceWithGst ?? line.pricePerUnit;

  let coreVariant: "20" | "25" | null = row?.coreComboVariant ?? null;
  if (!coreVariant && row) {
    coreVariant = inferCoreVariant(row.size);
  }

  const eligiblePool = isLineEligibleForPool(row, product, coreVariant);

  return {
    key,
    pricedPacketCount: pk,
    listBasicPrice: listBasic,
    listPriceWithGst: listGst,
    coreVariant,
    comboBasicPrice: row?.comboBasicPrice,
    comboPriceWithGst: row?.comboPriceWithGst,
    isEligibleForCombo: eligiblePool,
  };
}

function isLineEligibleForPool(
  row: LeanCatalogSize | null,
  product: LeanProductForCombo,
  coreVariant: "20" | "25" | null
): boolean {
  if (coreVariant) return false;
  if (row?.countsTowardComboEligible === true) return true;
  if (row?.countsTowardComboEligible === false) return false;
  return Boolean(product.isEligibleForCombo);
}

export function resolveCartComboPricing(
  lines: IncomingCartLineForCombo[],
  productByMongoId: Map<string, LeanProductForCombo>,
  options?: ComputeComboPricingOptions
): ReturnType<typeof computeComboPricing> {
  const inputs: ComboPricingInputLine[] = [];

  for (const line of lines) {
    const mode = normalizeOrderMode(line.orderMode);
    const key = lineKey(line.mongoProductId, line.productId, line.size, line.sellerId ?? "", mode);

    if (!line.mongoProductId) {
      inputs.push({
        key,
        pricedPacketCount: pricedPacketCount(line),
        listBasicPrice: line.basicPricePerUnit,
        listPriceWithGst: line.pricePerUnit,
        coreVariant: inferCoreVariant(line.size),
        comboBasicPrice: undefined,
        comboPriceWithGst: undefined,
        isEligibleForCombo: false,
      });
      continue;
    }

    const product = productByMongoId.get(line.mongoProductId);
    if (!product) {
      inputs.push({
        key,
        pricedPacketCount: pricedPacketCount(line),
        listBasicPrice: line.basicPricePerUnit,
        listPriceWithGst: line.pricePerUnit,
        coreVariant: inferCoreVariant(line.size),
        comboBasicPrice: undefined,
        comboPriceWithGst: undefined,
        isEligibleForCombo: false,
      });
      continue;
    }

    inputs.push(buildComboInputFromProduct(product, line, key));
  }

  return computeComboPricing(inputs, options);
}
