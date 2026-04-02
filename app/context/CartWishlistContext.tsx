"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";

export interface CartItem {
  productId: number;
  productName: string;
  productSlug: string;
  productImage: string;
  brand: string;
  category: string;
  size: string;
  quantity: number;
  pricePerUnit: number;       // incl. GST
  basicPricePerUnit: number;  // ex-GST
  qtyPerBag: number;
  pcsPerPacket: number;
}

type AddCartItemInput = Omit<CartItem, 'quantity'>;

interface CartWishlistState {
  wishlist: number[];
  cartItems: CartItem[];
  cartCount: number;
  cartTotal: number;
  cartBasicTotal: number;
  toggleWishlist: (id: number) => void;
  isWishlisted: (id: number) => boolean;
  addToCart: (item: AddCartItemInput) => void;
  removeFromCart: (productId: number, size: string) => void;
  updateQuantity: (productId: number, size: string, qty: number) => void;
  updateSize: (productId: number, oldSize: string, newSize: string, newPrice: number, newBasicPrice: number, newQtyPerBag: number, newPcsPerPacket: number) => void;
  clearCart: () => void;
}

const CartWishlistContext = createContext<CartWishlistState | null>(null);

export function CartWishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);

  const toggleWishlist = useCallback((id: number) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const isWishlisted = useCallback((id: number) => wishlist.includes(id), [wishlist]);

  const addToCart = useCallback((item: AddCartItemInput) => {
    setCartItems(prev => {
      const existing = prev.find(
        ci => ci.productId === item.productId && ci.size === item.size
      );
      if (existing) {
        return prev.map(ci =>
          ci.productId === item.productId && ci.size === item.size
            ? { ...ci, quantity: ci.quantity + 1 }
            : ci
        );
      }
      return [...prev, { ...item, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId: number, size: string) => {
    setCartItems(prev => prev.filter(ci => !(ci.productId === productId && ci.size === size)));
  }, []);

  const updateQuantity = useCallback((productId: number, size: string, qty: number) => {
    if (qty < 1) return;
    setCartItems(prev =>
      prev.map(ci =>
        ci.productId === productId && ci.size === size ? { ...ci, quantity: qty } : ci
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
  ) => {
    setCartItems(prev =>
      prev.map(ci =>
        ci.productId === productId && ci.size === oldSize
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
    () => cartItems.reduce((sum, ci) => sum + ci.quantity, 0),
    [cartItems]
  );

  const cartTotal = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.pricePerUnit * ci.quantity, 0),
    [cartItems]
  );

  const cartBasicTotal = useMemo(
    () => cartItems.reduce((sum, ci) => sum + ci.basicPricePerUnit * ci.quantity, 0),
    [cartItems]
  );

  return (
    <CartWishlistContext.Provider
      value={{
        wishlist,
        cartItems,
        cartCount,
        cartTotal,
        cartBasicTotal,
        toggleWishlist,
        isWishlisted,
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
