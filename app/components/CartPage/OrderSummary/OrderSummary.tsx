"use client";

import React, { useState } from "react";
import styles from "./OrderSummary.module.css";
import { CartItem, type CartCouponPricingMode } from "../../../context/CartWishlistContext";
import { normalizeOrderMode, pricedPacketCount, totalPiecesForLine } from "@/lib/cart/packetLine";
import { groupCartItemsByProductLine, cartGroupKey } from "@/lib/cart/groupCartLines";
import { resolvePackingLabelsForCartLine } from "@/lib/packingLabels";
import { productHeading } from "../../../lib/productHeading";
import type { CartCouponOption, CouponApplyResult } from "../cartCoupons";

function formatPieces(n: number) {
  return n.toLocaleString("en-IN");
}

function truncateOfferText(text: string, maxChars: number): string {
  const t = text.trim();
  if (t.length <= maxChars) return t;
  return `${t.slice(0, maxChars - 1).trim()}…`;
}

interface OrderSummaryProps {
  basicTotal: number;
  gstTotal: number;
  grandTotal: number;
  /** Minimum order including GST (from admin / app settings) */
  minimumOrderInclGst: number;
  itemCount: number;
  items: CartItem[];
  cartCoupons: CartCouponOption[];
  /** False until first fetch to `/api/coupons?cart=1` completes */
  couponsLoaded: boolean;
  /** Best-offer validation in progress */
  autoCouponBusy: boolean;
  /** User removed auto-applied offer; stays until cart lines change */
  userOptedOutCoupon: boolean;
  appliedCoupon: string | null;
  couponDiscount: number;
  finalTotal: number;
  /** Shown when cart changed and the previously applied coupon was cleared */
  couponBannerError: string | null;
  onCouponChange: (code: string | null) => Promise<CouponApplyResult>;
  onPlaceOrder: () => void;
  /** RPT combo hint from pricing engine */
  comboSuggestion: string | null;
  /** Estimated savings from RPT combo net rates vs list (incl. GST) */
  comboSavingsInclGst: number;
  couponPricingMode: CartCouponPricingMode;
  onCouponPricingModeChange: (mode: CartCouponPricingMode) => void;
}

export default function OrderSummary({
  basicTotal,
  gstTotal,
  minimumOrderInclGst,
  itemCount,
  items,
  cartCoupons,
  couponsLoaded,
  autoCouponBusy,
  userOptedOutCoupon,
  appliedCoupon,
  couponDiscount,
  finalTotal,
  couponBannerError,
  onCouponChange,
  onPlaceOrder,
  comboSuggestion,
  comboSavingsInclGst,
  couponPricingMode,
  onCouponPricingModeChange,
}: OrderSummaryProps) {
  const couponMeta = appliedCoupon ? cartCoupons.find((c) => c.code === appliedCoupon) ?? null : null;

  const minOrderMet = finalTotal >= minimumOrderInclGst;
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

      {comboSuggestion ? (
        <div className={styles.comboHint} role="status">
          {comboSuggestion}
        </div>
      ) : null}

      <div className={styles.couponSection}>
        {couponBannerError && (
          <div className={styles.couponBannerErr} role="status">
            {couponBannerError}
          </div>
        )}

        {autoCouponBusy && !appliedCoupon ? (
          <p className={styles.couponsLoading} role="status">
            Checking offers…
          </p>
        ) : null}

        {appliedCoupon && couponMeta && couponDiscount > 0 ? (
          <div className={styles.offerCard} role="status">
            <div className={styles.offerCardHeader}>
              <span className={styles.offerBadge}>Offer applied</span>
              <span className={styles.offerSaving}>−₹{couponDiscount.toFixed(0)}</span>
            </div>
            <p className={styles.offerTitle}>{couponMeta.condition}</p>
            <p className={styles.offerDesc}>
              {truncateOfferText(couponMeta.desc || `${couponMeta.discount} ${couponMeta.label}`.trim(), 220)}
            </p>
            <p className={styles.offerCodeLine}>
              Code <strong>{appliedCoupon}</strong>
            </p>
            <button
              type="button"
              className={styles.removeOfferBtn}
              onClick={() => {
                void onCouponChange(null);
              }}
            >
              Remove offer
            </button>
          </div>
        ) : null}

        {appliedCoupon && comboSavingsInclGst > 0 && couponPricingMode === "combo_first" ? (
          <p className={styles.couponComboDisclaimer} role="note">
            Note: Coupon discounts apply only to non-combo items. Combo-priced lines stay at net list rates.
          </p>
        ) : null}

        {appliedCoupon && (comboSavingsInclGst > 0 || couponPricingMode === "list_for_full_coupon") ? (
          <label className={styles.pricingModeToggle}>
            <input
              type="checkbox"
              checked={couponPricingMode === "list_for_full_coupon"}
              onChange={(e) =>
                onCouponPricingModeChange(e.target.checked ? "list_for_full_coupon" : "combo_first")
              }
            />
            <span>
              Use list prices on combo clips (20/25MM) so the coupon can apply to those lines too. You can’t
              combine net combo rates and a coupon on the same items — pick the option that totals lower.
            </span>
          </label>
        ) : null}

        {!appliedCoupon && userOptedOutCoupon && couponsLoaded && !autoCouponBusy ? (
          <p className={styles.offerMuted} role="note">
            Offer removed. Change quantities or items to refresh offers.
          </p>
        ) : null}

        {!appliedCoupon && !userOptedOutCoupon && couponsLoaded && cartCoupons.length > 0 && !autoCouponBusy ? (
          <p className={styles.offerMuted} role="note">
            No volume offer applies to this cart yet — add more packets to unlock discounts.
          </p>
        ) : null}
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

      {comboSavingsInclGst > 0 && couponPricingMode === "combo_first" ? (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Combo savings (est. vs list)</span>
          <span className={styles.savingsHighlight}>−₹{comboSavingsInclGst.toFixed(0)}</span>
        </div>
      ) : null}

      {couponDiscount > 0 && (
        <div className={styles.row}>
          <span className={styles.rowLabel}>Coupon discount (non-combo items only)</span>
          <span className={styles.discountVal}>−₹{couponDiscount.toFixed(0)}</span>
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
          Order total must be ₹{minimumOrderInclGst.toLocaleString("en-IN")} or more. Add ₹
          {(minimumOrderInclGst - finalTotal).toFixed(0)} more to place order.
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
