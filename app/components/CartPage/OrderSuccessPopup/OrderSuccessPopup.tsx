"use client";

import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import styles from './OrderSuccessPopup.module.css';
import { CartItem } from '../../../context/CartWishlistContext';

interface OrderSuccessPopupProps {
  isOpen: boolean;
  items: CartItem[];
  total: number;
  onClose: () => void;
  onContinue: () => void;
}

export default function OrderSuccessPopup({
  isOpen,
  items,
  total,
  onClose,
  onContinue,
}: OrderSuccessPopupProps) {
  useEffect(() => {
    if (isOpen) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  if (!isOpen) return null;

  const content = (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Success icon */}
        <div className={styles.iconWrap}>
          <div className={styles.circle}>
            <svg className={styles.check} width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h2 className={styles.title}>Order Request Placed!</h2>
        <p className={styles.subtitle}>
          Your enquiry has been received. Our team will contact you shortly.
        </p>

        {/* Items summary */}
        <div className={styles.summaryBox}>
          <div className={styles.summaryHeader}>
            <span>{items.length} item{items.length !== 1 ? 's' : ''} ordered</span>
            <span className={styles.summaryTotal}>₹{total.toFixed(2)}</span>
          </div>
          <ul className={styles.itemList}>
            {items.slice(0, 3).map((item, i) => (
              <li key={i} className={styles.itemRow}>
                <span className={styles.itemName}>{item.productName}</span>
                <span className={styles.itemMeta}>{item.size} × {item.quantity}</span>
                <span className={styles.itemPrice}>₹{(Number(item.pricePerUnit || 0) * Number(item.quantity || 1)).toFixed(2)}</span>
              </li>
            ))}
            {items.length > 3 && (
              <li className={styles.moreItems}>+{items.length - 3} more items</li>
            )}
          </ul>
        </div>

        <p className={styles.paymentNote}>
          100% advance payment · Prices effective 01-04-2026
        </p>

        {/* Button */}
        <div className={styles.actions}>
          <button className={styles.continueBtn} onClick={onContinue}>
            Continue Shopping
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(content, document.body) : null;
}
