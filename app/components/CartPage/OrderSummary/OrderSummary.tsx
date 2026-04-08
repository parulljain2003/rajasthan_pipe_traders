"use client";

import React, { useState } from "react";
import styles from "./OrderSummary.module.css";
import { CartItem } from "../../../context/CartWishlistContext";
import { productHeading } from "../../../lib/productHeading";
import type { CartCouponOption, CouponApplyResult } from "../cartCoupons";

interface OrderSummaryProps {
  basicTotal: number;
  gstTotal: number;
  grandTotal: number;
  itemCount: number;
  items: CartItem[];
  cartCoupons: CartCouponOption[];
  appliedCoupon: string | null;
  couponDiscount: number;
  finalTotal: number;
  freeDispatch: boolean;
  /** Shown when cart changed and the previously applied coupon was cleared */
  couponBannerError: string | null;
  onCouponChange: (code: string | null) => Promise<CouponApplyResult>;
  onPlaceOrder: () => void;
}

export default function OrderSummary({
  basicTotal,
  gstTotal,
  grandTotal,
  itemCount,
  items,
  cartCoupons,
  appliedCoupon,
  couponDiscount,
  finalTotal,
  freeDispatch,
  couponBannerError,
  onCouponChange,
  onPlaceOrder,
}: OrderSummaryProps) {
  const [couponOpen, setCouponOpen] = useState(false);
  const [applyError, setApplyError] = useState<string | null>(null);

  const couponMeta = appliedCoupon ? cartCoupons.find((c) => c.code === appliedCoupon) ?? null : null;

  const minOrderMet = finalTotal >= 25000;
  const [showMinError, setShowMinError] = useState(false);

  const handlePlaceOrder = () => {
    if (!minOrderMet) {
      setShowMinError(true);
      setTimeout(() => setShowMinError(false), 4000);
      return;
    }
    setShowMinError(false);
    onPlaceOrder();
  };

  return (
    <div className={styles.summary}>
      <h3 className={styles.title}>Order Summary</h3>

      {items.length > 0 && (
        <div className={styles.productList}>
          {items.map((item) => {
            const safeQty = Number(item.quantity) || 1;
            const safePrice = Number(item.pricePerUnit) || 0;
            const lineTotal = safePrice * safeQty;
            return (
              <div key={`${item.productId}-${item.size}`} className={styles.productRow}>
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{productHeading(item.productName, item.size)}</span>
                  <span className={styles.productMeta}>
                    {safeQty} pc{safeQty !== 1 ? "s" : ""}
                  </span>
                </div>
                <span className={styles.productTotal}>₹{lineTotal.toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.divider} />

      <div className={styles.row}>
        <span className={styles.rowLabel}>Items</span>
        <span className={styles.rowVal}>
          {itemCount} product{itemCount !== 1 ? "s" : ""}
        </span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Basic price (ex-GST)</span>
        <span className={styles.rowVal}>₹{basicTotal.toFixed(2)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>GST amount</span>
        <span className={styles.rowVal}>₹{gstTotal.toFixed(2)}</span>
      </div>

      {couponDiscount > 0 && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Coupon Discount ({couponMeta?.code ?? appliedCoupon})</span>
          <span className={styles.discountVal}>−₹{couponDiscount.toFixed(0)}</span>
        </div>
      )}
      {freeDispatch && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Dispatch</span>
          <span className={styles.freeTag}>FREE</span>
        </div>
      )}

      <div className={styles.divider} />

      <div className={`${styles.row} ${styles.totalRow}`}>
        <span className={styles.totalLabel}>Grand Total (incl. GST)</span>
        <span className={styles.totalVal}>₹{finalTotal.toFixed(2)}</span>
      </div>

      <div className={styles.couponSection}>
        {couponBannerError && (
          <div className={styles.couponBannerErr} role="status">
            {couponBannerError}
          </div>
        )}
        {appliedCoupon ? (
          <div className={styles.appliedCoupon}>
            <div className={styles.appliedLeft}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <polyline points="20 6 9 17 4 12" />
              </svg>
              <div>
                <span className={styles.appliedCode}>{appliedCoupon}</span>
                <span className={styles.appliedDesc}>
                  {couponMeta?.discount ?? "—"} · {couponMeta?.condition ?? ""}
                </span>
              </div>
            </div>
            <button
              className={styles.removeBtn}
              onClick={() => {
                void onCouponChange(null);
                setApplyError(null);
              }}
              aria-label="Remove coupon"
            >
              Remove
            </button>
          </div>
        ) : (
          <button className={styles.couponToggle} onClick={() => setCouponOpen((o) => !o)}>
            <div className={styles.couponToggleLeft}>
              <svg
                width="15"
                height="15"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
                <line x1="7" y1="7" x2="7.01" y2="7" />
              </svg>
              <span>Apply Coupon</span>
            </div>
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              style={{ transform: couponOpen ? "rotate(180deg)" : "none", transition: "transform 0.2s" }}
            >
              <path d="m6 9 6 6 6-6" />
            </svg>
          </button>
        )}

        {applyError && (
          <div className={styles.couponApplyErr} role="alert">
            {applyError}
          </div>
        )}

        {couponOpen && !appliedCoupon && (
          <div className={styles.couponList}>
            {cartCoupons.length === 0 ? (
              <p className={styles.couponListEmpty}>No coupons available right now.</p>
            ) : (
              cartCoupons.map((c) => (
                <button
                  key={c.code}
                  type="button"
                  className={styles.couponCard}
                  style={{ "--coupon-color": c.color } as React.CSSProperties}
                  onClick={() => {
                    void (async () => {
                      setApplyError(null);
                      const res = await onCouponChange(c.code);
                      if (res.ok) setCouponOpen(false);
                      else setApplyError(res.message);
                    })();
                  }}
                >
                  <div className={styles.couponCardStrip} />
                  <div className={styles.couponCardBody}>
                    <div className={styles.couponCardTop}>
                      <span className={styles.couponCardCode}>{c.code}</span>
                      <span className={styles.couponCardDiscount}>{c.discount}</span>
                    </div>
                    <span className={styles.couponCardCondition}>{c.condition}</span>
                    <span className={styles.couponCardDesc}>{c.desc}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {showMinError && (
        <div className={styles.minOrderError}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Order total must be ₹25,000 or more. Add ₹{(25000 - finalTotal).toFixed(0)} more to place order.
        </div>
      )}

      <button className={styles.placeOrderBtn} onClick={handlePlaceOrder} disabled={itemCount === 0}>
        <svg
          width="18"
          height="18"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="9" cy="21" r="1" />
          <circle cx="20" cy="21" r="1" />
          <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6" />
        </svg>
        Place Order Request
      </button>

      <p className={styles.terms}>
        100% advance payment · Subject to Ahmedabad jurisdiction · Prices may change without notice
      </p>
    </div>
  );
}
