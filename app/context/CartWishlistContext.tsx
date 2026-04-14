"use client";

import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
  useRef,
} from "react";
import { normalizeOrderMode, type CartOrderMode } from "@/lib/cart/packetLine";
import { cartLineSubtotalBasic, cartLineSubtotalInclGst } from "@/lib/cart/cartLineTotals";
import { loadCartFromStorage, saveCartToStorage } from "@/lib/cart/cartStorage";
import { comboCartLineKeyFromCartItem } from "@/lib/cart/cartLineKey";

/** Must match `DEFAULT_SELLER_ID` in `app/data/products.ts` (not imported here to keep this client bundle lean). */
const DEFAULT_SELLER_ID = "default";

export interface CartItem {
  productId: number;
  /** MongoDB ObjectId string when the line came from the API catalog — used for coupon targeting */
  mongoProductId?: string;
  categoryMongoId?: string;
  productSlug: string;
  productImage: string;
  productName: string;
  brand: string;
  category: string;
  /** Distinguishes the same SKU from different sellers */
  sellerId: string;
  sellerName: string;
  size: string;
  /** Packet count when `orderMode` is `packets`; bag count when `master_bag`; cartons when `carton` */
  quantity: number;
  /** When `orderMode` is `carton`, packets per carton (for packet-equivalent math) */
  packetsPerCarton?: number;
  /** With GST, per packet (priced unit) */
  pricePerUnit: number;
  basicPricePerUnit: number;
  qtyPerBag: number;
  pcsPerPacket: number;
  /**
   * `packets`: `quantity` = number of packets (price × packets).
   * `master_bag`: `quantity` = number of master bags; line amount = price × (quantity × qtyPerBag) packets.
   */
  orderMode?: CartOrderMode;
  /** Priced units at combo rate (set by combo pricing sync; name kept for storage compat) */
  comboPricedPackets?: number;
  /** GST-inclusive value of combo net-priced packets (authoritative for coupon exclusion) */
  comboSubtotalInclGst?: number;
  /** True when any packets use combo net rate */
  isComboApplied?: boolean;
}

/** How to combine combo rates with coupons: combo lines stay net; coupon hits non-combo only, unless user forgoes combo. */
export type CartCouponPricingMode = "combo_first" | "list_for_full_coupon";

/** Filled by combo-pricing sync (runs app-wide when the cart has lines). */
export type ComboPricingMeta = {
  suggestion: string | null;
  minimumOrderInclGst: number;
  minimumOrderMet: boolean;
  comboSavingsInclGst: number;
};

export type { CartOrderMode };

export const DEFAULT_COMBO_PRICING_META: ComboPricingMeta = {
  suggestion: null,
  minimumOrderInclGst: 25_000,
  minimumOrderMet: true,
  comboSavingsInclGst: 0,
};

export type AddCartItemInput = Omit<CartItem, "quantity">;

function normalizeSellerId(sellerId: string | undefined): string {
  return sellerId && sellerId.length > 0 ? sellerId : DEFAULT_SELLER_ID;
}

function sameLine(
  ci: CartItem,
  productId: number,
  size: string,
  sellerId: string,
  orderMode: CartOrderMode
): boolean {
  return (
    ci.productId === productId &&
    ci.size === size &&
    ci.sellerId === normalizeSellerId(sellerId) &&
    normalizeOrderMode(ci.orderMode) === orderMode
  );
}

interface CartWishlistState {
  cartItems: CartItem[];
  /** True after localStorage cart has been loaded on the client */
  cartHydrated: boolean;
  cartCount: number;
  cartTotal: number;
  cartBasicTotal: number;
  applyComboPricingLines: (
    updates: Array<{
      key: string;
      pricePerUnit: number;
      basicPricePerUnit: number;
      comboPricedPackets: number;
      comboSubtotalInclGst?: number;
      isComboApplied?: boolean;
    }>
  ) => void;
  /** When `list_for_full_coupon`, combo allocation is skipped so coupons can use list-priced totals */
  couponPricingMode: CartCouponPricingMode;
  setCouponPricingMode: (mode: CartCouponPricingMode) => void;
  addToCart: (item: AddCartItemInput, qty?: number) => void;
  removeFromCart: (productId: number, size: string, sellerId?: string, orderMode?: CartOrderMode) => void;
  /** Remove every line for this product + size + seller (both packet and bulk rows) */
  removeCartGroup: (productId: number, size: string, sellerId?: string) => void;
  updateQuantity: (productId: number, size: string, qty: number, sellerId?: string, orderMode?: CartOrderMode) => void;
  updateSize: (
    productId: number,
    oldSize: string,
    newSize: string,
    newPrice: number,
    newBasicPrice: number,
    newQtyPerBag: number,
    newPcsPerPacket: number,
    sellerId?: string,
    orderMode?: CartOrderMode
  ) => void;
  clearCart: () => void;
  /** Combo API suggestion + min-order / savings; updated whenever the cart has lines (app-wide sync). */
  comboPricingMeta: ComboPricingMeta;
}

const CartWishlistContext = createContext<CartWishlistState | null>(null);

export function CartWishlistProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  /** False until client has read localStorage — avoids overwriting saved cart with [] on first paint */
  const [cartHydrated, setCartHydrated] = useState(false);
  const [couponPricingMode, setCouponPricingMode] = useState<CartCouponPricingMode>("combo_first");
  const [comboPricingMeta, setComboPricingMeta] = useState<ComboPricingMeta>(DEFAULT_COMBO_PRICING_META);

  useEffect(() => {
    /* Persisted cart only exists in the browser — load after mount to match SSR (empty) then fill */
    /* eslint-disable-next-line react-hooks/set-state-in-effect */
    setCartItems(loadCartFromStorage());
    setCartHydrated(true);
  }, []);

  useEffect(() => {
    if (!cartHydrated) return;
    saveCartToStorage(cartItems);
  }, [cartItems, cartHydrated]);

  const addToCart = useCallback((item: AddCartItemInput, qty: number = 1) => {
    const sid = normalizeSellerId(item.sellerId);
    const mode = normalizeOrderMode(item.orderMode);
    const row: AddCartItemInput = { ...item, sellerId: sid, orderMode: mode };
    setCartItems(prev => {
      const existing = prev.find((ci) => sameLine(ci, row.productId, row.size, row.sellerId, mode));
      if (existing) {
        return prev.map((ci) =>
          sameLine(ci, row.productId, row.size, row.sellerId, mode) ? { ...ci, quantity: qty } : ci
        );
      }
      return [...prev, { ...row, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((productId: number, size: string, sellerId?: string, orderMode?: CartOrderMode) => {
    const sid = normalizeSellerId(sellerId);
    const mode = normalizeOrderMode(orderMode);
    setCartItems((prev) => prev.filter((ci) => !sameLine(ci, productId, size, sid, mode)));
  }, []);

  const removeCartGroup = useCallback((productId: number, size: string, sellerId?: string) => {
    const sid = normalizeSellerId(sellerId);
    setCartItems((prev) =>
      prev.filter((ci) => !(ci.productId === productId && ci.size === size && ci.sellerId === sid))
    );
  }, []);

  const updateQuantity = useCallback((productId: number, size: string, qty: number, sellerId?: string, orderMode?: CartOrderMode) => {
    if (qty < 1) return;
    const sid = normalizeSellerId(sellerId);
    const mode = normalizeOrderMode(orderMode);
    setCartItems((prev) =>
      prev.map((ci) =>
        sameLine(ci, productId, size, sid, mode) ? { ...ci, quantity: qty } : ci
      )
    );
  }, []);

  const updateSize = useCallback((
    productId: number,
    oldSize: string,
    newSize: string,
    newPrice: number,
    newBasicPrice: number,
    newQtyPerBag: number,
    newPcsPerPacket: number,
    sellerId?: string,
    orderMode?: CartOrderMode,
  ) => {
    const sid = normalizeSellerId(sellerId);
    const mode = normalizeOrderMode(orderMode);
    setCartItems((prev) =>
      prev.map((ci) =>
        sameLine(ci, productId, oldSize, sid, mode)
          ? {
              ...ci,
              size: newSize,
              pricePerUnit: newPrice,
              basicPricePerUnit: newBasicPrice,
              qtyPerBag: newQtyPerBag,
              pcsPerPacket: newPcsPerPacket,
            }
          : ci
      )
    );
  }, []);

  const clearCart = useCallback(() => setCartItems([]), []);

  const applyComboPricingLines = useCallback(
    (
      updates: Array<{
        key: string;
        pricePerUnit: number;
        basicPricePerUnit: number;
        comboPricedPackets: number;
        comboSubtotalInclGst?: number;
        isComboApplied?: boolean;
      }>
    ) => {
      const map = new Map(updates.map((u) => [u.key, u]));
      setCartItems((prev) => {
        let changed = false;
        const next = prev.map((ci) => {
          const hit = map.get(comboCartLineKeyFromCartItem(ci));
          if (!hit) return ci;
          const nextComboGst = hit.comboSubtotalInclGst;
          const nextIsCombo =
            (hit.comboPricedPackets ?? 0) > 0 ||
            (hit.comboSubtotalInclGst ?? 0) > 0.005 ||
            Boolean(hit.isComboApplied);
          const priceSame = Math.abs((ci.pricePerUnit ?? 0) - hit.pricePerUnit) < 0.005;
          const basicSame = Math.abs((ci.basicPricePerUnit ?? 0) - hit.basicPricePerUnit) < 0.005;
          if (
            priceSame &&
            basicSame &&
            (ci.comboPricedPackets ?? 0) === hit.comboPricedPackets &&
            Math.abs((ci.comboSubtotalInclGst ?? 0) - (nextComboGst ?? 0)) < 0.005 &&
            Boolean(ci.isComboApplied) === nextIsCombo
          ) {
            return ci;
          }
          changed = true;
          return {
            ...ci,
            pricePerUnit: hit.pricePerUnit,
            basicPricePerUnit: hit.basicPricePerUnit,
            comboPricedPackets: hit.comboPricedPackets,
            comboSubtotalInclGst: nextComboGst,
            isComboApplied: nextIsCombo,
          };
        });
        return changed ? next : prev;
      });
    },
    []
  );

  const cartCount = useMemo(
    () => cartItems.length,
    [cartItems]
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, ci) => sum + cartLineSubtotalInclGst(ci), 0),
    [cartItems]
  );

  const cartBasicTotal = useMemo(
    () => cartItems.reduce((sum, ci) => sum + cartLineSubtotalBasic(ci), 0),
    [cartItems]
  );

  return (
    <CartWishlistContext.Provider
      value={{
        cartItems,
        cartHydrated,
        cartCount,
        cartTotal,
        cartBasicTotal,
        applyComboPricingLines,
        couponPricingMode,
        setCouponPricingMode,
        addToCart,
        removeFromCart,
        removeCartGroup,
        updateQuantity,
        updateSize,
        clearCart,
        comboPricingMeta,
      }}
    >
      <ComboPricingSyncEffects setComboPricingMeta={setComboPricingMeta} />
      {children}
    </CartWishlistContext.Provider>
  );
}

export function useCartWishlist() {
  const ctx = useContext(CartWishlistContext);
  if (!ctx) throw new Error("useCartWishlist must be used within CartWishlistProvider");
  return ctx;
}

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

function linesPayloadForCombo(items: CartItem[]) {
  return items.map((ci) => ({
    mongoProductId: ci.mongoProductId,
    productId: ci.productId,
    productSlug: ci.productSlug,
    size: ci.size,
    sellerId: ci.sellerId,
    orderMode: normalizeOrderMode(ci.orderMode),
    quantity: ci.quantity,
    qtyPerBag: ci.qtyPerBag,
    pcsPerPacket: ci.pcsPerPacket,
    packetsPerCarton: ci.packetsPerCarton,
    pricePerUnit: ci.pricePerUnit,
    basicPricePerUnit: ci.basicPricePerUnit,
  }));
}

/** Runs inside the provider; fetches combo pricing whenever the cart changes so totals stay in sync site-wide. */
function ComboPricingSyncEffects({
  setComboPricingMeta,
}: {
  setComboPricingMeta: React.Dispatch<React.SetStateAction<ComboPricingMeta>>;
}) {
  const { cartItems, cartHydrated, applyComboPricingLines, couponPricingMode } = useCartWishlist();
  const reqId = useRef(0);

  useEffect(() => {
    if (!cartHydrated || cartItems.length === 0) {
      setComboPricingMeta(DEFAULT_COMBO_PRICING_META);
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
            lines: linesPayloadForCombo(cartItems),
            preferListOverCombo,
          }),
          signal: ac.signal,
        });
        const json = (await res.json()) as ComboPricingResponse;
        if (id !== reqId.current) return;
        if (!res.ok || !json.data?.lines) return;

        applyComboPricingLines(
          json.data.lines.map((row) => {
            const comboPk = row.comboPricedPackets ?? 0;
            const comboGst = row.comboSubtotalInclGst ?? 0;
            const isComboApplied =
              Boolean(row.isComboApplied) || comboPk > 0 || comboGst > 0.005;
            return {
              key: row.key,
              pricePerUnit: row.pricePerUnit,
              basicPricePerUnit: row.basicPricePerUnit,
              comboPricedPackets: comboPk,
              comboSubtotalInclGst: row.comboSubtotalInclGst,
              isComboApplied,
            };
          })
        );

        setComboPricingMeta({
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
  }, [cartItems, cartHydrated, applyComboPricingLines, couponPricingMode, setComboPricingMeta]);

  return null;
}
