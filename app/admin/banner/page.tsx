"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { BannerBackgroundCloud } from "@/app/admin/components/cloud";

type StatRow = { value: string; label: string };

type CarouselRow = { tag: string; tagKey: string; productId: string };

type ProductOption = {
  id: string;
  name: string;
  sku?: string;
  categoryName: string;
};

const TAG_KEY_OPTIONS: { value: string; label: string }[] = [
  { value: "hot", label: "Hot (red)" },
  { value: "popular", label: "Popular" },
  { value: "combo", label: "Combo" },
  { value: "premium", label: "Premium" },
  { value: "best", label: "Bestseller" },
];

async function fetchAllProductOptions(): Promise<ProductOption[]> {
  const out: ProductOption[] = [];
  const limit = 500;
  let skip = 0;
  let total = 0;
  do {
    const res = await fetch(`/api/admin/products?limit=${limit}&skip=${skip}&isActive=true`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(typeof j.message === "string" ? j.message : "Failed to load products");
    }
    const json = (await res.json()) as {
      data?: Array<{
        _id: string;
        name: string;
        sku?: string;
        category?: { name?: string };
      }>;
      meta?: { total?: number };
    };
    const rows = json.data ?? [];
    total = typeof json.meta?.total === "number" ? json.meta.total : skip + rows.length;
    for (const p of rows) {
      const categoryName = typeof p.category?.name === "string" ? p.category.name : "";
      out.push({
        id: String(p._id),
        name: p.name,
        sku: p.sku,
        categoryName,
      });
    }
    skip += rows.length;
    if (rows.length === 0) break;
  } while (skip < total);
  return out;
}

export default function AdminBannerPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const [trustBadgeText, setTrustBadgeText] = useState("");
  const [headlinePart1, setHeadlinePart1] = useState("");
  const [headlinePart2, setHeadlinePart2] = useState("");
  const [tagline, setTagline] = useState("");
  const [subtextHtml, setSubtextHtml] = useState("");
  const [stats, setStats] = useState<StatRow[]>([]);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");
  const [carouselSlides, setCarouselSlides] = useState<CarouselRow[]>([]);

  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [productSearch, setProductSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bannerRes, products] = await Promise.all([
        fetch("/api/admin/banner"),
        fetchAllProductOptions(),
      ]);
      const json = await bannerRes.json();
      console.log("json", json);
      if (!bannerRes.ok) throw new Error(typeof json.message === "string" ? json.message : bannerRes.statusText);
      const d = json.data as {
        trustBadgeText: string;
        headlinePart1: string;
        headlinePart2: string;
        tagline: string;
        subtextHtml: string;
        stats: StatRow[];
        backgroundImageUrl: string;
        carouselSlides: CarouselRow[];
      };
      setTrustBadgeText(d.trustBadgeText);
      setHeadlinePart1(d.headlinePart1);
      setHeadlinePart2(d.headlinePart2);
      setTagline(d.tagline);
      setSubtextHtml(d.subtextHtml);
      setStats(d.stats?.length ? d.stats : [{ value: "", label: "" }]);
      setBackgroundImageUrl(d.backgroundImageUrl);
      setCarouselSlides(
        d.carouselSlides?.length
          ? d.carouselSlides
          : [{ tag: "🔥 Hot Selling", tagKey: "hot", productId: "" }]
      );
      setProductOptions(products);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.trim().toLowerCase();
    if (!q) return productOptions;
    return productOptions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q)) ||
        p.categoryName.toLowerCase().includes(q)
    );
  }, [productOptions, productSearch]);

  function updateStat(i: number, field: keyof StatRow, value: string) {
    setStats((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], [field]: value };
      return next;
    });
  }

  function addStat() {
    setStats((prev) => [...prev, { value: "", label: "" }]);
  }

  function removeStat(i: number) {
    setStats((prev) => prev.filter((_, j) => j !== i));
  }

  function addSlide() {
    setCarouselSlides((prev) => [...prev, { tag: "", tagKey: "hot", productId: "" }]);
  }

  function removeSlide(i: number) {
    setCarouselSlides((prev) => prev.filter((_, j) => j !== i));
  }

  function updateSlide(i: number, patch: Partial<CarouselRow>) {
    setCarouselSlides((prev) => {
      const next = [...prev];
      next[i] = { ...next[i], ...patch };
      return next;
    });
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const cleanStats = stats
        .map((s) => ({ value: s.value.trim(), label: s.label.trim() }))
        .filter((s) => s.value && s.label);
      const cleanSlides = carouselSlides
        .map((s) => ({
          tag: s.tag.trim(),
          tagKey: s.tagKey.trim(),
          productId: s.productId.trim(),
        }))
        .filter((s) => s.tag && s.productId);

      const res = await fetch("/api/admin/banner", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          trustBadgeText,
          headlinePart1,
          headlinePart2,
          tagline,
          subtextHtml,
          stats: cleanStats,
          backgroundImageUrl,
          carouselSlides: cleanSlides,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(typeof json.message === "string" ? json.message : res.statusText);
      const d = json.data;
      setTrustBadgeText(d.trustBadgeText);
      setHeadlinePart1(d.headlinePart1);
      setHeadlinePart2(d.headlinePart2);
      setTagline(d.tagline);
      setSubtextHtml(d.subtextHtml);
      setStats(d.stats);
      setBackgroundImageUrl(d.backgroundImageUrl);
      setCarouselSlides(
        d.carouselSlides?.length
          ? d.carouselSlides
          : [{ tag: "🔥 Hot Selling", tagKey: "hot", productId: "" }]
      );
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Home banner</h1>
      <p className="muted" style={{ maxWidth: "42rem" }}>
        Hero copy, statistics, background image URL, and the featured-product carousel. Carousel products are loaded
        from the catalog (live prices and cart). Use a path like <code>/banner-1.png</code> or a Cloudinary URL for the
        background.
      </p>

      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}
      {saved ? (
        <div className="admin-banner" role="status">
          Saved.
        </div>
      ) : null}

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <form onSubmit={(e) => void handleSave(e)} className="admin-form-section" style={{ maxWidth: "48rem" }}>
          <p className="admin-form-section-title">Trust & headline</p>
          <div className="admin-field">
            <label htmlFor="trust">Trust badge</label>
            <input
              id="trust"
              className="admin-input"
              value={trustBadgeText}
              onChange={(e) => setTrustBadgeText(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="h1a">Headline — first part</label>
            <input
              id="h1a"
              className="admin-input"
              value={headlinePart1}
              onChange={(e) => setHeadlinePart1(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="h1b">Headline — second part (e.g. “Pipe Traders”; a space is added after the first part)</label>
            <input
              id="h1b"
              className="admin-input"
              value={headlinePart2}
              onChange={(e) => setHeadlinePart2(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="tag">Tagline</label>
            <input
              id="tag"
              className="admin-input"
              value={tagline}
              onChange={(e) => setTagline(e.target.value)}
              autoComplete="off"
            />
          </div>
          <div className="admin-field">
            <label htmlFor="sub">Intro paragraph (HTML allowed, e.g. &lt;strong&gt;)</label>
            <textarea
              id="sub"
              className="admin-input"
              rows={4}
              value={subtextHtml}
              onChange={(e) => setSubtextHtml(e.target.value)}
            />
          </div>

          <p className="admin-form-section-title">Background</p>
          <BannerBackgroundCloud
            value={backgroundImageUrl}
            onUrlChange={setBackgroundImageUrl}
            getPatchPayload={() => ({
              trustBadgeText,
              headlinePart1,
              headlinePart2,
              tagline,
              subtextHtml,
              stats,
              carouselSlides,
            })}
            onPersisted={() => {
              setSaved(true);
              setError(null);
            }}
          />

          <p className="admin-form-section-title">Statistics</p>
          {stats.map((s, i) => (
            <div key={i} className="admin-field" style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}>
              <div style={{ flex: 1 }}>
                <label htmlFor={`sv-${i}`}>Value</label>
                <input
                  id={`sv-${i}`}
                  className="admin-input"
                  value={s.value}
                  onChange={(e) => updateStat(i, "value", e.target.value)}
                />
              </div>
              <div style={{ flex: 1 }}>
                <label htmlFor={`sl-${i}`}>Label</label>
                <input
                  id={`sl-${i}`}
                  className="admin-input"
                  value={s.label}
                  onChange={(e) => updateStat(i, "label", e.target.value)}
                />
              </div>
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => removeStat(i)}>
                Remove
              </button>
            </div>
          ))}
          <button type="button" className="admin-btn admin-btn-ghost" onClick={addStat}>
            Add stat
          </button>

          <p className="admin-form-section-title">Featured carousel</p>
          <p className="muted" style={{ marginTop: 0 }}>
            Each row: badge text, colour theme, and catalog product. Order is preserved. Empty carousel falls back to
            built-in demo slides on the storefront.
          </p>
          <div className="admin-field">
            <label htmlFor="ps">Filter products</label>
            <input
              id="ps"
              className="admin-input"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Search by name, SKU, category…"
              autoComplete="off"
            />
          </div>

          {carouselSlides.map((row, i) => (
            <div
              key={i}
              className="admin-field"
              style={{
                border: "1px solid var(--admin-border, #e2e8f0)",
                borderRadius: 8,
                padding: "0.75rem",
                marginBottom: "0.5rem",
              }}
            >
              <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", alignItems: "flex-end" }}>
                <div style={{ flex: "1 1 12rem" }}>
                  <label htmlFor={`ct-${i}`}>Badge (e.g. 🔥 Hot Selling)</label>
                  <input
                    id={`ct-${i}`}
                    className="admin-input"
                    value={row.tag}
                    onChange={(e) => updateSlide(i, { tag: e.target.value })}
                  />
                </div>
                <div style={{ flex: "0 1 10rem" }}>
                  <label htmlFor={`ck-${i}`}>Theme</label>
                  <select
                    id={`ck-${i}`}
                    className="admin-input"
                    value={row.tagKey}
                    onChange={(e) => updateSlide(i, { tagKey: e.target.value })}
                  >
                    {TAG_KEY_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div style={{ flex: "1 1 16rem" }}>
                  <label htmlFor={`cp-${i}`}>Product</label>
                  <select
                    id={`cp-${i}`}
                    className="admin-input"
                    value={row.productId}
                    onChange={(e) => updateSlide(i, { productId: e.target.value })}
                  >
                    <option value="">— Select —</option>
                    {filteredProducts.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.sku ? ` (${p.sku})` : ""}
                        {p.categoryName ? ` — ${p.categoryName}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => removeSlide(i)}>
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button type="button" className="admin-btn admin-btn-ghost" onClick={addSlide}>
            Add slide
          </button>

          <div style={{ marginTop: "1.25rem" }}>
            <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save banner"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
