"use client";

import { useCallback, useEffect, useState } from "react";
import type { ApiDiscountTier, ApiProductSize, ApiProductSellerOffer } from "@/app/lib/api/types";
import { MediaImageField } from "../components/MediaImageField";
import type { AdminCategory, AdminProduct } from "../types";

const pageSize = 50;

type TierRow = { qty: string; discount: string };
type SizeRow = {
  size: string;
  basicPrice: string;
  priceWithGst: string;
  qtyPerBag: string;
  pcsPerPacket: string;
  note: string;
};
type SellerRow = {
  sellerId: string;
  sellerName: string;
  brand: string;
  minOrder: string;
  note: string;
  sizes: SizeRow[];
  discountTiers: TierRow[];
};

const emptyTierRow = (): TierRow => ({ qty: "", discount: "" });
const emptySizeRow = (): SizeRow => ({
  size: "",
  basicPrice: "",
  priceWithGst: "",
  qtyPerBag: "",
  pcsPerPacket: "",
  note: "",
});
const emptySellerRow = (): SellerRow => ({
  sellerId: "",
  sellerName: "",
  brand: "",
  minOrder: "",
  note: "",
  sizes: [],
  discountTiers: [],
});

function tierFromApi(x: unknown): TierRow {
  if (!x || typeof x !== "object") return emptyTierRow();
  const o = x as Record<string, unknown>;
  return {
    qty: typeof o.qty === "string" ? o.qty : o.qty != null ? String(o.qty) : "",
    discount: typeof o.discount === "string" ? o.discount : o.discount != null ? String(o.discount) : "",
  };
}

function sizeFromApi(x: unknown): SizeRow {
  if (!x || typeof x !== "object") return emptySizeRow();
  const o = x as Record<string, unknown>;
  const gst =
    typeof o.priceWithGst === "number"
      ? String(o.priceWithGst)
      : typeof (o as { withGST?: unknown }).withGST === "number"
        ? String((o as { withGST: number }).withGST)
        : "";
  return {
    size: typeof o.size === "string" ? o.size : "",
    basicPrice: typeof o.basicPrice === "number" ? String(o.basicPrice) : "",
    priceWithGst: gst,
    qtyPerBag: typeof o.qtyPerBag === "number" ? String(o.qtyPerBag) : "",
    pcsPerPacket: typeof o.pcsPerPacket === "number" ? String(o.pcsPerPacket) : "",
    note: typeof o.note === "string" ? o.note : "",
  };
}

function sellerFromApi(x: unknown): SellerRow {
  if (!x || typeof x !== "object") return emptySellerRow();
  const o = x as Record<string, unknown>;
  const sizesRaw = o.sizes;
  const tiersRaw = o.discountTiers;
  return {
    sellerId: typeof o.sellerId === "string" ? o.sellerId : "",
    sellerName: typeof o.sellerName === "string" ? o.sellerName : "",
    brand: typeof o.brand === "string" ? o.brand : "",
    minOrder: typeof o.minOrder === "string" ? o.minOrder : "",
    note: typeof o.note === "string" ? o.note : "",
    sizes: Array.isArray(sizesRaw) ? sizesRaw.map(sizeFromApi) : [],
    discountTiers: Array.isArray(tiersRaw) ? tiersRaw.map(tierFromApi) : [],
  };
}

function parseTierRow(r: TierRow): ApiDiscountTier | null {
  const qty = r.qty.trim();
  const discount = r.discount.trim();
  if (!qty && !discount) return null;
  if (!qty || !discount) {
    throw new Error("Discount tiers: each row needs both a quantity label and a discount, or clear the row.");
  }
  return { qty, discount };
}

function parseSizeRow(r: SizeRow): ApiProductSize | null {
  const size = r.size.trim();
  const bp = r.basicPrice.trim();
  const gst = r.priceWithGst.trim();
  const qpb = r.qtyPerBag.trim();
  const ppp = r.pcsPerPacket.trim();
  const note = r.note.trim();

  if (!size && !bp && !gst && !qpb && !ppp && !note) return null;
  if (!size || !bp || !gst) {
    throw new Error("Sizes: each row needs a size label, basic price, and price with GST (or remove the row).");
  }
  const basicPrice = Number(bp);
  const priceWithGst = Number(gst);
  if (Number.isNaN(basicPrice) || Number.isNaN(priceWithGst)) {
    throw new Error("Sizes: basic price and price with GST must be valid numbers.");
  }
  const out: ApiProductSize = { size, basicPrice, priceWithGst };
  if (qpb !== "") {
    const n = Number(qpb);
    if (Number.isNaN(n)) throw new Error("Sizes: qty per bag must be a number when set.");
    out.qtyPerBag = n;
  }
  if (ppp !== "") {
    const n = Number(ppp);
    if (Number.isNaN(n)) throw new Error("Sizes: pieces per packet must be a number when set.");
    out.pcsPerPacket = n;
  }
  if (note) out.note = note;
  return out;
}

function sellerRowHasNestedContent(s: SellerRow): boolean {
  return (
    s.sizes.some((z) => Object.values(z).some((v) => String(v).trim() !== "")) ||
    s.discountTiers.some((t) => t.qty.trim() !== "" || t.discount.trim() !== "")
  );
}

function parseSellerRow(s: SellerRow): ApiProductSellerOffer | null {
  const sellerId = s.sellerId.trim();
  const sellerName = s.sellerName.trim();
  const brand = s.brand.trim();
  const minOrder = s.minOrder.trim();
  const note = s.note.trim();
  const headerEmpty = !sellerId && !sellerName && !brand && !minOrder && !note;
  if (headerEmpty && !sellerRowHasNestedContent(s)) return null;
  if (!sellerId || !sellerName || !brand) {
    throw new Error("Sellers: each offer needs seller ID, display name, and brand (or remove the offer).");
  }
  const sizes: ApiProductSize[] = [];
  for (const row of s.sizes) {
    const parsed = parseSizeRow(row);
    if (parsed) sizes.push(parsed);
  }
  const discountTiers: ApiDiscountTier[] = [];
  for (const row of s.discountTiers) {
    const parsed = parseTierRow(row);
    if (parsed) discountTiers.push(parsed);
  }
  const out: ApiProductSellerOffer = { sellerId, sellerName, brand, sizes };
  if (discountTiers.length) out.discountTiers = discountTiers;
  if (minOrder) out.minOrder = minOrder;
  if (note) out.note = note;
  return out;
}

function buildCatalogPayload(form: {
  discountTiers: TierRow[];
  sizes: SizeRow[];
  sellers: SellerRow[];
}): {
  discountTiers: ApiDiscountTier[];
  sizes: ApiProductSize[];
  sellers: ApiProductSellerOffer[];
} {
  const discountTiers: ApiDiscountTier[] = [];
  for (const row of form.discountTiers) {
    const p = parseTierRow(row);
    if (p) discountTiers.push(p);
  }
  const sizes: ApiProductSize[] = [];
  for (const row of form.sizes) {
    const p = parseSizeRow(row);
    if (p) sizes.push(p);
  }
  const sellers: ApiProductSellerOffer[] = [];
  for (const row of form.sellers) {
    const p = parseSellerRow(row);
    if (p) sellers.push(p);
  }
  return { discountTiers, sizes, sellers };
}

function DiscountTiersBlock({
  rows,
  onChange,
  title,
  hint,
  nested,
}: {
  rows: TierRow[];
  onChange: (next: TierRow[]) => void;
  title: string;
  hint: string;
  nested?: boolean;
}) {
  const update = (i: number, patch: Partial<TierRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const wrap = nested ? "admin-catalog-nested" : "admin-catalog-section";
  return (
    <div className={wrap}>
      <div
        className="admin-catalog-toolbar"
        style={{ justifyContent: "space-between", width: "100%" }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={() => onChange([...rows, emptyTierRow()])}
        >
          Add tier
        </button>
      </div>
      <p className="admin-catalog-hint">{hint}</p>
      {rows.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
          No tiers yet. Use “Add tier” for volume discounts (optional).
        </p>
      ) : (
        rows.map((row, i) => (
          <div
            key={i}
            className="admin-field-row"
            style={{ alignItems: "flex-end", marginBottom: "0.5rem" }}
          >
            <div className="admin-field" style={{ flex: 2, minWidth: "140px" }}>
              <label>Quantity / volume label</label>
              <input
                className="admin-input"
                value={row.qty}
                onChange={(e) => update(i, { qty: e.target.value })}
                placeholder='e.g. 15 Cartons'
              />
            </div>
            <div className="admin-field" style={{ minWidth: "100px" }}>
              <label>Discount</label>
              <input
                className="admin-input"
                value={row.discount}
                onChange={(e) => update(i, { discount: e.target.value })}
                placeholder="e.g. 7%"
              />
            </div>
            <div className="admin-field admin-field-shrink">
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-icon"
                onClick={() => remove(i)}
                aria-label="Remove tier"
              >
                ✕
              </button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function SizesBlock({
  rows,
  onChange,
  title,
  hint,
  nested,
}: {
  rows: SizeRow[];
  onChange: (next: SizeRow[]) => void;
  title: string;
  hint: string;
  nested?: boolean;
}) {
  const update = (i: number, patch: Partial<SizeRow>) =>
    onChange(rows.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  const remove = (i: number) => onChange(rows.filter((_, j) => j !== i));
  const wrap = nested ? "admin-catalog-nested" : "admin-catalog-section";
  return (
    <div className={wrap}>
      <div
        className="admin-catalog-toolbar"
        style={{ justifyContent: "space-between", width: "100%" }}
      >
        <h3 style={{ margin: 0 }}>{title}</h3>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={() => onChange([...rows, emptySizeRow()])}
        >
          Add size
        </button>
      </div>
      <p className="admin-catalog-hint">{hint}</p>
      {rows.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
          No size rows yet. Add one row per buyable variant.
        </p>
      ) : (
        <div className="admin-mini-table-wrap">
          <table className="admin-mini-table">
            <thead>
              <tr>
                <th>Size</th>
                <th>Basic ₹</th>
                <th>GST ₹</th>
                <th>Qty / bag</th>
                <th>Pcs / pkt</th>
                <th>Note</th>
                <th className="admin-sr-only">Remove</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => (
                <tr key={i}>
                  <td>
                    <input
                      className="admin-input"
                      value={row.size}
                      onChange={(e) => update(i, { size: e.target.value })}
                      placeholder="4MM"
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="number"
                      step="any"
                      value={row.basicPrice}
                      onChange={(e) => update(i, { basicPrice: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="number"
                      step="any"
                      value={row.priceWithGst}
                      onChange={(e) => update(i, { priceWithGst: e.target.value })}
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="number"
                      step="any"
                      value={row.qtyPerBag}
                      onChange={(e) => update(i, { qtyPerBag: e.target.value })}
                      placeholder="—"
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      type="number"
                      step="any"
                      value={row.pcsPerPacket}
                      onChange={(e) => update(i, { pcsPerPacket: e.target.value })}
                      placeholder="—"
                    />
                  </td>
                  <td>
                    <input
                      className="admin-input"
                      value={row.note}
                      onChange={(e) => update(i, { note: e.target.value })}
                      placeholder="—"
                    />
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost admin-btn-icon"
                      onClick={() => remove(i)}
                      aria-label="Remove size row"
                    >
                      ✕
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function SellersBlock({
  sellers,
  onChange,
}: {
  sellers: SellerRow[];
  onChange: (next: SellerRow[]) => void;
}) {
  const updateSeller = (i: number, patch: Partial<SellerRow>) =>
    onChange(sellers.map((s, j) => (j === i ? { ...s, ...patch } : s)));
  const removeSeller = (i: number) => onChange(sellers.filter((_, j) => j !== i));
  return (
    <div className="admin-catalog-section">
      <div
        className="admin-catalog-toolbar"
        style={{ justifyContent: "space-between", width: "100%" }}
      >
        <h3 style={{ margin: 0 }}>Seller offers</h3>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={() => onChange([...sellers, emptySellerRow()])}
        >
          Add seller
        </button>
      </div>
      <p className="admin-catalog-hint">
        Optional: separate price lists per supplier (e.g. Hitech vs Tejas). Each seller has its own
        sizes and discount tiers.
      </p>
      {sellers.length === 0 ? (
        <p className="muted" style={{ fontSize: "0.8rem", margin: 0 }}>
          No seller offers. Use product-level sizes above if you only have one supplier.
        </p>
      ) : (
        sellers.map((seller, i) => (
          <div key={i} className="admin-catalog-card">
            <div
              className="admin-catalog-toolbar"
              style={{ justifyContent: "space-between", width: "100%", marginBottom: "0.5rem" }}
            >
              <p className="admin-catalog-card-title" style={{ margin: 0 }}>
                Seller {i + 1}
              </p>
              <button
                type="button"
                className="admin-btn admin-btn-ghost admin-btn-danger"
                onClick={() => removeSeller(i)}
              >
                Remove seller
              </button>
            </div>
            <div className="admin-field-row">
              <div className="admin-field">
                <label>Seller ID (stable key)</label>
                <input
                  className="admin-input"
                  value={seller.sellerId}
                  onChange={(e) => updateSeller(i, { sellerId: e.target.value })}
                  placeholder="hitech"
                />
              </div>
              <div className="admin-field">
                <label>Display name</label>
                <input
                  className="admin-input"
                  value={seller.sellerName}
                  onChange={(e) => updateSeller(i, { sellerName: e.target.value })}
                  placeholder="Hitech"
                />
              </div>
              <div className="admin-field">
                <label>Brand label</label>
                <input
                  className="admin-input"
                  value={seller.brand}
                  onChange={(e) => updateSeller(i, { brand: e.target.value })}
                />
              </div>
            </div>
            <div className="admin-field-row">
              <div className="admin-field">
                <label>Min order (optional)</label>
                <input
                  className="admin-input"
                  value={seller.minOrder}
                  onChange={(e) => updateSeller(i, { minOrder: e.target.value })}
                />
              </div>
              <div className="admin-field" style={{ flex: 2 }}>
                <label>Note (optional)</label>
                <input
                  className="admin-input"
                  value={seller.note}
                  onChange={(e) => updateSeller(i, { note: e.target.value })}
                />
              </div>
            </div>
            <SizesBlock
              nested
              title="Sizes for this seller"
              hint="Same columns as product-level sizes: one row per variant for this supplier."
              rows={seller.sizes}
              onChange={(next) => updateSeller(i, { sizes: next })}
            />
            <DiscountTiersBlock
              nested
              title="Discount tiers for this seller"
              hint="Volume discounts that apply to this seller’s offer only."
              rows={seller.discountTiers}
              onChange={(next) => updateSeller(i, { discountTiers: next })}
            />
          </div>
        ))
      )}
    </div>
  );
}

const emptyForm = {
  sku: "",
  name: "",
  productKind: "catalog" as "sku" | "catalog",
  slug: "",
  categoryId: "",
  description: "",
  brand: "",
  image: "",
  basicPrice: "",
  priceWithGst: "",
  currency: "INR",
  isActive: true,
  isNew: false,
  discountTiers: [] as TierRow[],
  sizes: [] as SizeRow[],
  sellers: [] as SellerRow[],
  imagesJson: "[]",
};

export default function AdminProductsPage() {
  const [categories, setCategories] = useState<AdminCategory[]>([]);
  const [list, setList] = useState<AdminProduct[]>([]);
  const [meta, setMeta] = useState({ total: 0, skip: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const loadCategories = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/categories?includeInactive=true");
      const json = await res.json();
      if (!res.ok) return;
      setCategories(json.data as AdminCategory[]);
    } catch {
      /* ignore */
    }
  }, []);

  const loadProducts = useCallback(async (skip: number) => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ limit: String(pageSize), skip: String(skip) });
      const res = await fetch(`/api/admin/products?${q}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      setList(json.data as AdminProduct[]);
      setMeta({
        total: json.meta?.total ?? 0,
        skip: json.meta?.skip ?? skip,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadCategories();
  }, [loadCategories]);

  useEffect(() => {
    void loadProducts(0);
  }, [loadProducts]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setModalOpen(true);
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      const p = json.data as AdminProduct & {
        longDescription?: string;
        discountTiers?: unknown[];
        sizes?: unknown[];
        sellers?: unknown[];
      };
      setEditingId(id);
      const tiers = Array.isArray(p.discountTiers) ? p.discountTiers.map(tierFromApi) : [];
      const sizes = Array.isArray(p.sizes) ? p.sizes.map(sizeFromApi) : [];
      const sellers = Array.isArray(p.sellers) ? p.sellers.map(sellerFromApi) : [];
      setForm({
        sku: p.sku,
        name: p.name,
        productKind: p.productKind,
        slug: p.slug ?? "",
        categoryId: p.category?._id ?? "",
        description: p.description ?? "",
        brand: p.brand ?? "",
        image: p.image ?? "",
        basicPrice: String(p.pricing?.basicPrice ?? ""),
        priceWithGst: String(p.pricing?.priceWithGst ?? ""),
        currency: p.pricing?.currency ?? "INR",
        isActive: p.isActive,
        isNew: Boolean(p.isNew),
        discountTiers: tiers,
        sizes,
        sellers,
        imagesJson: p.images?.length ? JSON.stringify(p.images, null, 2) : "[]",
      });
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load product");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const basicPrice = Number(form.basicPrice);
      const priceWithGst = Number(form.priceWithGst);
      if (Number.isNaN(basicPrice) || Number.isNaN(priceWithGst)) {
        throw new Error("Pricing must be valid numbers");
      }
      const catalog = buildCatalogPayload(form);
      let imagesList: string[];
      try {
        const raw = form.imagesJson.trim() || "[]";
        const parsed = JSON.parse(raw) as unknown;
        if (!Array.isArray(parsed)) throw new Error("Gallery images must be a JSON array");
        imagesList = parsed.filter((x): x is string => typeof x === "string");
      } catch (e) {
        throw e instanceof SyntaxError ? new Error("Invalid JSON in gallery images") : e;
      }

      if (editingId) {
        const body: Record<string, unknown> = {
          sku: form.sku.trim().toUpperCase(),
          name: form.name.trim(),
          productKind: form.productKind,
          slug: form.slug.trim().toLowerCase() || undefined,
          category: form.categoryId,
          description: form.description.trim() || undefined,
          brand: form.brand.trim() || undefined,
          image: form.image.trim() || undefined,
          isActive: form.isActive,
          isNew: form.isNew,
          pricing: {
            basicPrice,
            priceWithGst,
            currency: form.currency.trim() || "INR",
          },
        };
        body.discountTiers = catalog.discountTiers;
        body.sizes = catalog.sizes;
        body.sellers = catalog.sellers;
        body.images = imagesList;

        const res = await fetch(`/api/admin/products/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || res.statusText);
      } else {
        if (!form.categoryId) throw new Error("Category is required");
        const body: Record<string, unknown> = {
          sku: form.sku.trim().toUpperCase(),
          name: form.name.trim(),
          productKind: form.productKind,
          slug: form.slug.trim().toLowerCase() || undefined,
          category: form.categoryId,
          description: form.description.trim() || undefined,
          brand: form.brand.trim() || undefined,
          image: form.image.trim() || undefined,
          isActive: form.isActive,
          isNew: form.isNew,
          pricing: {
            basicPrice,
            priceWithGst,
            currency: form.currency.trim() || "INR",
          },
        };
        if (catalog.discountTiers.length) body.discountTiers = catalog.discountTiers;
        if (catalog.sizes.length) body.sizes = catalog.sizes;
        if (catalog.sellers.length) body.sellers = catalog.sellers;
        body.images = imagesList;

        const res = await fetch("/api/admin/products", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || res.statusText);
      }
      setModalOpen(false);
      await loadProducts(meta.skip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this product?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      await loadProducts(meta.skip);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const canPrev = meta.skip > 0;
  const canNext = meta.skip + list.length < meta.total;

  return (
    <div>
      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-toolbar">
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
          New product
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          onClick={() => void loadProducts(meta.skip)}
          disabled={loading}
        >
          Refresh
        </button>
        <span className="muted" style={{ fontSize: "0.875rem" }}>
          {meta.total} product(s) total
        </span>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Img</th>
                  <th>SKU</th>
                  <th>Name</th>
                  <th>Category</th>
                  <th>Kind</th>
                  <th>Price (GST)</th>
                  <th>Active</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {list.map((p) => (
                  <tr key={p._id}>
                    <td>
                      {p.image ? <img src={p.image} alt="" className="admin-thumb" /> : "—"}
                    </td>
                    <td>
                      <code style={{ fontSize: "0.8rem" }}>{p.sku}</code>
                    </td>
                    <td>{p.name}</td>
                    <td>{p.category?.name ?? "—"}</td>
                    <td>{p.productKind}</td>
                    <td>₹{p.pricing?.priceWithGst ?? "—"}</td>
                    <td>{p.isActive ? "Yes" : "No"}</td>
                    <td style={{ whiteSpace: "nowrap" }}>
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        style={{ marginRight: 6 }}
                        onClick={() => void openEdit(p._id)}
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        className="admin-btn admin-btn-danger"
                        onClick={() => void handleDelete(p._id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {list.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No products.</p> : null}
          </div>
          <div className="admin-pagination">
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={!canPrev || loading}
              onClick={() => void loadProducts(Math.max(0, meta.skip - pageSize))}
            >
              Previous
            </button>
            <span>
              Showing {list.length ? meta.skip + 1 : 0}–{meta.skip + list.length} of {meta.total}
            </span>
            <button
              type="button"
              className="admin-btn admin-btn-ghost"
              disabled={!canNext || loading}
              onClick={() => void loadProducts(meta.skip + pageSize)}
            >
              Next
            </button>
          </div>
        </>
      )}

      {modalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setModalOpen(false);
          }}
        >
          <div className="admin-modal wide" role="dialog" aria-labelledby="prod-modal-title">
            <h2 id="prod-modal-title">{editingId ? "Edit product" : "New product"}</h2>
            <form className="admin-modal-form" onSubmit={(e) => void handleSubmit(e)}>
              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Product details</h3>
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label htmlFor="p-sku">SKU</label>
                    <input
                      id="p-sku"
                      className="admin-input"
                      value={form.sku}
                      onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                      required
                      autoComplete="off"
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="p-kind">Product kind</label>
                    <select
                      id="p-kind"
                      className="admin-input admin-select"
                      value={form.productKind}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          productKind: e.target.value as "sku" | "catalog",
                        }))
                      }
                    >
                      <option value="catalog">Catalog (grouped / variants)</option>
                      <option value="sku">SKU (single line item)</option>
                    </select>
                  </div>
                </div>
                <div className="admin-field">
                  <label htmlFor="p-name">Name</label>
                  <input
                    id="p-name"
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="p-slug">Slug (URL; optional)</label>
                  <input
                    id="p-slug"
                    className="admin-input"
                    value={form.slug}
                    onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                    placeholder="e.g. cable-nail-clips"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="p-cat">Category</label>
                  <select
                    id="p-cat"
                    className="admin-input admin-select"
                    value={form.categoryId}
                    onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                    required={!editingId}
                  >
                    <option value="">Select category…</option>
                    {categories.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="p-brand">Brand</label>
                  <input
                    id="p-brand"
                    className="admin-input"
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                    placeholder="Optional"
                  />
                </div>
              </div>

              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Images &amp; description</h3>
              <MediaImageField
                label="Primary image (Cloudinary)"
                kind="product"
                productId={editingId ?? undefined}
                value={form.image}
                onUrlChange={(url) => setForm((f) => ({ ...f, image: url }))}
                helpText="Uploads to Cloudinary (folder rpt/product/…). Set CLOUDINARY_URL in .env.local. When editing, images are scoped under this product’s id."
              />
              <MediaImageField
                label="Add to image gallery"
                kind="product"
                productId={editingId ?? undefined}
                value=""
                showUrlInput={false}
                trackMediaId={false}
                onUrlChange={(url) =>
                  setForm((f) => {
                    let arr: string[] = [];
                    try {
                      const p = JSON.parse(f.imagesJson.trim() || "[]") as unknown;
                      if (Array.isArray(p)) arr = p.filter((x): x is string => typeof x === "string");
                    } catch {
                      arr = [];
                    }
                    return { ...f, imagesJson: JSON.stringify([...arr, url], null, 2) };
                  })
                }
                helpText="Each upload appends a URL to the gallery JSON below. Remove URLs by editing the JSON."
              />
              <div className="admin-field">
                <label htmlFor="p-images-json">Gallery image URLs (JSON array)</label>
                <textarea
                  id="p-images-json"
                  className="admin-input admin-textarea-code"
                  value={form.imagesJson}
                  onChange={(e) => setForm((f) => ({ ...f, imagesJson: e.target.value }))}
                  placeholder='["https://res.cloudinary.com/..."]'
                />
              </div>
              <div className="admin-field">
                <label htmlFor="p-desc">Description</label>
                <textarea
                  id="p-desc"
                  className="admin-input"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  placeholder="Short product description"
                />
              </div>
              </div>

              <div className="admin-form-section">
                <h3 className="admin-form-section-title">Base pricing</h3>
                <div className="admin-field-row">
                  <div className="admin-field">
                    <label htmlFor="p-basic">Basic price</label>
                    <input
                      id="p-basic"
                      className="admin-input"
                      type="number"
                      step="any"
                      value={form.basicPrice}
                      onChange={(e) => setForm((f) => ({ ...f, basicPrice: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="admin-field">
                    <label htmlFor="p-gst">Price with GST</label>
                    <input
                      id="p-gst"
                      className="admin-input"
                      type="number"
                      step="any"
                      value={form.priceWithGst}
                      onChange={(e) => setForm((f) => ({ ...f, priceWithGst: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="admin-field" style={{ maxWidth: "8rem" }}>
                    <label htmlFor="p-cur">Currency</label>
                    <input
                      id="p-cur"
                      className="admin-input"
                      value={form.currency}
                      onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                    />
                  </div>
                </div>
              </div>

              <div
                className={`admin-catalog-offers-wrap${form.productKind === "sku" ? " admin-catalog-offers-muted" : ""}`}
              >
                <h3 className="admin-catalog-offers-heading">Catalog pricing &amp; offers</h3>
                <p className="admin-catalog-hint" style={{ marginTop: 0 }}>
                  Used for <strong>catalog</strong> products (variant grid and multi-seller lists). SKU-only
                  lines can stay empty. Reference:{" "}
                  <code style={{ fontSize: "0.78rem" }}>docs/FRONTEND_API_INTEGRATION.md</code>.
                </p>
                <DiscountTiersBlock
                  title="Product discount tiers"
                  hint='Volume steps at product level — e.g. quantity label "15 Cartons" and discount "7%".'
                  rows={form.discountTiers}
                  onChange={(discountTiers) => setForm((f) => ({ ...f, discountTiers }))}
                />
                <SizesBlock
                  title="Product sizes (variants)"
                  hint="One row per buyable size: label, basic price, price with GST. Optional packing columns and note."
                  rows={form.sizes}
                  onChange={(sizes) => setForm((f) => ({ ...f, sizes }))}
                />
                <SellersBlock
                  sellers={form.sellers}
                  onChange={(sellers) => setForm((f) => ({ ...f, sellers }))}
                />
              </div>

              <div className="admin-form-section admin-form-section-inline">
                <label className="admin-check admin-check-pill">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active on storefront
                </label>
                <label className="admin-check admin-check-pill">
                  <input
                    type="checkbox"
                    checked={form.isNew}
                    onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))}
                  />
                  Mark as new
                </label>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}
    </div>
  );
}
