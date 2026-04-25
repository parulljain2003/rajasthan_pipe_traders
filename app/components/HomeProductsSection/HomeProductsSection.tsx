import React from "react";
import { getStorefrontProductsFromSearchParams } from "@/lib/catalog/storefront";
import styles from "./HomeProductsSection.module.css";
import HomeProductsPagination from "./HomeProductsPagination";
import HomeProductsSortedGrid from "./HomeProductsSortedGrid";
import StorefrontPolicyFooterNote from "@/app/components/StorefrontPolicyFooterNote";
import type { ApiProduct } from "../../lib/api/types";

const PAGE_SIZE = 10;

type Props = {
  page?: number;
};

export default async function HomeProductsSection({ page: pageProp = 1 }: Props) {
  let page = Math.max(1, Math.floor(Number(pageProp)) || 1);
  const sp = new URLSearchParams();
  sp.set("productKind", "catalog");
  sp.set("limit", String(PAGE_SIZE));
  sp.set("skip", String((page - 1) * PAGE_SIZE));

  let result = await getStorefrontProductsFromSearchParams(sp);
  let pageProducts: ApiProduct[] = [];
  let total = 0;
  let totalPages = 1;

  if (result.ok) {
    let rows = result.data as unknown as ApiProduct[];
    total = result.meta.total;
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) {
      page = totalPages;
      const corrected = new URLSearchParams();
      corrected.set("productKind", "catalog");
      corrected.set("limit", String(PAGE_SIZE));
      corrected.set("skip", String((page - 1) * PAGE_SIZE));
      result = await getStorefrontProductsFromSearchParams(corrected);
      if (result.ok) {
        rows = result.data as unknown as ApiProduct[];
      }
    }
    pageProducts = rows;
  }

  const start = total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const end = total === 0 ? 0 : Math.min(page * PAGE_SIZE, total);

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <div className={styles.headingRow}>
            <h2 className={styles.title}>All Products</h2>
            <span className={styles.pill}>
              {total} {total === 1 ? "product" : "products"}
            </span>
          </div>
          <p className={styles.subtitle}>
            {total > 0
              ? `Showing ${start}–${end} of ${total} · Browse our hardware and plumbing catalog`
              : "Our catalog will appear here when products are available"}
          </p>
        </div>

        <HomeProductsSortedGrid apiProducts={pageProducts} />

        <HomeProductsPagination page={page} totalPages={totalPages} />

        <div className={styles.footer}>
          <StorefrontPolicyFooterNote className={styles.footerNote} />
        </div>
      </div>
    </section>
  );
}
