import React from 'react';
import styles from './HomeProductsSection.module.css';
import { expandProductsForListing, products } from '../../data/products';
import ProductGrid from '../ShopSection/ProductGrid/ProductGrid';

const FEATURED_LISTING = expandProductsForListing(products.slice(0, 10));

export default function HomeProductsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headingRow}>
            <h2 className={styles.title}>All Products</h2>
            <span className={styles.pill}>{FEATURED_LISTING.length} featured</span>
          </div>
          <p className={styles.subtitle}>Our best-selling hardware and plumbing products</p>
        </div>

        <ProductGrid listingEntries={FEATURED_LISTING} />
      </div>
    </section>
  );
}
