"use client";

import React, { useRef, useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HomeCategoryGrid.module.css";
import { fetchCategoriesList, fetchProductsList } from "../../lib/api/client";
import type { ApiCategory, ApiProduct } from "../../lib/api/types";

const CATEGORY_BG_COLORS = ["#ffccd5", "#b3e5fc", "#c8e6c9", "#e1bee7", "#ffe0b2", "#d7ccc8"];
const CATEGORY_CARD_IMAGES = ["/Cable_Clip.png", "/Nail_Cable_Clip.png"];

function countCatalogByCategorySlug(products: ApiProduct[]): Map<string, number> {
  const map = new Map<string, number>();
  for (const p of products) {
    const slug = p.category?.slug;
    if (!slug) continue;
    map.set(slug, (map.get(slug) ?? 0) + 1);
  }
  return map;
}

export default function HomeCategoryGrid() {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canLeft, setCanLeft] = useState(false);
  const [canRight, setCanRight] = useState(false);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [countsBySlug, setCountsBySlug] = useState<Map<string, number>>(new Map());
  const [loadState, setLoadState] = useState<"loading" | "error" | "ok">("loading");

  const sync = useCallback(() => {
    const el = trackRef.current;
    if (!el) return;
    setCanLeft(el.scrollLeft > 4);
    setCanRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return;
    sync();
    el.addEventListener("scroll", sync, { passive: true });
    const ro = new ResizeObserver(sync);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", sync);
      ro.disconnect();
    };
  }, [sync, categories.length]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [{ data: cats }, { data: prods }] = await Promise.all([
          fetchCategoriesList(),
          fetchProductsList({ productKind: "catalog", limit: 500, skip: 0 }),
        ]);
        if (cancelled) return;
        setCategories(cats);
        setCountsBySlug(countCatalogByCategorySlug(prods));
        setLoadState("ok");
      } catch {
        if (cancelled) return;
        setCategories([]);
        setCountsBySlug(new Map());
        setLoadState("error");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const scroll = (dir: "left" | "right") => {
    const el = trackRef.current;
    if (!el) return;
    const cardW = el.firstElementChild
      ? (el.firstElementChild as HTMLElement).offsetWidth + 20
      : 260;
    el.scrollBy({ left: dir === "left" ? -cardW : cardW, behavior: "smooth" });
  };

  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.headerRow}>
          <div className={styles.header}>
            <h2 className={styles.title}>Shop by Category</h2>
            <p className={styles.subtitle}>Browse our complete range of quality products</p>
            {loadState === "loading" && (
              <p className={styles.subtitle} style={{ marginTop: "0.35rem", opacity: 0.8 }}>
                Loading categories…
              </p>
            )}
            {loadState === "error" && (
              <p className={styles.subtitle} style={{ marginTop: "0.35rem", color: "#b91c1c" }}>
                Could not load categories. Please try again later.
              </p>
            )}
          </div>
          <div className={styles.arrowGroup}>
            <button
              className={`${styles.navArrow} ${!canLeft ? styles.navArrowDisabled : ""}`}
              onClick={() => scroll("left")}
              disabled={!canLeft}
              aria-label="Scroll categories left"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button
              className={`${styles.navArrow} ${!canRight ? styles.navArrowDisabled : ""}`}
              onClick={() => scroll("right")}
              disabled={!canRight}
              aria-label="Scroll categories right"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        <div className={styles.sliderWrap}>
          <div className={styles.track} ref={trackRef}>
            {categories.map((cat, i) => {
              const count = countsBySlug.get(cat.slug) ?? 0;
              const bgColor = CATEGORY_BG_COLORS[i % CATEGORY_BG_COLORS.length];
              const imageSrc = CATEGORY_CARD_IMAGES[i % CATEGORY_CARD_IMAGES.length];
              return (
                <Link key={cat._id} href={`/category/${cat.slug}`} className={styles.card}>
                  <div className={styles.imageArea} style={{ background: bgColor }}>
                    <div className={styles.imageWrap}>
                      <Image
                        src={imageSrc}
                        alt={cat.name}
                        fill
                        sizes="(max-width: 640px) 60vw, (max-width: 1280px) 28vw, 20vw"
                        priority={i < 4}
                        style={{ objectFit: "contain", padding: "1.25rem" }}
                      />
                    </div>
                  </div>
                  <div className={styles.info}>
                    <div className={styles.text}>
                      <h3 className={styles.name}>{cat.name}</h3>
                      <p className={styles.count}>{count} items</p>
                    </div>
                    <div className={styles.arrowBtn} aria-hidden="true">
                      <svg
                        width="14"
                        height="14"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <path d="m9 18 6-6-6-6" />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
