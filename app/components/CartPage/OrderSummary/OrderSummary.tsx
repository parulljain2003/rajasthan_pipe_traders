import React from 'react';
import styles from './OrderSummary.module.css';

interface OrderSummaryProps {
  basicTotal: number;
  gstTotal: number;
  grandTotal: number;
  itemCount: number;
  onPlaceOrder: () => void;
}

const DISCOUNT_TIERS = [
  { qty: '15 cartons/bags', discount: '7%' },
  { qty: '30 cartons/bags', discount: '8%' },
  { qty: '50 cartons/bags', discount: '9%' },
  { qty: '85 cartons/bags', discount: '12%' },
];

export default function OrderSummary({
  basicTotal,
  gstTotal,
  grandTotal,
  itemCount,
  onPlaceOrder,
}: OrderSummaryProps) {
  const minOrderMet = grandTotal >= 25000;

  return (
    <div className={styles.summary}>
      <h3 className={styles.title}>Order Summary</h3>

      {/* Item count */}
      <div className={styles.row}>
        <span className={styles.rowLabel}>Items</span>
        <span className={styles.rowVal}>{itemCount} product{itemCount !== 1 ? 's' : ''}</span>
      </div>

      <div className={styles.divider} />

      {/* Price breakdown */}
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

      {/* Discount tiers */}
      <div className={styles.discountBox}>
        <p className={styles.discountTitle}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
          Bulk Discounts Available
        </p>
        <ul className={styles.discountList}>
          {DISCOUNT_TIERS.map(tier => (
            <li key={tier.qty} className={styles.discountItem}>
              <span>{tier.qty}</span>
              <span className={styles.discountPct}>{tier.discount} off</span>
            </li>
          ))}
        </ul>
        <p className={styles.discountNote}>2% only on Hitech/Tejas tapes, Ronela accessories & N-Star valves</p>
      </div>

      {/* Place order button */}
      <button
        className={styles.placeOrderBtn}
        onClick={onPlaceOrder}
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
