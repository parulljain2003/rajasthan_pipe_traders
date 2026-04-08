import React from "react";
import { getStorefrontProductsFromSearchParams } from "@/lib/catalog/storefront";
import styles from "./HomeProductsSection.module.css";
import ProductGrid from "../ShopSection/ProductGrid/ProductGrid";
import type { ProductListingEntry } from "../../data/products";
import { apiProductsToListingEntries } from "../../lib/api/mapApiProduct";
import type { ApiProduct } from "../../lib/api/types";

export default async function HomeProductsSection() {
  let featuredListing: ProductListingEntry[] = [];
  try {
    const sp = new URLSearchParams();
    sp.set("productKind", "catalog");
    sp.set("limit", "10");
    sp.set("skip", "0");
    const result = await getStorefrontProductsFromSearchParams(sp);
    if (result.ok) {
      featuredListing = apiProductsToListingEntries(result.data as unknown as ApiProduct[]);
    }
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
