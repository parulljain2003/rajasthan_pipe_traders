"use client";

import React, { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./HeroBanner.module.css";
import { productHeading, listingBrandPill } from "../../lib/productHeading";
import { resolvePackingUnitLabels } from "@/lib/packingLabels";
import type { Product, ProductSize } from "@/app/data/products";
import ListingMoqCartControls from "@/app/components/ListingMoqCartControls/ListingMoqCartControls";
import { heroSlideProductToModel } from "@/lib/cart/listingMoqModel";
/* ════════════════════════════════════
   COUPON DATA (fallback if API empty)
════════════════════════════════════ */
const COUPON_THEMES = new Set(["blue", "indigo", "green", "amber", "brown"]);

type BannerCoupon = {
  code: string;
  discount: string;
  label: string;
  condition: string;
  desc: string;
  theme: string;
};

const FALLBACK_COUPONS: BannerCoupon[] = [
  {
    code: "BULK7",
    discount: "Up to 12%",
    label: "OFF",
    condition: "Bulk packet tiers",
    desc: "7%–12% by quantity — see description on live coupons",
    theme: "blue",
  },
  {
    code: "BULK9",
    discount: "Up to 12%",
    label: "OFF",
    condition: "Mix cart lines",
    desc: "Thresholds use priced packet totals",
    theme: "indigo",
  },
  {
    code: "BULK12",
    discount: "Up to 12%",
    label: "OFF",
    condition: "Eligible catalogue lines",
    desc: "Configure in admin",
    theme: "green",
  },
];

function normalizeBannerCoupon(raw: Record<string, unknown>): BannerCoupon {
  const theme = typeof raw.theme === "string" && COUPON_THEMES.has(raw.theme) ? raw.theme : "blue";
  return {
    code: String(raw.code ?? ""),
    discount: String(raw.discount ?? ""),
    label: String(raw.label ?? ""),
    condition: String(raw.condition ?? ""),
    desc: String(raw.desc ?? ""),
    theme,
  };
}

/* ════════════════════════════════════
   CAROUSEL SLIDES — inline to avoid importing the full products bundle
════════════════════════════════════ */
const slides = [
  {
    tag: "🔥 Hot Selling", tagKey: "hot",
    product: { id: 1,  slug: "cable-nail-clips",  name: "Cable Nail Clips",               brand: "Hitech Square",               category: "Cable Clips",    description: "Cable nail clips for secure wire management on walls and ceilings.", image: "/Cable_Clip.png",      sellerId: "hitech-square", sellerName: "Hitech Square", firstWithGST: 9.30,   firstBasic: 7.88,  firstSize: "4MM",                       qtyPerBag: 750, pcsPerPacket: 100 },
  },
  {
    tag: "⭐ Most Popular", tagKey: "popular",
    product: { id: 6,  slug: "nylon-cable-ties",  name: "Nylon Cable Ties",               brand: "Hitech Square",               category: "Cable Clips",    description: "High-tensile nylon cable ties for bundling, organising, and securing cables and wires.",    image: "/Cable_Clip.png",      sellerId: "default", sellerName: "Hitech Square", firstWithGST: 10.95,  firstBasic: 9.28,  firstSize: "100 × 1.8mm (4\")",         qtyPerBag: 600, pcsPerPacket: 100 },
  },
  {
    tag: "🎁 Combo Products", tagKey: "combo",
    product: { id: 2,  slug: "double-nail-clamp", name: "Double Nail Clamps",             brand: "Hitech Square",               category: "Cable Clips",    description: "Heavy-duty double nail clamps for extra-strong, vibration-resistant cable fastening.",  image: "/Nail_Cable_Clip.png", sellerId: "default", sellerName: "Hitech Square", firstWithGST: 93.17,  firstBasic: 78.96, firstSize: "20MM",                      qtyPerBag: 65,  pcsPerPacket: 50  },
  },
  {
    tag: "💎 Sanitary Range", tagKey: "premium",
    product: { id: 9,  slug: "ball-valve-white",  name: "PP Solid White Ball Valve",      brand: "N-Star",                      category: "Sanitaryware",   description: "N-Star PP solid white ball valve — short/long handle and plain/threaded.",   image: "/Cable_Clip.png",      sellerId: "default", sellerName: "N-Star", firstWithGST: 32.97,  firstBasic: 27.94, firstSize: "15MM (1/2\") Short Handle Plain", qtyPerBag: 216, pcsPerPacket: 36  },
  },
  {
    tag: "🏆 Bestseller", tagKey: "best",
    product: { id: 4,  slug: "upvc-pipe-clamp",   name: "UPVC Pipe Fitting Clamps",       brand: "Hitech Square",               category: "Cable Clips",    description: "Clamps for secure fixing of UPVC pipe fittings to walls and surfaces.",   image: "/Cable_Clip.png",      sellerId: "default", sellerName: "Hitech Square", firstWithGST: 167.44, firstBasic: 141.90,firstSize: "U-1/2",                     qtyPerBag: 35,  pcsPerPacket: 100 },
  },
];

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
function CouponCard({ c }: { c: BannerCoupon }) {
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
        <button
          type="button"
          className={`${styles.couponCopy} ${styles[`couponCopy_${c.theme}`]}`}
          onClick={copy}
        >
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
  const productMin = { category: p.category } as Product;
  const sizeMin = {
    size: p.firstSize,
    basicPrice: p.firstBasic,
    withGST: p.firstWithGST,
    qtyPerBag: p.qtyPerBag,
    pcsPerPacket: p.pcsPerPacket,
  } as ProductSize;
  const heroLabels = resolvePackingUnitLabels(productMin, sizeMin);
  const brandPill = listingBrandPill(p.brand);
  const slidePillClass =
    brandPill === "HiTech"
      ? styles.slideListingBrandHitech
      : brandPill === "Tejas"
        ? styles.slideListingBrandTejas
        : styles.slideListingBrandNstar;

  return (
    <div className={styles.carousel} onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div key={active} className={`${styles.slideCard} ${styles[`tag_${s.tagKey}`]} ${styles[dir === "l" ? "animL" : "animR"]}`}>
        <span className={`${styles.slideTag} ${styles[`tagBg_${s.tagKey}`]}`}>{s.tag}</span>

        <Link href={`/products/${p.slug}`} className={styles.slideImg}>
          <Image src={p.image} alt={p.name} fill sizes="(max-width: 768px) 60vw, 30vw" style={{ objectFit:"contain", padding:"1.25rem" }} />
          <div className={`${styles.imgGlow} ${styles[`glow_${s.tagKey}`]}`} aria-hidden />
        </Link>

        <div className={styles.slideContent}>
          <span className={`${styles.slideListingBrand} ${slidePillClass}`}>
            {brandPill}
          </span>
          <h3 className={styles.slideName}>{productHeading(p.name, p.firstSize)}</h3>
          <p className={styles.slideDesc}>{p.description}</p>
          <div className={styles.slidePriceRow}>
            <div><span className={styles.slideFrom}>from </span><span className={styles.slidePrice}>₹{p.firstWithGST.toFixed(2)}</span><span className={styles.slideGst}> incl. GST / {heroLabels.inner}</span></div>
            <span className={styles.slideBasic}>₹{p.firstBasic.toFixed(2)} basic</span>
          </div>

          <div className={styles.slideCtaRow} onClick={(e) => e.stopPropagation()}>
            <ListingMoqCartControls
              model={heroSlideProductToModel(p)}
              labels={heroLabels}
              className={styles.slideListingMoq}
              compact
            />
          </div>
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
  const [bannerCoupons, setBannerCoupons] = useState<BannerCoupon[]>(FALLBACK_COUPONS);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/coupons?banner=1", { cache: "no-store" });
        const json = (await res.json()) as { data?: unknown[] };
        if (!res.ok || !Array.isArray(json.data) || json.data.length === 0 || cancelled) return;
        setBannerCoupons(json.data.map((row) => normalizeBannerCoupon(row as Record<string, unknown>)));
      } catch {
        /* keep fallback */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const couponRow = bannerCoupons.length > 0 ? bannerCoupons : FALLBACK_COUPONS;

  return (
    <section className={styles.hero}>
      {/* BG */}
      <div className={styles.bgImage}>
        <Image src="/banner-1.png" alt="Rajasthan Pipe Traders" fill
          sizes="100vw"
          style={{ objectFit:"cover", objectPosition:"center" }} priority />
      </div>
      <div className={styles.overlayLeft} aria-hidden />
      <div className={styles.overlayFull} aria-hidden />
      <div className={styles.bgGrid}      aria-hidden />

      {/* ══ COUPON STRIP — TOP ══ */}
      <div className={styles.couponBar}>
        <div className={styles.couponBarInner}>
          <div className={styles.couponRow}>
            {/* <div className={styles.couponBarLabel}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Exclusive Bulk Deals
            </div> */}
            {couponRow.map((c, i) => (
              <CouponCard key={`${c.code}-a-${i}`} c={c} />
            ))}
            {/* <div className={styles.couponBarLabel}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"/>
                <line x1="7" y1="7" x2="7.01" y2="7"/>
              </svg>
              Exclusive Bulk Deals
            </div> */}
            {couponRow.map((c, i) => (
              <CouponCard key={`${c.code}-b-${i}`} c={c} />
            ))}
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
            of <strong>premium fittings</strong>,Cable Clips, Ball Valves, Modular Boxes, Nylon Ties, Insulation Tape, Wall Plugs and more. 
            {/* With over 25 years of industry experience, we pride ourselves on delivering top-quality products at competitive prices.
            Direct manufacturer pricing with <strong>Pan India delivery</strong>. */}
          </p>

          

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
