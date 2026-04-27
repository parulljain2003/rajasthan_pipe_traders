"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./RelatedProducts.module.css";
import { getSellerOffers, type Product } from "../../../data/products";
import { productHeading, brandPillLabel, resolveBrandPillVariant } from "../../../lib/productHeading";
import { categoryToSlug } from "@/app/data/categories";
import { resolvePackingUnitLabels } from "@/lib/packingLabels";
import ListingMoqCartControls, { listingEntryToModel } from "@/app/components/ListingMoqCartControls/ListingMoqCartControls";

interface RelatedProductsProps {
  products: Product[];
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  if (products.length === 0) return null;
  const categorySlug = categoryToSlug(products[0].category);
  const viewAllHref = categorySlug ? `/category/${encodeURIComponent(categorySlug)}` : "/categories";

  return (
    <section className={styles.section}>
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Related Products</h2>
          <p className={styles.sectionSubtitle}>
            More products from the same category
          </p>
        </div>
        <Link href={viewAllHref} className={styles.viewAllBtn}>
          View All
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>

      <div className={styles.grid}>
        {products.map((product) => {
          const offer = getSellerOffers(product)[0];
          const brandSource = (product.brand || offer.brand || "").trim();
          const pillLabel = brandPillLabel(brandSource);
          const variant = resolveBrandPillVariant(brandSource);
          const pillClass =
            variant === "hitech"
              ? styles.listingBrandHitech
              : variant === "tejas"
                ? styles.listingBrandTejas
                : variant === "nstar"
                  ? styles.listingBrandNstar
                  : styles.listingBrandDefault;
          const size = offer.sizes[0];
          const listLabels = resolvePackingUnitLabels(product, size);
          const entry = { product, offer };

          return (
            <div key={product.id} className={styles.card}>
              <Link href={`/products/${product.slug}`} className={styles.imageLink}>
                <div className={styles.imageWrapper}>
                  {product.isNew && <span className={styles.badge}>New</span>}
                  {product.isBestseller && <span className={styles.badgeSell}>Hot</span>}
                  <div className={styles.imagePlaceholder}>
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      style={{ objectFit: "contain", padding: "1.5rem" }}
                    />
                  </div>
                </div>
              </Link>

              <div className={styles.cardInfo}>
                <Link href={`/products/${product.slug}`} className={styles.titleLink}>
                  {pillLabel ? (
                    <span className={`${styles.listingBrand} ${pillClass}`}>{pillLabel}</span>
                  ) : null}
                  <h3 className={styles.cardName}>{productHeading(product.name, size.size)}</h3>
                </Link>

                <p className={styles.cardDesc}>{product.description}</p>

                <div className={styles.cardPriceStack}>
                  <span className={styles.cardPriceLabel}>Price (incl. GST)</span>
                  <p className={styles.cardPriceGst}>
                    ₹{size.withGST.toFixed(2)} / {listLabels.inner}
                  </p>
                  <span className={styles.cardPriceLabel}>Basic</span>
                  <p className={styles.cardPriceBasic}>₹{size.basicPrice.toFixed(2)}</p>
                </div>

                <ListingMoqCartControls
                  model={listingEntryToModel(entry)}
                  labels={listLabels}
                  className={styles.listingMoqWrap}
                  cardListingLayout
                  labeledBulkCardRows
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
