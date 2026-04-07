import React from "react";
import styles from "./HomeProductsSection.module.css";
import ProductGrid from "../ShopSection/ProductGrid/ProductGrid";
import type { ProductListingEntry } from "../../data/products";
import { fetchProductsList } from "../../lib/api/client";
import { apiProductsToListingEntries } from "../../lib/api/mapApiProduct";

export default async function HomeProductsSection() {
  let featuredListing: ProductListingEntry[] = [];
  try {
    const { data } = await fetchProductsList(
      { productKind: "catalog", limit: 10, skip: 0 },
      { next: { revalidate: 60 } }
    );
    featuredListing = apiProductsToListingEntries(data);
  } catch {
    featuredListing = [];
  }

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headingRow}>
            <h2 className={styles.title}>All Products</h2>
            <span className={styles.pill}>{featuredListing.length} featured</span>
          </div>
          <p className={styles.subtitle}>Our best-selling hardware and plumbing products</p>
        </div>

        <ProductGrid listingEntries={featuredListing} />
      </div>
    </section>
  );
}
