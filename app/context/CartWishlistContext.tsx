"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

/** Must match `DEFAULT_SELLER_ID` in `app/data/products.ts` (not imported here to keep this client bundle lean). */
const DEFAULT_SELLER_ID = "default";

export interface CartItem {
  productId: number;
  productSlug: string;
  productImage: string;
  productName: string;
  brand: string;
  category: string;
  /** Distinguishes the same SKU from different sellers */
  sellerId: string;
  sellerName: string;
  size: string;
  quantity: number;
  pricePerUnit: number;       // incl. GST
  basicPricePerUnit: number;  // ex-GST
  qtyPerBag: number;
  pcsPerPacket: number;
}

type AddCartItemInput = Omit<CartItem, "quantity">;

function normalizeSellerId(sellerId: string | undefined): string {
  return sellerId && sellerId.length > 0 ? sellerId : DEFAULT_SELLER_ID;
}

function sameLine(
  ci: CartItem,
  productId: number,
  size: string,
  sellerId: string
): boolean {
  return (
    ci.productId === productId &&
    ci.size === size &&
    ci.sellerId === normalizeSellerId(sellerId)
  );
}

interface CartWishlistState {
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartBasicTotal: number;
  addToCart: (item: AddCartItemInput, qty?: number) => void;
  removeFromCart: (productId: number, size: string, sellerId?: string) => void;
  updateQuantity: (productId: number, size: string, qty: number, sellerId?: string) => void;
  updateSize: (
    productId: number,
    oldSize: string,
    newSize: string,
    newPrice: number,
    newBasicPrice: number,
    newQtyPerBag: number,
    newPcsPerPacket: number,
    sellerId?: string
  ) => void;
  clearCart: () => void;
}

const CartWishlistContext = createContext<CartWishlistState | null>(null);

export function CartWishlistProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const addToCart = useCallback((item: AddCartItemInput, qty: number = 1) => {
    const sid = normalizeSellerId(item.sellerId);
    const row: AddCartItemInput = { ...item, sellerId: sid };
    setCartItems(prev => {
      const existing = prev.find((ci) => sameLine(ci, row.productId, row.size, row.sellerId));
      if (existing) {
        return prev.map((ci) =>
          sameLine(ci, row.productId, row.size, row.sellerId) ? { ...ci, quantity: qty } : ci
        );
      }
      return [...prev, { ...row, quantity: qty }];
    });
  }, []);

  const removeFromCart = useCallback((productId: number, size: string, sellerId?: string) => {
    const sid = normalizeSellerId(sellerId);
    setCartItems((prev) => prev.filter((ci) => !sameLine(ci, productId, size, sid)));
  }, []);

  const updateQuantity = useCallback((productId: number, size: string, qty: number, sellerId?: string) => {
    if (qty < 1) return;
    const sid = normalizeSellerId(sellerId);
    setCartItems((prev) =>
      prev.map((ci) =>
        sameLine(ci, productId, size, sid) ? { ...ci, quantity: qty } : ci
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
  ) => {
    const sid = normalizeSellerId(sellerId);
    setCartItems((prev) =>
      prev.map((ci) =>
        sameLine(ci, productId, oldSize, sid)
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
    () => cartItems.reduce((sum, ci) => sum + (ci.pricePerUnit * ci.quantity), 0),
    [cartItems]
  );

  const cartBasicTotal = useMemo(
    () => cartItems.reduce((sum, ci) => sum + (ci.basicPricePerUnit * ci.quantity), 0),
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
