"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HeroBanner.module.css";
import { products } from "../../data/products";

/* ════════════════════════════════════
   COUPON DATA
════════════════════════════════════ */
const coupons = [
  {
    code: "BULK7",
    discount: "7%",
    label: "OFF",
    condition: "On 15+ Cartons / Bags",
    desc: "Mix items · complete price list",
    theme: "blue",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      </svg>
    ),
  },
  {
    code: "BULK9",
    discount: "9%",
    label: "OFF",
    condition: "On 50+ Cartons / Bags",
    desc: "Mix items · complete price list",
    theme: "indigo",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
      </svg>
    ),
  },
  {
    code: "BULK12",
    discount: "12%",
    label: "OFF",
    condition: "On 85+ Cartons / Bags",
    desc: "Maximum bulk discount",
    theme: "green",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z" />
        <line x1="7" y1="7" x2="7.01" y2="7" />
      </svg>
    ),
  },
  {
    code: "MIN25K",
    discount: "FREE",
    label: "DISPATCH",
    condition: "Min. Order ₹25,000",
    desc: "100% advance · TO PAY freight",
    theme: "amber",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M5 12h14M12 5l7 7-7 7" />
      </svg>
    ),
  },
];

/* ════════════════════════════════════
   CAROUSEL SLIDES
════════════════════════════════════ */
const slides = [
  { tag: "🔥 Hot Selling",    tagKey: "hot",     productId: 1  },
  { tag: "⭐ Most Popular",   tagKey: "popular",  productId: 6  },
  { tag: "🎁 Combo Products", tagKey: "combo",    productId: 2  },
  { tag: "💎 Premium Range",  tagKey: "premium",  productId: 9  },
  { tag: "🏆 Bestseller",     tagKey: "best",     productId: 4  },
].map(s => ({ ...s, product: products.find(p => p.id === s.productId)! }));

/* ════════════════════════════════════
   STATS + QUICK LINKS
════════════════════════════════════ */
const stats = [
  { value: "500+",      label: "Products"      },
  { value: "12+",       label: "Product Lines" },
  { value: "25+",       label: "Years Trust"   },
  { value: "Pan India", label: "Delivery"      },
];

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

/* ════════════════════════════════════
   COUPON CARD COMPONENT
════════════════════════════════════ */
function CouponCard({ c }: { c: typeof coupons[0] }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(c.code).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <div className={`${styles.coupon} ${styles[`coupon_${c.theme}`]}`}>
      <div className={styles.couponNotchL} aria-hidden />
      <div className={styles.couponNotchR} aria-hidden />

      {/* stub */}
      <div className={styles.couponStub}>
        <span className={styles.couponIconWrap}>{c.icon}</span>
        <div className={styles.couponDiscBlock}>
          <span className={styles.couponPct}>{c.discount}</span>
          <span className={styles.couponLabel}>{c.label}</span>
        </div>
      </div>

      <div className={styles.couponDash} aria-hidden />

      {/* body */}
      <div className={styles.couponBody}>
        <p className={styles.couponCond}>{c.condition}</p>
        <p className={styles.couponDescTxt}>{c.desc}</p>
        <button className={`${styles.couponCopy} ${styles[`couponCopy_${c.theme}`]}`} onClick={copy}>
          {copied
            ? <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 7 9 18l-5-5"/></svg>Copied!</>
            : <><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="14" height="14" x="8" y="8" rx="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>{c.code}</>
          }
        </button>
      </div>
    </div>
  );
}

/* ════════════════════════════════════
   PRODUCT CAROUSEL COMPONENT
════════════════════════════════════ */
function ProductCarousel() {
  const [active, setActive]   = useState(0);
  const [dir, setDir]         = useState<"l"|"r">("l");
  const [paused, setPaused]   = useState(false);

  const goTo = useCallback((i: number, d: "l"|"r" = "l") => { setDir(d); setActive(i); }, []);
  const next = useCallback(() => goTo((active + 1) % slides.length, "l"), [active, goTo]);
  const prev = useCallback(() => goTo((active - 1 + slides.length) % slides.length, "r"), [active, goTo]);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(next, 3500);
    return () => clearInterval(t);
  }, [paused, next]);

  const s = slides[active];
  const p = s.product;

  return (
    <div className={styles.carousel} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div key={active} className={`${styles.slideCard} ${styles[`tag_${s.tagKey}`]} ${styles[dir === "l" ? "animL" : "animR"]}`}>
        <span className={`${styles.slideTag} ${styles[`tagBg_${s.tagKey}`]}`}>{s.tag}</span>

        <Link href={`/products/${p.slug}`} className={styles.slideImg}>
          <Image src={p.image} alt={p.name} fill style={{ objectFit:"contain", padding:"1.25rem" }} />
          <div className={`${styles.imgGlow} ${styles[`glow_${s.tagKey}`]}`} aria-hidden />
        </Link>

        <div className={styles.slideContent}>
          <span className={styles.slideBrand}>{p.brand}</span>
          <h3 className={styles.slideName}>{p.name}</h3>
          <p className={styles.slideDesc}>{p.description}</p>
          <div className={styles.slidePriceRow}>
            <div><span className={styles.slideFrom}>from </span><span className={styles.slidePrice}>₹{p.sizes[0].withGST.toFixed(2)}</span><span className={styles.slideGst}> incl. GST</span></div>
            <span className={styles.slideBasic}>₹{p.sizes[0].basicPrice.toFixed(2)} basic</span>
          </div>
          <Link href={`/products/${p.slug}`} className={`${styles.slideBtn} ${styles[`slideBtn_${s.tagKey}`]}`}>
            View Product <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
          </Link>
        </div>
      </div>

      <div className={styles.carouselNav}>
        <button className={styles.arrowBtn} onClick={prev}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m15 18-6-6 6-6"/></svg>
        </button>
        <div className={styles.dots}>
          {slides.map((_, i) => (
            <button key={i} className={`${styles.dot} ${i === active ? styles.dotActive : ""}`}
              onClick={() => goTo(i, i > active ? "l" : "r")} />
          ))}
        </div>
        <button className={styles.arrowBtn} onClick={next}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="m9 18 6-6-6-6"/></svg>
        </button>
      </div>

    </div>
  );
}

/* ════════════════════════════════════
   MAIN HERO
════════════════════════════════════ */
export default function HeroBanner() {
  return (
    <section className={styles.hero}>
      {/* BG */}
      <div className={styles.bgImage}>
        <Image src="/banner-1.png" alt="Rajasthan Pipe Traders" fill
          style={{ objectFit:"cover", objectPosition:"center" }} priority />
      </div>
      <div className={styles.overlayLeft} aria-hidden />
      <div className={styles.overlayFull} aria-hidden />
      <div className={styles.bgGrid}      aria-hidden />

      {/* ══ COUPON STRIP — TOP ══ */}
      <div className={styles.couponBar}>
        <div className={styles.couponBarInner}>
          <div className={styles.couponBarLabel}>
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
              <line x1="7" y1="7" x2="7.01" y2="7"/>
            </svg>
            Exclusive Bulk Deals
          </div>
          <div className={styles.couponRow}>
            {coupons.map(c => <CouponCard key={c.code} c={c} />)}
          </div>
        </div>
      </div>

      {/* ══ MAIN 2-COL ══ */}
      <div className={styles.inner}>
        {/* LEFT */}
        <div className={styles.left}>
          <div className={styles.trustBadge}>
            <span className={styles.trustDot} />
            Ahmedabad · Since 2000 · GST Verified
          </div>

          <h1 className={styles.headline}>
            <span className={styles.companyName}>Rajasthan</span>
            <span className={styles.companyName2}> Pipe Traders</span>
          </h1>

          <p className={styles.tagline}>Your Trusted Wholesale Hardware Partner</p>

          <p className={styles.subtext}>
            Established in Ahmedabad, we are a leading wholesale distributor
            of <strong>premium electrical fittings</strong>, plumbing hardware,
            cable management solutions &amp; 500+ industrial products.
            Direct manufacturer pricing with <strong>Pan India delivery</strong>.
          </p>

          <div className={styles.categoryPills}>
            {["Cable Clips", "Ball Valves", "Modular Boxes", "Nylon Ties", "Insulation Tape", "Wall Plugs"].map(c => (
              <span key={c} className={styles.pill}>{c}</span>
            ))}
          </div>

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

        {/* RIGHT — carousel */}
        <div className={styles.right}>
          <ProductCarousel />
        </div>
      </div>

      {/* ══ QUICK LINKS ══ */}
      <div className={styles.strip}>
        <div className={styles.stripInner}>
          {[...quickLinks, ...quickLinks].map((l, i) => (
            <Link key={`${l.slug}-${i}`} href={`/products/${l.slug}`}
              className={styles.stripItem} aria-hidden={i >= quickLinks.length}>
              <span className={styles.stripIcon}>{l.icon}</span>{l.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
