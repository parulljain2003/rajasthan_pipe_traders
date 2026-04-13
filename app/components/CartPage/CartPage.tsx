"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
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
  type ProductPackagingForCoupon,
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
  const [cartCoupons, setCartCoupons] = useState<CartCouponOption[]>([]);
  const [couponsLoaded, setCouponsLoaded] = useState(false);
  const [couponRevalidateError, setCouponRevalidateError] = useState<string | null>(null);
  const [userOptedOutCoupon, setUserOptedOutCoupon] = useState(false);
  const [autoCouponBusy, setAutoCouponBusy] = useState(false);
  /** Per cart line: Mongo packaging context for coupon tier math (carton/box/bag → packets). */
  const [couponPackagingByLine, setCouponPackagingByLine] = useState<
    (ProductPackagingForCoupon | null)[] | null
  >(null);
  const [comboMeta, setComboMeta] = useState({
    suggestion: null as string | null,
    minimumOrderInclGst: 25_000,
    minimumOrderMet: true,
    comboSavingsInclGst: 0,
  });

  const gstTotal = cartTotal - cartBasicTotal;
  const finalTotal = Math.max(0, cartTotal - couponDiscount);

  const cartGroups = useMemo(() => groupCartItemsByProductLine(cartItems), [cartItems]);

  const cartSignature = useMemo(
    () =>
      cartItems
        .map(
          (ci) =>
            `${ci.productId}:${ci.size}:${ci.sellerId}:${ci.quantity}:${ci.orderMode ?? "packets"}`
        )
        .join("|"),
    [cartItems]
  );

  useEffect(() => {
    setUserOptedOutCoupon(false);
  }, [cartSignature]);

  const couponCodesKey = useMemo(() => cartCoupons.map((c) => c.code).join(","), [cartCoupons]);

  const packagingForCouponApi = useMemo(() => {
    if (
      couponPackagingByLine &&
      couponPackagingByLine.length === cartItems.length
    ) {
      return couponPackagingByLine;
    }
    return undefined;
  }, [couponPackagingByLine, cartItems.length]);

  useEffect(() => {
    if (cartItems.length === 0) {
      setCouponPackagingByLine(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/cart/coupon-packaging", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lines: cartItems.map((ci) => ({
              productMongoId: ci.mongoProductId,
              legacyProductId: ci.productId,
              size: ci.size,
              sellerId: ci.sellerId,
            })),
          }),
        });
        const json = (await res.json()) as { data?: (ProductPackagingForCoupon | null)[] };
        if (cancelled) return;
        if (res.ok && Array.isArray(json.data) && json.data.length === cartItems.length) {
          setCouponPackagingByLine(json.data);
        } else {
          setCouponPackagingByLine(null);
        }
      } catch {
        if (!cancelled) setCouponPackagingByLine(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cartItems]);

  const validateCouponApi = useCallback(
    async (
      code: string
    ): Promise<
      | { ok: true; discountAmount: number }
      | { ok: false; message: string }
    > => {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code,
          lines: cartLinesForCouponApi(cartItems, packagingForCouponApi),
        }),
      });
      let j: CouponValidateResponseJson = {};
      try {
        j = (await res.json()) as CouponValidateResponseJson;
      } catch {
        j = {};
      }
      if (!res.ok) {
        return {
          ok: false,
          message: j.message ?? j.reason ?? "Could not validate coupon",
        };
      }
      if (!j.valid) {
        return {
          ok: false,
          message: j.reason ?? j.message ?? "Coupon not applicable",
        };
      }
      return { ok: true, discountAmount: Number(j.discountAmount) || 0 };
    },
    [cartItems, packagingForCouponApi]
  );

  const autoRunRef = useRef(0);

  useEffect(() => {
    if (cartItems.length === 0) {
      setAppliedCoupon(null);
      setCouponDiscount(0);
      setAutoCouponBusy(false);
      setCouponRevalidateError(null);
      return;
    }
    if (!couponsLoaded || cartCoupons.length === 0) return;
    if (userOptedOutCoupon) return;

    const runId = ++autoRunRef.current;
    setAutoCouponBusy(true);
    setCouponRevalidateError(null);

    void (async () => {
      try {
        const results = await Promise.all(
          cartCoupons.map(async (c) => {
            const r = await validateCouponApi(c.code);
            return { code: c.code, r };
          })
        );
        if (runId !== autoRunRef.current) return;

        let best: { code: string; discount: number } | null = null;
        for (const { code, r } of results) {
          if (r.ok && r.discountAmount > 0) {
            if (!best || r.discountAmount > best.discount) {
              best = { code, discount: r.discountAmount };
            }
          }
        }

        if (best) {
          setAppliedCoupon(best.code);
          setCouponDiscount(best.discount);
        } else {
          setAppliedCoupon(null);
          setCouponDiscount(0);
        }
      } finally {
        if (runId === autoRunRef.current) {
          setAutoCouponBusy(false);
        }
      }
    })();
  }, [
    cartItems.length,
    cartSignature,
    couponsLoaded,
    couponCodesKey,
    packagingForCouponApi,
    userOptedOutCoupon,
    validateCouponApi,
    cartCoupons,
  ]);

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
      setCouponRevalidateError(null);
      setCouponPricingMode("combo_first");
      setUserOptedOutCoupon(false);
    });
  }, [cartItems.length, setCouponPricingMode]);

  const handleCouponChange = useCallback(
    async (code: string | null): Promise<CouponApplyResult> => {
      setCouponRevalidateError(null);
      if (!code) {
        setUserOptedOutCoupon(true);
        setAppliedCoupon(null);
        setCouponDiscount(0);
        setCouponPricingMode("combo_first");
        return { ok: true };
      }
      const r = await validateCouponApi(code);
      if (!r.ok) return { ok: false, message: r.message };
      setAppliedCoupon(code);
      setCouponDiscount(r.discountAmount);
      setUserOptedOutCoupon(false);
      return { ok: true };
    },
    [validateCouponApi, setCouponPricingMode]
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
                autoCouponBusy={autoCouponBusy}
                userOptedOutCoupon={userOptedOutCoupon}
                appliedCoupon={appliedCoupon}
                couponDiscount={couponDiscount}
                finalTotal={finalTotal}
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
