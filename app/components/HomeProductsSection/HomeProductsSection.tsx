import React from "react";
import { getStorefrontProductsFromSearchParams } from "@/lib/catalog/storefront";
import styles from "./HomeProductsSection.module.css";
import HomeProductsPagination from "./HomeProductsPagination";
import HomeProductsSortedGrid from "./HomeProductsSortedGrid";
import type { ApiProduct } from "../../lib/api/types";

const PAGE_SIZE = 10;

type Props = {
  page?: number;
};

export default async function HomeProductsSection({ page: pageProp = 1 }: Props) {
  let page = Math.max(1, Math.floor(Number(pageProp)) || 1);

  const buildParams = (p: number) => {
    const sp = new URLSearchParams();
    sp.set("productKind", "catalog");
    sp.set("limit", String(PAGE_SIZE));
    sp.set("skip", String((p - 1) * PAGE_SIZE));
    return sp;
  };

  let result = await getStorefrontProductsFromSearchParams(buildParams(page));
  let pageProducts: ApiProduct[] = [];
  let total = 0;
  let totalPages = 1;

  if (result.ok) {
    total = result.meta.total;
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) {
      page = totalPages;
      result = await getStorefrontProductsFromSearchParams(buildParams(page));
    }
    if (result.ok) {
      pageProducts = result.data as unknown as ApiProduct[];
    }
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
          <p className={styles.footerNote}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Min. order ₹25,000 (incl. GST) · 100% advance · Prices effective 01-04-2026
          </p>
        </div>
      </div>
    </section>
  );
}
