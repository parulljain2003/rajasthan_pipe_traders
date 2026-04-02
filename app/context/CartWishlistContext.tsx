"use client";

import React, { createContext, useContext, useState, useCallback } from "react";

interface CartWishlistState {
  wishlist: number[];
  cartCount: number;
  toggleWishlist: (id: number) => void;
  isWishlisted: (id: number) => boolean;
  addToCart: () => void;
}

const CartWishlistContext = createContext<CartWishlistState | null>(null);

export function CartWishlistProvider({ children }: { children: React.ReactNode }) {
  const [wishlist, setWishlist] = useState<number[]>([]);
  const [cartCount, setCartCount] = useState(0);

  const toggleWishlist = useCallback((id: number) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  }, []);

  const isWishlisted = useCallback((id: number) => wishlist.includes(id), [wishlist]);

  const addToCart = useCallback(() => {
    setCartCount(prev => prev + 1);
  }, []);

  return (
    <CartWishlistContext.Provider value={{ wishlist, cartCount, toggleWishlist, isWishlisted, addToCart }}>
      {children}
    </CartWishlistContext.Provider>
  );
}

export function useCartWishlist() {
  const ctx = useContext(CartWishlistContext);
  if (!ctx) throw new Error("useCartWishlist must be used within CartWishlistProvider");
  return ctx;
}
