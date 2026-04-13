"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './CartPage.module.css';
import CartItemCard from './CartItemCard/CartItemCard';
import OrderSummary from './OrderSummary/OrderSummary';
import ComboCartPricingSync from './ComboCartPricingSync';
import OrderSuccessPopup from './OrderSuccessPopup/OrderSuccessPopup';
import { useCartWishlist } from '../../context/CartWishlistContext';
import {
  cartLinesForCouponApi,
  mapPublicCouponToOption,
  type CartCouponOption,
  type CouponApplyResult,
  type CouponValidateResponseJson,
  type PublicCouponBannerJson,
} from './cartCoupons';
import { groupCartItemsByProductLine, cartGroupKey } from '@/lib/cart/groupCartLines';

export default function CartPage() {
  const router = useRouter();
  const {
    cartItems,
    cartCount,
    cartTotal,
    cartBasicTotal,
    removeFromCart,
    removeCartGroup,
    updateQuantity,
    addToCart,
    clearCart,
    couponPricingMode,
    setCouponPricingMode,
  } = useCartWishlist();

  const [successOpen, setSuccessOpen] = useState(false);
  const [orderedItems, setOrderedItems] = useState(cartItems);
  const [orderedTotal, setOrderedTotal] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);
  const [couponDiscount, setCouponDiscount] = useState(0);
  const [freeDispatch, setFreeDispatch] = useState(false);
  const [freeShipping, setFreeShipping] = useState(false);
  const [cartCoupons, setCartCoupons] = useState<CartCouponOption[]>([]);
  const [couponsLoaded, setCouponsLoaded] = useState(false);
  const [couponRevalidateError, setCouponRevalidateError] = useState<string | null>(null);
  const [comboMeta, setComboMeta] = useState({
    suggestion: null as string | null,
    minimumOrderInclGst: 25_000,
    minimumOrderMet: true,
    comboSavingsInclGst: 0,
  });

  const gstTotal = cartTotal - cartBasicTotal;
  const finalTotal = Math.max(0, cartTotal - couponDiscount);

  const cartGroups = useMemo(() => groupCartItemsByProductLine(cartItems), [cartItems]);

  const runCouponValidate = useCallback(
    async (code: string) => {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, lines: cartLinesForCouponApi(cartItems) }),
      });
      let j: CouponValidateResponseJson = {};
      try {
        j = (await res.json()) as CouponValidateResponseJson;
      } catch {
        j = {};
      }
      if (!res.ok) {
        return {
          ok: false as const,
          message: j.message ?? j.reason ?? "Could not validate coupon",
        };
      }
      if (!j.valid) {
        return {
          ok: false as const,
          message: j.reason ?? j.message ?? "Coupon not applicable",
        };
      }
      setCouponDiscount(Number(j.discountAmount) || 0);
      setFreeDispatch(Boolean(j.freeDispatch));
      setFreeShipping(Boolean(j.freeShipping));
      return { ok: true as const };
    },
    [cartItems]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/coupons?cart=1", { cache: "no-store" });
        const json = (await res.json()) as { data?: PublicCouponBannerJson[] };
        if (cancelled) return;
        if (res.ok && Array.isArray(json.data)) {
          setCartCoupons(json.data.map(mapPublicCouponToOption));
        }
      } catch {
        /* keep empty */
      } finally {
        if (!cancelled) setCouponsLoaded(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (cartItems.length > 0) return;
    queueMicrotask(() => {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setFreeDispatch(false);
      setFreeShipping(false);
      setCouponRevalidateError(null);
      setCouponPricingMode("combo_first");
    });
  }, [cartItems.length, setCouponPricingMode]);

  useEffect(() => {
    if (!appliedCoupon || cartItems.length === 0) return;
    let cancelled = false;
    (async () => {
      const r = await runCouponValidate(appliedCoupon);
      if (cancelled) return;
      if (!r.ok) {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setFreeDispatch(false);
        setFreeShipping(false);
        setCouponRevalidateError(r.message);
      } else {
        setCouponRevalidateError(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartItems, appliedCoupon, runCouponValidate]);

  const handleCouponChange = useCallback(
    async (code: string | null): Promise<CouponApplyResult> => {
      setCouponRevalidateError(null);
      if (!code) {
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setFreeDispatch(false);
        setFreeShipping(false);
        setCouponPricingMode("combo_first");
        return { ok: true };
      }
      const r = await runCouponValidate(code);
      if (!r.ok) return { ok: false, message: r.message };
      setAppliedCoupon(code);
      return { ok: true };
    },
    [runCouponValidate, setCouponPricingMode]
  );

  const handlePlaceOrder = () => {
    setOrderedItems([...cartItems]);
    setOrderedTotal(finalTotal);
    setSuccessOpen(true);
  };

  const handleContinue = () => {
    clearCart();
    setSuccessOpen(false);
    router.push('/');
  };

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumbBar}>
        <div className={styles.breadcrumbInner}>
          <Link href="/" className={styles.bcLink}>Home</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className={styles.bcCurrent}>My Cart</span>
        </div>
      </div>

      <div className={styles.inner}>
        {/* ── Page title ── */}
        <div className={styles.pageHeader}>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>My Cart</h1>
          </div>
          {cartCount > 0 && (
            <button className={styles.clearBtn} onClick={clearCart}>
              Clear all
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          /* ── Empty state ── */
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Your cart is empty</h2>
            <p className={styles.emptyText}>Browse our catalogue and add products to your order.</p>
            <Link href="/" className={styles.shopBtn}>
              Browse Products
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        ) : (
          /* ── Cart layout ── */
          <div className={styles.layout}>
            <ComboCartPricingSync onMeta={setComboMeta} />
            {/* Left: Items list */}
            <div className={styles.itemsCol}>
              <div className={styles.itemsHeader}>
                <h2 className={styles.itemsTitle}>Products</h2>
                <span className={styles.itemsSubtitle}>
                  {cartGroups.length} product{cartGroups.length !== 1 ? "s" : ""}
                </span>
              </div>

              <div className={styles.itemsList}>
                {cartGroups.map((lines) => (
                  <CartItemCard
                    key={cartGroupKey(lines[0])}
                    lines={lines}
                    removeFromCart={removeFromCart}
                    removeCartGroup={removeCartGroup}
                    updateQuantity={updateQuantity}
                    addToCart={addToCart}
                  />
                ))}
              </div>

              {/* Policy info bar */}
              <div className={styles.policyBar}>
                <div className={styles.policyItem}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  100% Advance Payment
                </div>
                <div className={styles.policyItem}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <path d="M16 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  Buyer Arranges Transport
                </div>

                <div
                  className={`${styles.policyItem} ${cartTotal >= comboMeta.minimumOrderInclGst ? styles.policyItemOk : styles.policyItemWarn}`}
                >
                  {cartTotal >= comboMeta.minimumOrderInclGst ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  {cartTotal >= comboMeta.minimumOrderInclGst
                    ? `Minimum order ₹${comboMeta.minimumOrderInclGst.toLocaleString("en-IN")} met`
                    : `Min. order ₹${comboMeta.minimumOrderInclGst.toLocaleString("en-IN")} · Add ₹${(comboMeta.minimumOrderInclGst - cartTotal).toFixed(0)} more`}
                </div>
              </div>
            </div>

            {/* Right: Order summary */}
            <div className={styles.summaryCol}>
              <OrderSummary
                basicTotal={cartBasicTotal}
                gstTotal={gstTotal}
                grandTotal={cartTotal}
                minimumOrderInclGst={comboMeta.minimumOrderInclGst}
                itemCount={cartGroups.length}
                items={cartItems}
                cartCoupons={cartCoupons}
                couponsLoaded={couponsLoaded}
                appliedCoupon={appliedCoupon}
                couponDiscount={couponDiscount}
                finalTotal={finalTotal}
                freeDispatch={freeDispatch}
                freeShipping={freeShipping}
                couponBannerError={couponRevalidateError}
                onCouponChange={handleCouponChange}
                onPlaceOrder={handlePlaceOrder}
                comboSuggestion={comboMeta.suggestion}
                comboSavingsInclGst={comboMeta.comboSavingsInclGst}
                couponPricingMode={couponPricingMode}
                onCouponPricingModeChange={setCouponPricingMode}
              />
            </div>
          </div>
        )}
      </div>

      <OrderSuccessPopup
        isOpen={successOpen}
        items={orderedItems}
        total={orderedTotal}
        onClose={() => setSuccessOpen(false)}
        onContinue={handleContinue}
      />
    </div>
  );
}
