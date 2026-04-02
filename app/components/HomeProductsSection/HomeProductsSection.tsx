import React from 'react';
import Link from 'next/link';
import styles from './HomeProductsSection.module.css';
import { products } from '../../data/products';
import ProductGrid from '../ShopSection/ProductGrid/ProductGrid';

const FEATURED_PRODUCTS = products.slice(0, 10);

export default function HomeProductsSection() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headingRow}>
            <h2 className={styles.title}>All Products</h2>
            <span className={styles.pill}>{FEATURED_PRODUCTS.length} featured</span>
          </div>
          <p className={styles.subtitle}>Our best-selling hardware and plumbing products</p>
        </div>

        <ProductGrid products={FEATURED_PRODUCTS} />

        <div className={styles.footer}>
          <p className={styles.footerNote}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Min. order ₹25,000 (incl. GST) · 100% advance · Prices effective 01-04-2026
          </p>
          <Link href="/category/cable-clips" className={styles.viewAllBtn}>
            View All Products
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>
      </div>
    </section>
  );
}
