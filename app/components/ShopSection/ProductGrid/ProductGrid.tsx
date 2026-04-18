"use client";

import React from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductGrid.module.css';
import type { ProductListingEntry } from '../../../data/products';
import { productHeading, listingBrandPill } from '../../../lib/productHeading';
import { resolvePackingUnitLabels } from '@/lib/packingLabels';
import ListingMoqCartControls, { listingEntryToModel } from '@/app/components/ListingMoqCartControls/ListingMoqCartControls';

interface ProductGridProps {
  /** One row per product × seller (already filtered/sorted when applicable). */
  listingEntries: ProductListingEntry[];
  /** Home “All Products”: label left, quantity box right. */
  cardListingLayout?: boolean;
}

function listingKey(productId: number, sellerId: string) {
  return `${productId}:${sellerId}`;
}

export default function ProductGrid({ listingEntries: entries, cardListingLayout = false }: ProductGridProps) {
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
        const listLabels = resolvePackingUnitLabels(product, size0);
        const lk = listingKey(product.id, offer.sellerId);

        return (
          <Link key={lk} href={`/products/${product.slug}`} className={styles.card}>
            {/* Image area */}
            <div className={styles.imageWrapper}>
              <div className={styles.imageInner}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                  style={{ objectFit: 'contain', padding: '0.8rem' }}
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
              <div className={styles.cardPriceBlock}>
                <p className={styles.cardPriceGst}>
                  ₹{size0.withGST.toFixed(2)} incl. GST / {listLabels.inner}
                </p>
                <p className={styles.cardPriceBasic}>₹{size0.basicPrice.toFixed(2)} basic</p>
              </div>
              <ListingMoqCartControls
                model={listingEntryToModel(entry)}
                labels={listLabels}
                className={styles.listingMoqWrap}
                cardListingLayout={cardListingLayout}
              />
            </div>
          </Link>
        );
      })}
    </div>
  );
}
