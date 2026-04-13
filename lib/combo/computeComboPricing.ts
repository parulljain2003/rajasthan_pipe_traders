/**
 * RPT combo offer: core 20/25MM clip packets priced at net combo rates up to the
 * eligible-packet pool; surplus core packets use list (non-combo) rates.
 */

export type ComboPricingInputLine = {
  /** Stable cart line key */
  key: string;
  pricedPacketCount: number;
  /** List / non-combo (slab-discount-eligible) unit prices */
  listBasicPrice: number;
  listPriceWithGst: number;
  /** When set with combo unit prices, this line can receive combo allocation */
  coreVariant: "20" | "25" | null;
  comboBasicPrice?: number;
  comboPriceWithGst?: number;
  /** Counts toward eligible pool (same unit as packets) */
  isEligibleForCombo: boolean;
};

export type ComboPricingResultLine = {
  key: string;
  pricedPacketCount: number;
  basicPricePerUnit: number;
  pricePerUnit: number;
  /** Packets on this line priced at combo net rate */
  comboPricedPackets: number;
  /** True when any packets use RPT combo net rate (excluded from coupon discount) */
  isComboApplied: boolean;
  /** GST-inclusive value of combo-priced packets at net combo rate — coupon must not discount this */
  comboSubtotalInclGst: number;
};

export type ComboPricingResult = {
  lines: ComboPricingResultLine[];
  /** Sum of packets from eligible products */
  eligiblePacketTotal: number;
  /** Sum of packets from core 20/25 lines (with combo rates configured) */
  corePacketTotal: number;
  /** min(eligible, core) — combo-priced core packets */
  comboMatchedCorePackets: number;
  cartTotalInclGst: number;
  cartBasicTotal: number;
  /** Estimated savings vs list rate on combo-priced packets (incl. GST) */
  comboSavingsInclGst: number;
  /** Hint when user is close to unlocking more combo */
  smartSuggestion: string | null;
};

export type ComputeComboPricingOptions = {
  /** When true, core lines use list prices only (for “full coupon” mode). */
  skipComboAllocation?: boolean;
};

function blendUnitPrice(
  comboPackets: number,
  comboUnit: number,
  nonComboPackets: number,
  listUnit: number,
  totalPackets: number
): number {
  if (totalPackets <= 0) return listUnit;
  return (comboPackets * comboUnit + nonComboPackets * listUnit) / totalPackets;
}

/**
 * Sort core lines: 20MM variants first, then 25MM, then key for stability.
 */
function sortCoreLines<T extends { coreVariant: "20" | "25"; key: string }>(rows: T[]): T[] {
  const rank = (v: "20" | "25") => (v === "20" ? 0 : 1);
  return [...rows].sort((a, b) => rank(a.coreVariant) - rank(b.coreVariant) || a.key.localeCompare(b.key));
}

export function computeComboPricing(
  inputLines: ComboPricingInputLine[],
  options: ComputeComboPricingOptions = {}
): ComboPricingResult {
  const { skipComboAllocation = false } = options;
  let eligiblePacketTotal = 0;
  for (const line of inputLines) {
    if (line.isEligibleForCombo) {
      eligiblePacketTotal += Math.max(0, line.pricedPacketCount);
    }
  }

  type CoreRow = ComboPricingInputLine & { coreVariant: "20" | "25" };
  const coreRows: CoreRow[] = [];
  for (const line of inputLines) {
    if (!line.coreVariant) continue;
    const cg = line.comboPriceWithGst;
    const cb = line.comboBasicPrice;
    if (cg == null || cb == null || !Number.isFinite(cg) || !Number.isFinite(cb)) continue;
    coreRows.push(line as CoreRow);
  }

  let corePacketTotal = 0;
  for (const r of coreRows) {
    corePacketTotal += Math.max(0, r.pricedPacketCount);
  }

  const sortedCore = sortCoreLines(coreRows);
  let budget = skipComboAllocation ? 0 : Math.min(eligiblePacketTotal, corePacketTotal);
  const comboAlloc = new Map<string, number>();

  for (const row of sortedCore) {
    const pk = Math.max(0, row.pricedPacketCount);
    const take = skipComboAllocation ? 0 : Math.min(pk, budget);
    comboAlloc.set(row.key, take);
    budget -= take;
  }

  const lines: ComboPricingResultLine[] = [];
  let cartTotalInclGst = 0;
  let cartBasicTotal = 0;
  let comboMatchedCorePackets = 0;
  let comboSavingsInclGst = 0;

  for (const line of inputLines) {
    const pk = Math.max(0, line.pricedPacketCount);
    if (pk === 0) {
      lines.push({
        key: line.key,
        pricedPacketCount: 0,
        basicPricePerUnit: line.listBasicPrice,
        pricePerUnit: line.listPriceWithGst,
        comboPricedPackets: 0,
        isComboApplied: false,
        comboSubtotalInclGst: 0,
      });
      continue;
    }

    const coreVariant = line.coreVariant;
    const cg = line.comboPriceWithGst;
    const cb = line.comboBasicPrice;
    const hasCombo =
      coreVariant &&
      cg != null &&
      cb != null &&
      Number.isFinite(cg) &&
      Number.isFinite(cb);

    if (!hasCombo || !coreVariant) {
      cartBasicTotal += line.listBasicPrice * pk;
      cartTotalInclGst += line.listPriceWithGst * pk;
      lines.push({
        key: line.key,
        pricedPacketCount: pk,
        basicPricePerUnit: line.listBasicPrice,
        pricePerUnit: line.listPriceWithGst,
        comboPricedPackets: 0,
        isComboApplied: false,
        comboSubtotalInclGst: 0,
      });
      continue;
    }

    const comboPk = Math.min(pk, comboAlloc.get(line.key) ?? 0);
    const nonComboPk = pk - comboPk;
    comboMatchedCorePackets += comboPk;
    if (comboPk > 0 && cg != null) {
      comboSavingsInclGst += comboPk * (line.listPriceWithGst - cg);
    }

    const basicPricePerUnit = blendUnitPrice(comboPk, cb, nonComboPk, line.listBasicPrice, pk);
    const pricePerUnit = blendUnitPrice(comboPk, cg, nonComboPk, line.listPriceWithGst, pk);

    const comboSubtotalInclGst = comboPk > 0 && cg != null ? roundMoney(comboPk * cg) : 0;

    cartBasicTotal += basicPricePerUnit * pk;
    cartTotalInclGst += pricePerUnit * pk;

    lines.push({
      key: line.key,
      pricedPacketCount: pk,
      basicPricePerUnit,
      pricePerUnit,
      comboPricedPackets: comboPk,
      isComboApplied: comboPk > 0,
      comboSubtotalInclGst,
    });
  }

  let smartSuggestion: string | null = null;
  const surplusCore = Math.max(0, corePacketTotal - eligiblePacketTotal);
  if (corePacketTotal > 0 && eligiblePacketTotal === 0) {
    smartSuggestion =
      "Add eligible products (1.4–18MM clips, clamps, batten, wall plugs, etc.) to unlock combo net rates on 20MM/25MM clips.";
  } else if (surplusCore > 0) {
    smartSuggestion = `Add ${surplusCore} more packet(s) of eligible products to price more 20MM/25MM clips at combo net rates (surplus is charged at non-combo list rates).`;
  }

  return {
    lines,
    eligiblePacketTotal,
    corePacketTotal,
    comboMatchedCorePackets,
    cartTotalInclGst,
    cartBasicTotal,
    comboSavingsInclGst: roundMoney(Math.max(0, comboSavingsInclGst)),
    smartSuggestion,
  };
}

function roundMoney(n: number): number {
  return Math.round(n * 100) / 100;
}
