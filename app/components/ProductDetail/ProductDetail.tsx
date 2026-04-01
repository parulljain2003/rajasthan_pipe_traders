import React from "react";
import Link from "next/link";
import styles from "./ProductDetail.module.css";
import ImageGallery from "./ImageGallery/ImageGallery";
import ProductInfo from "./ProductInfo/ProductInfo";
import SpecsTable from "./SpecsTable/SpecsTable";
import RelatedProducts from "./RelatedProducts/RelatedProducts";
import type { Product } from "../../data/products";

interface ProductDetailProps {
  product: Product;
  relatedProducts: Product[];
}

export default function ProductDetail({
  product,
  relatedProducts,
}: ProductDetailProps) {
  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <nav className={styles.breadcrumb} aria-label="Breadcrumb">
        <div className={styles.breadcrumbInner}>
          <Link href="/" className={styles.breadcrumbLink}>Home</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <Link href="/#shop" className={styles.breadcrumbLink}>Shop</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className={styles.breadcrumbCurrent}>{product.category}</span>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className={styles.breadcrumbActive}>{product.name}</span>
        </div>
      </nav>

      {/* ── Main Content ── */}
      <div className={styles.container}>
        {/* Top Section: Gallery + Info */}
        <div className={styles.topGrid}>
          <ImageGallery product={product} />
          <ProductInfo product={product} />
        </div>

        {/* Description Block */}
        <div className={styles.descriptionBlock}>
          <h2 className={styles.descTitle}>About This Product</h2>
          <p className={styles.descText}>{product.longDescription}</p>
        </div>

        {/* Specs Table (Tabs) */}
        <SpecsTable product={product} />

        {/* Company Info Banner */}
        <div className={styles.companyBanner}>
          <div className={styles.companyBannerLeft}>
            <p className={styles.companyName}>Rajasthan Pipe Traders</p>
            <p className={styles.companyTagline}>
              Premium Electrical & Plumbing Hardware · Ahmedabad
            </p>
          </div>
          <div className={styles.companyStats}>
            <div className={styles.statItem}>
              <span className={styles.statValue}>25+</span>
              <span className={styles.statLabel}>Years of Trust</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statValue}>500+</span>
              <span className={styles.statLabel}>Products</span>
            </div>
            <div className={styles.statDivider} />
            <div className={styles.statItem}>
              <span className={styles.statValue}>Pan India</span>
              <span className={styles.statLabel}>Delivery</span>
            </div>
          </div>
          <a href="tel:9327071674" className={styles.contactBtn}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l.85-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
            </svg>
            Call: 9327071674
          </a>
        </div>

        {/* Related Products */}
        <RelatedProducts products={relatedProducts} />
      </div>
    </div>
  );
}
