import React from 'react';
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
      </div>
    </section>
  );
}
