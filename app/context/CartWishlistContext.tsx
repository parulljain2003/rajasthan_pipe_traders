"use client";

import React, { createContext, useContext, useState, useCallback, useMemo, useEffect } from "react";
import {
  normalizeOrderMode,
  pricedPacketCount,
  type CartOrderMode,
} from "@/lib/cart/packetLine";
import { loadCartFromStorage, saveCartToStorage } from "@/lib/cart/cartStorage";

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
  /** Packet count when `orderMode` is `packets`; bag count when `orderMode` is `master_bag` */
  quantity: number;
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
}

export type { CartOrderMode };

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
  cartCount: number;
  cartTotal: number;
  cartBasicTotal: number;
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
}

const CartWishlistContext = createContext<CartWishlistState | null>(null);

export function CartWishlistProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  /** False until client has read localStorage — avoids overwriting saved cart with [] on first paint */
  const [cartHydrated, setCartHydrated] = useState(false);

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

  const cartCount = useMemo(
    () => cartItems.length,
    [cartItems]
  );

  const cartTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, ci) => sum + ci.pricePerUnit * pricedPacketCount(ci),
        0
      ),
    [cartItems]
  );

  const cartBasicTotal = useMemo(
    () =>
      cartItems.reduce(
        (sum, ci) => sum + ci.basicPricePerUnit * pricedPacketCount(ci),
        0
      ),
    [cartItems]
  );

  return (
    <CartWishlistContext.Provider
      value={{
        cartItems,
        cartCount,
        cartTotal,
        cartBasicTotal,
        addToCart,
        removeFromCart,
        removeCartGroup,
        updateQuantity,
        updateSize,
        clearCart,
      }}
    >
      {children}
    </CartWishlistContext.Provider>
  );
}

export function useCartWishlist() {
  const ctx = useContext(CartWishlistContext);
  if (!ctx) throw new Error("useCartWishlist must be used within CartWishlistProvider");
  return ctx;
}
