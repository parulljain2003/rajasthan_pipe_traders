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
  sp.set("limit", "500");
  sp.set("skip", "0");

  const result = await getStorefrontProductsFromSearchParams(sp);
  let pageProducts: ApiProduct[] = [];
  let total = 0;
  let totalPages = 1;

  if (result.ok) {
    const filtered = (result.data as unknown as ApiProduct[]).filter((p) => {
      const v = (p as { isEligibleForCombo?: unknown }).isEligibleForCombo;
      return v == null || (typeof v === "string" && v.trim() === "");
    });
    const sorted = filtered
      .map((item, index) => ({ item, index }))
      .sort((a, b) => {
        const ar =
          typeof a.item.sortOrder === "number" && a.item.sortOrder > 0
            ? a.item.sortOrder
            : Number.POSITIVE_INFINITY;
        const br =
          typeof b.item.sortOrder === "number" && b.item.sortOrder > 0
            ? b.item.sortOrder
            : Number.POSITIVE_INFINITY;
        if (ar !== br) return ar - br;
        if (ar === Number.POSITIVE_INFINITY) return a.index - b.index;
        return a.item.name.localeCompare(b.item.name, undefined, { sensitivity: "base" });
      })
      .map(({ item }) => item);

    total = sorted.length;
    totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
    if (page > totalPages) page = totalPages;
    const startIdx = (page - 1) * PAGE_SIZE;
    pageProducts = sorted.slice(startIdx, startIdx + PAGE_SIZE);
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
