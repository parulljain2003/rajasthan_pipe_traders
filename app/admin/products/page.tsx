"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaImageField } from "../components/MediaImageField";
import type { AdminCategory, AdminProduct } from "../types";

function parseOptionalJson(raw: string, label: string): unknown {
  const t = raw.trim();
  if (!t) return undefined;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    throw new Error(`Invalid JSON in ${label}`);
  }
}

const pageSize = 50;

const emptyForm = {
  sku: "",
  name: "",
  productKind: "sku" as "sku" | "catalog",
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
  discountTiersJson: "",
  sizesJson: "",
  sellersJson: "",
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
        discountTiersJson: p.discountTiers?.length ? JSON.stringify(p.discountTiers, null, 2) : "",
        sizesJson: p.sizes?.length ? JSON.stringify(p.sizes, null, 2) : "",
        sellersJson: p.sellers?.length ? JSON.stringify(p.sellers, null, 2) : "",
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
      const discountTiers = parseOptionalJson(form.discountTiersJson, "discount tiers") as
        | unknown[]
        | undefined;
      const sizes = parseOptionalJson(form.sizesJson, "sizes") as unknown[] | undefined;
      const sellers = parseOptionalJson(form.sellersJson, "sellers") as unknown[] | undefined;
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
        if (discountTiers !== undefined) body.discountTiers = discountTiers;
        if (sizes !== undefined) body.sizes = sizes;
        if (sellers !== undefined) body.sellers = sellers;
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
        if (discountTiers !== undefined) body.discountTiers = discountTiers;
        if (sizes !== undefined) body.sizes = sizes;
        if (sellers !== undefined) body.sellers = sellers;
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
            <form onSubmit={(e) => void handleSubmit(e)}>
              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="p-sku">SKU</label>
                  <input
                    id="p-sku"
                    value={form.sku}
                    onChange={(e) => setForm((f) => ({ ...f, sku: e.target.value }))}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="p-kind">Product kind</label>
                  <select
                    id="p-kind"
                    value={form.productKind}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        productKind: e.target.value as "sku" | "catalog",
                      }))
                    }
                  >
                    <option value="sku">sku (line item)</option>
                    <option value="catalog">catalog (grouped)</option>
                  </select>
                </div>
              </div>
              <div className="admin-field">
                <label htmlFor="p-name">Name</label>
                <input
                  id="p-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="p-slug">Slug (catalog / URL; optional)</label>
                <input
                  id="p-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="p-cat">Category</label>
                <select
                  id="p-cat"
                  value={form.categoryId}
                  onChange={(e) => setForm((f) => ({ ...f, categoryId: e.target.value }))}
                  required={!editingId}
                >
                  <option value="">Select…</option>
                  {categories.map((c) => (
                    <option key={c._id} value={c._id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="p-brand">Brand</label>
                  <input
                    id="p-brand"
                    value={form.brand}
                    onChange={(e) => setForm((f) => ({ ...f, brand: e.target.value }))}
                  />
                </div>
              </div>
              <MediaImageField
                label="Primary image (Cloudinary)"
                kind="product"
                productId={editingId ?? undefined}
                value={form.image}
                onUrlChange={(url) => setForm((f) => ({ ...f, image: url }))}
                helpText="Upload links the file in your media API when editing (productId). Set MEDIA_API_URL in .env.local."
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
                  className="code"
                  value={form.imagesJson}
                  onChange={(e) => setForm((f) => ({ ...f, imagesJson: e.target.value }))}
                  placeholder='["https://res.cloudinary.com/..."]'
                />
              </div>
              <div className="admin-field">
                <label htmlFor="p-desc">Description</label>
                <textarea
                  id="p-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="p-basic">Basic price</label>
                  <input
                    id="p-basic"
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
                    type="number"
                    step="any"
                    value={form.priceWithGst}
                    onChange={(e) => setForm((f) => ({ ...f, priceWithGst: e.target.value }))}
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="p-cur">Currency</label>
                  <input
                    id="p-cur"
                    value={form.currency}
                    onChange={(e) => setForm((f) => ({ ...f, currency: e.target.value }))}
                  />
                </div>
              </div>
              <p className="muted" style={{ fontSize: "0.8rem", marginBottom: "0.75rem" }}>
                Catalog variants: use JSON arrays matching{" "}
                <code>ProductSize</code> / <code>ProductSellerOffer</code> in{" "}
                <code>docs/FRONTEND_API_INTEGRATION.md</code> (<code>priceWithGst</code> per size).
              </p>
              <div className="admin-field">
                <label htmlFor="p-tiers">discountTiers (JSON array, optional)</label>
                <textarea
                  id="p-tiers"
                  className="code"
                  value={form.discountTiersJson}
                  onChange={(e) => setForm((f) => ({ ...f, discountTiersJson: e.target.value }))}
                  placeholder='[{"qty":"15 Cartons","discount":"7%"}]'
                />
              </div>
              <div className="admin-field">
                <label htmlFor="p-sizes">sizes (JSON array, optional)</label>
                <textarea
                  id="p-sizes"
                  className="code"
                  value={form.sizesJson}
                  onChange={(e) => setForm((f) => ({ ...f, sizesJson: e.target.value }))}
                />
              </div>
              <div className="admin-field">
                <label htmlFor="p-sellers">sellers (JSON array, optional)</label>
                <textarea
                  id="p-sellers"
                  className="code"
                  value={form.sellersJson}
                  onChange={(e) => setForm((f) => ({ ...f, sellersJson: e.target.value }))}
                />
              </div>
              <div className="admin-field" style={{ display: "flex", gap: "1.25rem", flexWrap: "wrap" }}>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.isNew}
                    onChange={(e) => setForm((f) => ({ ...f, isNew: e.target.checked }))}
                  />
                  New
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
