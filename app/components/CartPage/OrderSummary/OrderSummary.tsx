"use client";

import React, { useState } from 'react';
import styles from './OrderSummary.module.css';
import { CartItem } from '../../../context/CartWishlistContext';
import { productHeading } from '../../../lib/productHeading';

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
                  <span className={styles.productName}>{productHeading(item.productName, item.size)}</span>
                  <span className={styles.productMeta}>
                    {safeQty} pkt{safeQty !== 1 ? 's' : ''}
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
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
