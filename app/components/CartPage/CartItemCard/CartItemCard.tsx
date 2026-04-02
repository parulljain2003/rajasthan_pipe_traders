"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CartItemCard.module.css';
import { CartItem } from '../../../context/CartWishlistContext';

interface CartItemCardProps {
  item: CartItem;
  onRemove: (productId: number, size: string) => void;
  onUpdateQty: (productId: number, size: string, qty: number) => void;
}

const BRAND_COLORS: Record<string, string> = {
  'Hitech Square / Tejas Craft': '#2563eb',
  'RPT': '#0891b2',
  'N-Star': '#059669',
  'Hitech Square': '#7c3aed',
};

export default function CartItemCard({ item, onRemove, onUpdateQty }: CartItemCardProps) {
  const brandColor = BRAND_COLORS[item.brand] ?? '#2563eb';

  // Guard against undefined/NaN values (e.g. items added before the context upgrade)
  const safePrice = Number(item.pricePerUnit) || 0;
  const safeBasic = Number(item.basicPricePerUnit) || 0;
  const safeQty   = Number(item.quantity) || 1;

  const lineTotal = safePrice * safeQty;
  const lineBasic = safeBasic * safeQty;
  const gstAmount = lineTotal - lineBasic;

  return (
    <div className={styles.card}>
      {/* Image */}
      <Link href={`/products/${item.productSlug}`} className={styles.imageWrap}>
        <Image
          src={item.productImage}
          alt={item.productName}
          fill
          sizes="96px"
          style={{ objectFit: 'contain', padding: '0.5rem' }}
        />
      </Link>

      {/* Info */}
      <div className={styles.info}>
        <div className={styles.topRow}>
          <div className={styles.nameGroup}>
            <span
              className={styles.brand}
              style={{ '--brand-color': brandColor } as React.CSSProperties}
            >
              {item.brand}
            </span>
            <Link href={`/products/${item.productSlug}`} className={styles.name}>
              {item.productName}
            </Link>
            <span className={styles.category}>{item.category}</span>
          </div>
          <button
            className={styles.removeBtn}
            onClick={() => onRemove(item.productId, item.size)}
            aria-label="Remove item"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
              <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
            </svg>
          </button>
        </div>

        {/* Size + Pack info row */}
        <div className={styles.midRow}>
          <div className={styles.sizeWrap}>
            <span className={styles.fieldLabel}>Size</span>
            <span className={styles.sizeStatic}>{item.size}</span>
          </div>

          <div className={styles.packInfo}>
            <span className={styles.fieldLabel}>Pack info</span>
            <span className={styles.packVal}>{item.pcsPerPacket} pcs/pkt · {item.qtyPerBag} pkts/bag</span>
          </div>
        </div>

        {/* Quantity + Price row */}
        <div className={styles.bottomRow}>
          <div className={styles.qtyWrap}>
            <span className={styles.fieldLabel}>Qty (packets)</span>
            <div className={styles.qtyControls}>
              <button
                className={styles.qtyBtn}
                onClick={() => onUpdateQty(item.productId, item.size, item.quantity - 1)}
                disabled={item.quantity <= 1}
                aria-label="Decrease"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
              </button>
              <span className={styles.qtyVal}>{safeQty}</span>
              <button
                className={styles.qtyBtn}
                onClick={() => onUpdateQty(item.productId, item.size, item.quantity + 1)}
                aria-label="Increase"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>

          <div className={styles.priceGroup}>
            <div className={styles.unitPrice}>
              <span className={styles.fieldLabel}>Unit price</span>
              <span className={styles.priceVal}>₹{safePrice.toFixed(2)}</span>
            </div>
            <div className={styles.lineTotal}>
              <span className={styles.fieldLabel}>Total (incl. GST)</span>
              <span className={styles.lineTotalVal}>₹{lineTotal.toFixed(2)}</span>
            </div>
            <span className={styles.gstNote}>GST: ₹{gstAmount.toFixed(2)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
