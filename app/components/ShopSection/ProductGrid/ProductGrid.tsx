"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductGrid.module.css';
import type { ProductListingEntry } from '../../../data/products';
import { productHeading, listingBrandPill } from '../../../lib/productHeading';
import { resolvePackingUnitLabels } from '@/lib/packingLabels';
import { useCartWishlist } from '../../../context/CartWishlistContext';
import WhatsAppPopup from '../../WhatsAppPopup/WhatsAppPopup';

interface ProductGridProps {
  /** One row per product × seller (already filtered/sorted when applicable). */
  listingEntries: ProductListingEntry[];
}

function listingKey(productId: number, sellerId: string) {
  return `${productId}:${sellerId}`;
}

export default function ProductGrid({ listingEntries: entries }: ProductGridProps) {
  const { addToCart } = useCartWishlist();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupProductName, setPopupProductName] = useState('');
  const [errorListingKey, setErrorListingKey] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQty = (entry: ProductListingEntry) =>
    quantities[listingKey(entry.product.id, entry.offer.sellerId)] ?? 0;

  const setQty = (entry: ProductListingEntry, val: number) =>
    setQuantities((prev) => ({
      ...prev,
      [listingKey(entry.product.id, entry.offer.sellerId)]: val,
    }));

  const handleAddToCart = (e: React.MouseEvent, entry: ProductListingEntry) => {
    e.preventDefault();
    e.stopPropagation();
    const { product, offer } = entry;
    const sizeRow = offer.sizes[0];
    if (getQty(entry) <= 0) {
      setErrorListingKey(listingKey(product.id, offer.sellerId));
      return;
    }
    setErrorListingKey(null);
    const qty = getQty(entry);
    addToCart({
      productId: product.id,
      mongoProductId: product.mongoProductId,
      categoryMongoId: product.categoryMongoId,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.image,
      brand: offer.brand,
      category: product.category,
      sellerId: offer.sellerId,
      sellerName: offer.sellerName,
      size: sizeRow.size,
      pricePerUnit: sizeRow.withGST,
      basicPricePerUnit: sizeRow.basicPrice,
      qtyPerBag: sizeRow.qtyPerBag,
      pcsPerPacket: sizeRow.pcsPerPacket,
      orderMode: "packets" as const,
    }, qty);
    setPopupProductName(product.name);
    setPopupOpen(true);
  };

  if (entries.length === 0) {
    return (
      <div className={styles.empty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p>No products found in this category.</p>
      </div>
    );
  }


  return (
    <>
    <WhatsAppPopup
      isOpen={popupOpen}
      onClose={() => setPopupOpen(false)}
      productName={popupProductName}
    />
    <div className={styles.grid}>
      {entries.map((entry) => {
        const { product, offer } = entry;
        const brandPill = listingBrandPill(offer.brand);
        const pillClass =
          brandPill === "HiTech"
            ? styles.listingBrandHitech
            : brandPill === "Tejas"
              ? styles.listingBrandTejas
              : styles.listingBrandNstar;
        const size0 = offer.sizes[0];
        const lowestPrice = size0.withGST;
        const lowestBasic = size0.basicPrice;
        const listLabels = resolvePackingUnitLabels(product, size0);
        const lk = listingKey(product.id, offer.sellerId);

        return (
          <Link key={lk} href={`/products/${product.slug}`} className={styles.card}>
            {/* Image area */}
            <div className={styles.imageWrapper}>
              <div className={styles.badgeGroup}>
                {product.isNew && <span className={styles.badgeNew}>NEW</span>}
                {product.isBestseller && <span className={styles.badgeHot}>HOT</span>}
              </div>

              <div className={styles.imageInner}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  style={{ objectFit: 'contain', padding: '1.5rem' }}
                />
              </div>
            </div>

            {/* Card info */}
            <div className={styles.info}>
              <div className={styles.meta}>
                <span className={`${styles.listingBrand} ${pillClass}`}>
                  {brandPill}
                </span>
              </div>

              <h3 className={styles.title}>{productHeading(product.name, size0.size)}</h3>
              <p className={styles.description}>{product.description}</p>

              <div className={styles.pricing}>
                <div className={styles.pricingLeft}>
                  <span className={styles.priceFrom}>from</span>
                  <span className={styles.salePrice}>₹{lowestPrice.toFixed(2)}</span>
                  <span className={styles.gstTag}>incl. GST / {listLabels.inner}</span>
                </div>
                <span className={styles.originalPrice}>₹{lowestBasic.toFixed(2)}</span>
              </div>

              <div className={styles.ctaRow}>
                <div
                  className={styles.qtyCounter}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <div className={styles.qtyCounterInner}>
                    <button
                      type="button"
                      className={styles.qtyCounterBtn}
                      disabled={getQty(entry) <= 0}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={e => {
                        e.preventDefault(); e.stopPropagation();
                        setQty(entry, Math.max(0, getQty(entry) - 1));
                        setErrorListingKey(null);
                      }}
                    >−</button>
                    <div className={styles.qtyValueCell}>
                      <input
                        type="number"
                        className={styles.qtyCounterInput}
                        value={getQty(entry)}
                        min={0}
                        step={1}
                        onFocus={(e) => e.target.select()}
                        onChange={e => {
                          e.stopPropagation();
                          const v = parseInt(e.target.value) || 0;
                          if (v >= 0) {
                            setQty(entry, v);
                            setErrorListingKey(null);
                          }
                        }}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0;
                          if (v < 0) setQty(entry, 0);
                        }}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        aria-label={`Quantity in ${listLabels.innerPlural}`}
                      />
                      <span className={styles.qtyPc} aria-hidden>{listLabels.inner}</span>
                    </div>
                    <button
                      type="button"
                      className={styles.qtyCounterBtn}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={e => {
                        e.preventDefault(); e.stopPropagation();
                        setQty(entry, getQty(entry) + 1);
                        setErrorListingKey(null);
                      }}
                    >+</button>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.cartBtn}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => handleAddToCart(e, entry)}
                >
                  <span>Add to Cart</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14zM5 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
                  </svg>
                </button>
              </div>
              {errorListingKey === lk && (
                <div className={styles.qtyErrorMessage}>
                  Please add product quantity first
                </div>
              )}
              <div className={styles.moqLabel}>
                Minimum Order Quantity: {product.moq ?? offer.sizes[0].pcsPerPacket} packets
              </div>
            </div>
          </Link>
        );
      })}
    </div>
    </>
  );
}
