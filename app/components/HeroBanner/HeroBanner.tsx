"use client";

import React, { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HeroBanner.module.css";
import { products } from "../../data/products";

/* ── Featured products shown in the right panel ── */
const featuredIds = [1, 6, 9]; // cable-nail-clips, nylon-cable-ties, ball-valve-white
const featured = products.filter(p => featuredIds.includes(p.id));

/* ── Category quick-links strip ── */
const quickLinks = [
  { label: "Cable Nail Clips",   slug: "cable-nail-clips",         icon: "🔩" },
  { label: "Nylon Cable Ties",   slug: "nylon-cable-ties",         icon: "🔗" },
  { label: "Double Nail Clamps", slug: "double-nail-clamp",        icon: "⚙️" },
  { label: "Ball Valves",        slug: "ball-valve-white",         icon: "🔵" },
  { label: "Modular Boxes",      slug: "plain-modular-gang-box",   icon: "📦" },
  { label: "UPVC Clamps",        slug: "upvc-pipe-clamp",          icon: "🔧" },
  { label: "CPVC Clamps",        slug: "cpvc-pipe-clamp",          icon: "🛠️" },
  { label: "Insulation Tape",    slug: "electric-insulation-tape", icon: "🎗️" },
  { label: "Wall Plugs",         slug: "wall-plug-gitti",          icon: "🪛" },
];

const stats = [
  { value: "500+",     label: "Products" },
  { value: "12+",      label: "Product Lines" },
  { value: "25+",      label: "Years Trust" },
  { value: "Pan India", label: "Delivery" },
];

/* ── Simple animated counter ── */
function Counter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const [count, setCount] = useState(0);
  useEffect(() => {
    let start = 0;
    const step = Math.ceil(target / 40);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) { setCount(target); clearInterval(timer); }
      else setCount(start);
    }, 30);
    return () => clearInterval(timer);
  }, [target]);
  return <>{count}{suffix}</>;
}

export default function HeroBanner() {
  return (
    <section className={styles.hero}>
      {/* ── Decorative background elements ── */}
      <div className={styles.bgBlob1} aria-hidden />
      <div className={styles.bgBlob2} aria-hidden />
      <div className={styles.bgGrid}  aria-hidden />

      <div className={styles.inner}>
        {/* ════════════ LEFT COLUMN ════════════ */}
        <div className={styles.left}>
          {/* Trust badge */}
          <div className={styles.trustBadge}>
            <span className={styles.trustDot} />
            Trusted Wholesale Supplier · Ahmedabad
          </div>

          {/* Headline */}
          <h1 className={styles.headline}>
            Complete<br />
            <span className={styles.headlineAccent}>Electrical &amp;</span>
            <br />Plumbing Hardware
          </h1>

          {/* Sub-text */}
          <p className={styles.subtext}>
            Premium quality cable clips, ball valves, modular boxes, nylon
            ties &amp; 500+ products — direct manufacturer pricing with bulk
            discounts up to <strong>12%</strong>.
          </p>

          {/* Product category pills */}
          <div className={styles.categoryPills}>
            {["Cable Clips", "Ball Valves", "Modular Boxes", "Nylon Ties", "Insulation Tape"].map(c => (
              <span key={c} className={styles.pill}>{c}</span>
            ))}
          </div>

          {/* CTA buttons */}
          <div className={styles.ctaRow}>
            <Link href="#products" className={styles.ctaPrimary}>
              Browse Products
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
            <a href="tel:9327071674" className={styles.ctaSecondary}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.5a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.6 2.72h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8 9.91a16 16 0 0 0 6.09 6.09l.85-.85a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
              </svg>
              9327071674
            </a>
          </div>

          {/* Stats row */}
          <div className={styles.statsRow}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <div className={styles.statsDivider} />}
                <div className={styles.statItem}>
                  <span className={styles.statValue}>{s.value}</span>
                  <span className={styles.statLabel}>{s.label}</span>
                </div>
              </React.Fragment>
            ))}
          </div>
        </div>

        {/* ════════════ RIGHT COLUMN — Product cards ════════════ */}
        <div className={styles.right}>
          {/* Decorative ring */}
          <div className={styles.ringOuter} aria-hidden />
          <div className={styles.ringInner} aria-hidden />

          {featured.map((product, i) => (
            <Link
              key={product.id}
              href={`/products/${product.slug}`}
              className={`${styles.productCard} ${styles[`card${i}`]}`}
            >
              {/* Card glow */}
              <div className={styles.cardGlow} aria-hidden />

              <div className={styles.cardImageWrap}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  style={{ objectFit: "contain", padding: "0.5rem" }}
                />
              </div>

              <div className={styles.cardContent}>
                <span className={styles.cardBrand}>{product.brand}</span>
                <p className={styles.cardName}>{product.name}</p>
                <div className={styles.cardPriceRow}>
                  <span className={styles.cardFrom}>from</span>
                  <span className={styles.cardPrice}>
                    ₹{product.sizes[0].withGST.toFixed(2)}
                  </span>
                </div>
              </div>

              <div className={styles.cardArrow}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="m9 18 6-6-6-6" />
                </svg>
              </div>
            </Link>
          ))}

          {/* Min order badge */}
          <div className={styles.minOrderBadge}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Min. Order ₹25,000 incl. GST
          </div>
        </div>
      </div>

      {/* ════════════ QUICK LINKS STRIP ════════════ */}
      <div className={styles.strip}>
        <div className={styles.stripInner}>
          {quickLinks.map(link => (
            <Link key={link.slug} href={`/products/${link.slug}`} className={styles.stripItem}>
              <span className={styles.stripIcon}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
          {/* Duplicate for seamless infinite scroll on wider screens */}
          {quickLinks.map(link => (
            <Link key={`dup-${link.slug}`} href={`/products/${link.slug}`} className={styles.stripItem} aria-hidden>
              <span className={styles.stripIcon}>{link.icon}</span>
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
