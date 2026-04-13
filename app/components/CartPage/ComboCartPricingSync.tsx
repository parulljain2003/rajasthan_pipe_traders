"use client";

import { useEffect, useRef } from "react";
import type { CartItem } from "@/app/context/CartWishlistContext";
import { useCartWishlist } from "@/app/context/CartWishlistContext";

type ComboApiLine = {
  key: string;
  pricePerUnit: number;
  basicPricePerUnit: number;
  comboPricedPackets: number;
  isComboApplied?: boolean;
  comboSubtotalInclGst?: number;
};

type ComboPricingResponse = {
  data?: {
    lines: ComboApiLine[];
    smartSuggestion: string | null;
    minimumOrderInclGst: number;
    minimumOrderMet: boolean;
    comboSavingsInclGst?: number;
  };
};

function linesPayload(items: CartItem[]) {
  return items.map((ci) => ({
    mongoProductId: ci.mongoProductId,
    productId: ci.productId,
    size: ci.size,
    sellerId: ci.sellerId,
    orderMode: ci.orderMode,
    quantity: ci.quantity,
    qtyPerBag: ci.qtyPerBag,
    pcsPerPacket: ci.pcsPerPacket,
    pricePerUnit: ci.pricePerUnit,
    basicPricePerUnit: ci.basicPricePerUnit,
  }));
}

export default function ComboCartPricingSync({
  onMeta,
}: {
  onMeta: (meta: {
    suggestion: string | null;
    minimumOrderInclGst: number;
    minimumOrderMet: boolean;
    comboSavingsInclGst: number;
  }) => void;
}) {
  const { cartItems, cartHydrated, applyComboPricingLines, couponPricingMode } = useCartWishlist();
  const reqId = useRef(0);
  const onMetaRef = useRef(onMeta);
  onMetaRef.current = onMeta;

  useEffect(() => {
    if (!cartHydrated || cartItems.length === 0) {
      onMetaRef.current({
        suggestion: null,
        minimumOrderInclGst: 25_000,
        minimumOrderMet: true,
        comboSavingsInclGst: 0,
      });
      return;
    }

    const id = ++reqId.current;
    const ac = new AbortController();

    void (async () => {
      try {
        const preferListOverCombo = couponPricingMode === "list_for_full_coupon";
        const res = await fetch("/api/cart/combo-pricing", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: linesPayload(cartItems),
            preferListOverCombo,
          }),
          signal: ac.signal,
        });
        const json = (await res.json()) as ComboPricingResponse;
        if (id !== reqId.current) return;
        if (!res.ok || !json.data?.lines) return;

        applyComboPricingLines(
          json.data.lines.map((row) => ({
            key: row.key,
            pricePerUnit: row.pricePerUnit,
            basicPricePerUnit: row.basicPricePerUnit,
            comboPricedPackets: row.comboPricedPackets ?? 0,
            comboSubtotalInclGst: row.comboSubtotalInclGst,
            isComboApplied: row.isComboApplied ?? (row.comboPricedPackets ?? 0) > 0,
          }))
        );

        onMetaRef.current({
          suggestion: json.data.smartSuggestion ?? null,
          minimumOrderInclGst: json.data.minimumOrderInclGst ?? 25_000,
          minimumOrderMet: Boolean(json.data.minimumOrderMet),
          comboSavingsInclGst: json.data.comboSavingsInclGst ?? 0,
        });
      } catch {
        if (ac.signal.aborted) return;
      }
    })();

    return () => ac.abort();
  }, [cartItems, cartHydrated, applyComboPricingLines, couponPricingMode]);

  return null;
}
