import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./RelatedProducts.module.css";
import type { Product } from "../../../data/products";

interface RelatedProductsProps {
  products: Product[];
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;

  return (
    <section className={styles.section}>
      {/* Header */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Related Products</h2>
          <p className={styles.sectionSubtitle}>
            More products from the same category
          </p>
        </div>
        <Link href="/" className={styles.viewAllBtn}>
          View All
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>

      {/* Cards */}
      <div className={styles.grid}>
        {products.map((product) => (
          <Link
            key={product.id}
            href={`/products/${product.slug}`}
            className={styles.card}
          >
            {/* Image */}
            <div className={styles.imageWrapper}>
              {product.isNew && <span className={styles.badge}>New</span>}
              {product.isBestseller && (
                <span className={styles.badgeSell}>Hot</span>
              )}
              <div className={styles.imagePlaceholder}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  style={{ objectFit: "contain", padding: "1.5rem" }}
                />
              </div>
            </div>

            {/* Info */}
            <div className={styles.cardInfo}>
              <span className={styles.cardBrand}>{product.brand}</span>
              <h3 className={styles.cardName}>{product.name}</h3>
              <p className={styles.cardDesc}>{product.description}</p>
              <div className={styles.cardPricing}>
                <span className={styles.fromLabel}>From</span>
                <span className={styles.cardPrice}>
                  ₹{product.sizes[0].withGST.toFixed(2)}
                </span>
                <span className={styles.gstTag}>incl. GST</span>
              </div>
              <div className={styles.cardCta}>
                View Details
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}
