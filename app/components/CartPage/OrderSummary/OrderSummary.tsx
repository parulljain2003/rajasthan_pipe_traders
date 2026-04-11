"use client";

import React, { useState } from "react";
import styles from "./OrderSummary.module.css";
import { CartItem } from "../../../context/CartWishlistContext";
import { normalizeOrderMode, pricedPacketCount, totalPiecesForLine } from "@/lib/cart/packetLine";
import { groupCartItemsByProductLine, cartGroupKey } from "@/lib/cart/groupCartLines";
import { resolvePackingLabelsForCartLine } from "@/lib/packingLabels";
import { productHeading } from "../../../lib/productHeading";
import type { CartCouponOption, CouponApplyResult } from "../cartCoupons";

function formatPieces(n: number) {
  return n.toLocaleString("en-IN");
}

interface OrderSummaryProps {
  basicTotal: number;
  gstTotal: number;
  grandTotal: number;
  itemCount: number;
  items: CartItem[];
  cartCoupons: CartCouponOption[];
  /** False until first fetch to `/api/coupons?cart=1` completes */
  couponsLoaded: boolean;
  appliedCoupon: string | null;
  couponDiscount: number;
  finalTotal: number;
  freeDispatch: boolean;
  freeShipping: boolean;
  /** Shown when cart changed and the previously applied coupon was cleared */
  couponBannerError: string | null;
  onCouponChange: (code: string | null) => Promise<CouponApplyResult>;
  onPlaceOrder: () => void;
}

export default function OrderSummary({
  basicTotal,
  gstTotal,
  itemCount,
  items,
  cartCoupons,
  couponsLoaded,
  appliedCoupon,
  couponDiscount,
  finalTotal,
  freeDispatch,
  freeShipping,
  couponBannerError,
  onCouponChange,
  onPlaceOrder,
}: OrderSummaryProps) {
  const [applyError, setApplyError] = useState<string | null>(null);
  const [manualCode, setManualCode] = useState("");
  const [applyingCode, setApplyingCode] = useState<string | null>(null);

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
                  {couponMeta
                    ? `${couponMeta.discount}${couponMeta.label ? ` ${couponMeta.label}` : ""} · ${couponMeta.condition}${
                        couponMeta.offerAppliesTo ? ` · ${couponMeta.offerAppliesTo}` : ""
                      }`
                    : "Benefit applied to this order"}
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
          <>
            {!couponsLoaded ? (
              <p className={styles.couponsLoading}>Loading available offers…</p>
            ) : cartCoupons.length > 0 ? (
              <div className={styles.availableOffers}>
                <h4 className={styles.availableOffersTitle}>Available coupons</h4>
                <p className={styles.availableOffersHint}>Tap Apply — we&apos;ll check it against your cart.</p>
                <ul className={styles.availableOffersList} role="list">
                  {cartCoupons.map((c) => (
                    <li key={c.code} className={styles.couponCardRowWrap}>
                      <div
                        className={styles.couponCardRow}
                        style={{ "--coupon-color": c.color } as React.CSSProperties}
                      >
                        <div className={styles.couponCardStrip} aria-hidden />
                        <div className={styles.couponCardBody}>
                          <div className={styles.couponCardTop}>
                            <span className={styles.couponCardCode}>{c.code}</span>
                            <span className={styles.couponCardDiscount}>
                              {c.discount}
                              {c.label ? <span className={styles.couponCardLabel}>{c.label}</span> : null}
                            </span>
                          </div>
                          <span className={styles.couponCardCondition}>{c.condition}</span>
                          {c.offerAppliesTo ? (
                            <span className={styles.couponCardOfferScope}>{c.offerAppliesTo}</span>
                          ) : null}
                          {c.desc ? <span className={styles.couponCardDesc}>{c.desc}</span> : null}
                        </div>
                        <button
                          type="button"
                          className={styles.couponCardApplyBtn}
                          disabled={applyingCode !== null}
                          onClick={() => {
                            void (async () => {
                              setApplyError(null);
                              setApplyingCode(c.code);
                              try {
                                const res = await onCouponChange(c.code);
                                if (res.ok) setManualCode("");
                                else setApplyError(res.message);
                              } finally {
                                setApplyingCode(null);
                              }
                            })();
                          }}
                        >
                          {applyingCode === c.code ? "Applying…" : "Apply"}
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className={styles.couponListEmpty}>No featured coupons right now — enter a code below if you have one.</p>
            )}

            <div className={styles.manualCodeBlock}>
              <span className={styles.manualCodeLabel}>Have a coupon code?</span>
              <div className={styles.couponManualRow}>
                <input
                  type="text"
                  className={styles.couponManualInput}
                  placeholder="Enter code"
                  value={manualCode}
                  onChange={(e) => setManualCode(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      const code = manualCode.trim().toUpperCase();
                      if (!code) return;
                      void (async () => {
                        setApplyError(null);
                        setApplyingCode(code);
                        try {
                          const res = await onCouponChange(code);
                          if (res.ok) setManualCode("");
                          else setApplyError(res.message);
                        } finally {
                          setApplyingCode(null);
                        }
                      })();
                    }
                  }}
                  autoCapitalize="characters"
                  autoComplete="off"
                  spellCheck={false}
                  aria-label="Coupon code"
                />
                <button
                  type="button"
                  className={styles.couponManualApply}
                  disabled={applyingCode !== null}
                  onClick={() => {
                    const code = manualCode.trim().toUpperCase();
                    if (!code) {
                      setApplyError("Enter a coupon code");
                      return;
                    }
                    void (async () => {
                      setApplyError(null);
                      setApplyingCode(code);
                      try {
                        const res = await onCouponChange(code);
                        if (res.ok) setManualCode("");
                        else setApplyError(res.message);
                      } finally {
                        setApplyingCode(null);
                      }
                    })();
                  }}
                >
                  {applyingCode !== null &&
                  manualCode.trim().toUpperCase() !== "" &&
                  manualCode.trim().toUpperCase() === applyingCode
                    ? "Applying…"
                    : "Apply"}
                </button>
              </div>
            </div>
          </>
        )}

        {applyError && (
          <div className={styles.couponApplyErr} role="alert">
            {applyError}
          </div>
        )}
      </div>

      {items.length > 0 && (
        <div className={styles.productList}>
          {groupCartItemsByProductLine(items).map((lines) => {
            const first = lines[0];
            const labels = resolvePackingLabelsForCartLine(first);
            const rowTotal = lines.reduce(
              (s, l) => s + (Number(l.pricePerUnit) || 0) * pricedPacketCount(l),
              0
            );
            const metaLines = lines.map((l) => {
              const pk = pricedPacketCount(l);
              const pc = totalPiecesForLine(l);
              if (normalizeOrderMode(l.orderMode) === "master_bag") {
                const bq = Number(l.quantity) || 0;
                const outerWord = bq === 1 ? labels.outer : labels.outerPlural;
                return `${bq} ${outerWord} → ${pk} ${labels.innerPlural} (${formatPieces(pc)} pc)`;
              }
              return `${pk} ${labels.innerPlural} (${formatPieces(pc)} pc)`;
            });
            return (
              <div key={cartGroupKey(first)} className={styles.productRow}>
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{productHeading(first.productName, first.size)}</span>
                  <div className={styles.productMeta}>
                    {metaLines.map((line, i) => (
                      <span key={i} className={styles.productMetaLine}>
                        {line}
                      </span>
                    ))}
                  </div>
                </div>
                <span className={styles.productTotal}>₹{rowTotal.toFixed(0)}</span>
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
      {freeShipping && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Shipping</span>
          <span className={styles.freeTag}>FREE</span>
        </div>
      )}

      <div className={styles.divider} />

      <div className={`${styles.row} ${styles.totalRow}`}>
        <span className={styles.totalLabel}>Grand Total (incl. GST)</span>
        <span className={styles.totalVal}>₹{finalTotal.toFixed(2)}</span>
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
