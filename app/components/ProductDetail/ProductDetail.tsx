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
          <ProductInfo key={product.slug} product={product} />
        </div>

        {/* Description Block */}
        <div className={styles.descriptionBlock}>
          <h2 className={styles.descTitle}>About This Product</h2>
          <p className={styles.descText}>{product.longDescription}</p>
        </div>

        {/* Specs Table (Tabs) */}
        <SpecsTable product={product} />



        {/* Related Products */}
        <RelatedProducts products={relatedProducts} />
      </div>
    </div>
  );
}
