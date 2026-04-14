/**
 * Shared types for POST /api/cart/combo-pricing (admin-defined product combos).
 */

export type ComboPricingResultLine = {
  key: string;
  /** Priced units (packets, or packets expanded from bags, or from cartons × packetsPerCarton) */
  pricedPacketCount: number;
  basicPricePerUnit: number;
  pricePerUnit: number;
  /** Units priced at combo rate (same dimension as pricedPacketCount when fully combo) */
  comboPricedPackets: number;
  isComboApplied: boolean;
  comboSubtotalInclGst: number;
};

export type ComboPricingResult = {
  lines: ComboPricingResultLine[];
  eligiblePacketTotal: number;
  corePacketTotal: number;
  comboMatchedCorePackets: number;
  cartTotalInclGst: number;
  cartBasicTotal: number;
  comboSavingsInclGst: number;
  smartSuggestion: string | null;
};

export type ComputeComboPricingOptions = {
  skipComboAllocation?: boolean;
};
