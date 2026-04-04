"use client";

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CartItemCard.module.css';
import { CartItem } from '../../../context/CartWishlistContext';
import { productHeading, shouldShowBrandBadge } from '../../../lib/productHeading';

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

function formatPieces(n: number) {
  return n.toLocaleString('en-IN');
}

export default function CartItemCard({ item, onRemove, onUpdateQty }: CartItemCardProps) {
  const brandColor = BRAND_COLORS[item.brand] ?? '#2563eb';

  const safePrice = Number(item.pricePerUnit)     || 0;
  const safeBasic = Number(item.basicPricePerUnit) || 0;
  const safeQty   = Number(item.quantity)          || 1;
  const step      = Number(item.pcsPerPacket)      || 1;

  const lineTotal  = safePrice * safeQty;
  const gstAmount  = lineTotal - safeBasic * safeQty;

  const mrpUnit  = safePrice * 1.15;
  const mrpTotal = mrpUnit * safeQty;
  const saving   = mrpTotal - lineTotal;
  const savePct  = mrpUnit > 0 ? Math.round(((mrpUnit - safePrice) / mrpUnit) * 100) : 0;

  const packetCount = step > 0 ? safeQty / step : 0;
  const packetLabel = Number.isInteger(packetCount)
    ? String(packetCount)
    : packetCount.toLocaleString('en-IN', { maximumFractionDigits: 2 });

  const [inputVal, setInputVal] = useState(String(safeQty));

  useEffect(() => {
    setInputVal(String(safeQty));
  }, [safeQty]);

  const commitQty = (raw: string) => {
    const n = parseInt(raw, 10);
    if (!isNaN(n) && n >= 1) {
      onUpdateQty(item.productId, item.size, n);
    } else {
      setInputVal(String(safeQty));
    }
  };

  return (
    <div className={styles.card}>
      <Link href={`/products/${item.productSlug}`} className={styles.imageWrap}>
        <Image
          src={item.productImage}
          alt={item.productName}
          fill
          sizes="96px"
          style={{ objectFit: 'contain', padding: '0.5rem' }}
        />
      </Link>

      {/* Column 1 — product details */}
      <div className={styles.detailsCol}>
        <div className={styles.topRow}>
          <div className={styles.nameGroup}>
            {shouldShowBrandBadge(item.brand) && (
              <span
                className={styles.brand}
                style={{ '--brand-color': brandColor } as React.CSSProperties}
              >
                {item.brand}
              </span>
            )}
            <Link href={`/products/${item.productSlug}`} className={styles.name}>
              {productHeading(item.productName, item.size)}
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

        <div className={styles.detailsQtyWrap}>
          <span className={styles.fieldLabel}>Quantity</span>
          <div className={styles.qtyControls}>
            <div className={styles.qtyControlsInner}>
              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() => onUpdateQty(item.productId, item.size, Math.max(1, safeQty - step))}
                disabled={safeQty <= step}
                aria-label="Decrease"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M5 12h14" /></svg>
              </button>
              <div className={styles.qtyValueCell}>
                <input
                  type="number"
                  className={styles.qtyInput}
                  value={inputVal}
                  min={step}
                  step={step}
                  onChange={e => setInputVal(e.target.value)}
                  onBlur={e => commitQty(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { (e.target as HTMLInputElement).blur(); } }}
                  aria-label="Quantity in pc"
                />
                <span className={styles.qtyPc} aria-hidden>pc</span>
              </div>
              <button
                type="button"
                className={styles.qtyBtn}
                onClick={() => onUpdateQty(item.productId, item.size, safeQty + step)}
                aria-label="Increase"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M12 5v14M5 12h14" /></svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Column 2 — unit price, quantity, total */}
      <div className={styles.pricingCol}>
        <div className={styles.pricingRow}>
          <span className={styles.pricingLabel}>Unit price</span>
          <div className={styles.pricingValues}>
            <span className={styles.strike}>₹{mrpUnit.toFixed(2)}</span>
            <span className={styles.priceMain}>₹{safePrice.toFixed(2)}</span>
          </div>
        </div>

        <div className={styles.pricingRow}>
          <span className={styles.pricingLabel}>Quantity</span>
          <p className={styles.qtySummary}>
            {packetLabel} pckts ({formatPieces(safeQty)} pc)
          </p>
        </div>

        <div className={styles.pricingRow}>
          <span className={styles.pricingLabel}>Total</span>
          <div className={styles.pricingValues}>
            <span className={styles.strike}>₹{mrpTotal.toFixed(2)}</span>
            <span className={styles.totalMain}>₹{lineTotal.toFixed(2)}</span>
            <span className={styles.gstNote}>incl. GST · GST ₹{gstAmount.toFixed(2)}</span>
          </div>
        </div>

        <span className={styles.savingBadge}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/><line x1="7" y1="7" x2="7.01" y2="7"/></svg>
          Save {savePct}% · ₹{saving.toFixed(0)} off
        </span>
      </div>
    </div>
  );
}
