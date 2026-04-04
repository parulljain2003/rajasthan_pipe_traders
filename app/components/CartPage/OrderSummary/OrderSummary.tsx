"use client";

import React, { useState } from 'react';
import styles from './OrderSummary.module.css';
import { CartItem } from '../../../context/CartWishlistContext';

interface OrderSummaryProps {
  basicTotal: number;
  gstTotal: number;
  grandTotal: number;
  itemCount: number;
  items: CartItem[];
  onPlaceOrder: () => void;
}

export default function OrderSummary({
  basicTotal,
  gstTotal,
  grandTotal,
  itemCount,
  items,
  onPlaceOrder,
}: OrderSummaryProps) {
  const minOrderMet = grandTotal >= 25000;
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

      {/* Product list */}
      {items.length > 0 && (
        <div className={styles.productList}>
          {items.map(item => {
            const safeQty   = Number(item.quantity)        || 1;
            const safePrice = Number(item.pricePerUnit)    || 0;
            const lineTotal = safePrice * safeQty;
            return (
              <div key={`${item.productId}-${item.size}`} className={styles.productRow}>
                <div className={styles.productInfo}>
                  <span className={styles.productName}>{item.productName}</span>
                  <span className={styles.productMeta}>
                    {item.size} · {safeQty} pkt{safeQty !== 1 ? 's' : ''}
                  </span>
                </div>
                <span className={styles.productTotal}>₹{lineTotal.toFixed(0)}</span>
              </div>
            );
          })}
        </div>
      )}

      <div className={styles.divider} />

      {/* Price breakdown */}
      <div className={styles.row}>
        <span className={styles.rowLabel}>Items</span>
        <span className={styles.rowVal}>{itemCount} product{itemCount !== 1 ? 's' : ''}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>Basic price (ex-GST)</span>
        <span className={styles.rowVal}>₹{basicTotal.toFixed(2)}</span>
      </div>
      <div className={styles.row}>
        <span className={styles.rowLabel}>GST amount</span>
        <span className={styles.rowVal}>₹{gstTotal.toFixed(2)}</span>
      </div>

      <div className={styles.divider} />

      {/* Grand total */}
      <div className={`${styles.row} ${styles.totalRow}`}>
        <span className={styles.totalLabel}>Grand Total (incl. GST)</span>
        <span className={styles.totalVal}>₹{grandTotal.toFixed(2)}</span>
      </div>

      {/* Min order notice */}
      <div className={`${styles.notice} ${minOrderMet ? styles.noticeGreen : styles.noticeAmber}`}>
        {minOrderMet ? (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            Minimum order of ₹25,000 met
          </>
        ) : (
          <>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
            Min. order ₹25,000 · Add ₹{(25000 - grandTotal).toFixed(0)} more
          </>
        )}
      </div>

      {/* Min order error */}
      {showMinError && (
        <div className={styles.minOrderError}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="8" x2="12" y2="12" />
            <line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
          Order total must be ₹25,000 or more. Add ₹{(25000 - grandTotal).toFixed(0)} more to place order.
        </div>
      )}

      {/* Place order button */}
      <button
        className={styles.placeOrderBtn}
        onClick={handlePlaceOrder}
        disabled={itemCount === 0}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M20 12V22H4V12" />
          <path d="M22 7H2v5h20V7z" />
          <path d="M12 22V7" />
          <path d="M12 7H7.5a2.5 2.5 0 0 1 0-5C11 2 12 7 12 7z" />
          <path d="M12 7h4.5a2.5 2.5 0 0 0 0-5C13 2 12 7 12 7z" />
        </svg>
        Place Order Request
      </button>

      <p className={styles.terms}>
        100% advance payment · Subject to Ahmedabad jurisdiction · Prices may change without notice
      </p>
    </div>
  );
}
