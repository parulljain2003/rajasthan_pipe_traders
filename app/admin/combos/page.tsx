"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminCombo, ComboRequirementForm } from "../types";

type ProductOption = { id: string; name: string; sku: string };

const emptyReq = (): ComboRequirementForm => ({
  productId: "",
  thresholdKind: "bag",
  minOuterUnits: "1",
});

const emptyForm = () => ({
  name: "",
  priority: "100",
  isActive: true,
  beneficiaryProductId: "",
  beneficiaryDiscountType: "percentage" as "percentage" | "flat",
  beneficiaryDiscountValue: "",
  requirements: [emptyReq()] as ComboRequirementForm[],
});

async function fetchAllProductOptions(): Promise<ProductOption[]> {
  const out: ProductOption[] = [];
  const limit = 500;
  let skip = 0;
  let total = 0;
  do {
    const res = await fetch(`/api/admin/products?limit=${limit}&skip=${skip}`);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      throw new Error(typeof j.message === "string" ? j.message : "Failed to load products");
    }
    const json = (await res.json()) as {
      data?: Array<{ _id: string; name: string; sku: string }>;
      meta?: { total?: number };
    };
    const rows = json.data ?? [];
    total = typeof json.meta?.total === "number" ? json.meta.total : skip + rows.length;
    for (const p of rows) {
      out.push({ id: String(p._id), name: p.name, sku: p.sku });
    }
    skip += rows.length;
    if (rows.length === 0) break;
  } while (skip < total);
  return out;
}

function discountLabel(c: AdminCombo): string {
  const t = c.beneficiaryDiscountType === "flat" ? "flat" : "percentage";
  const v = typeof c.beneficiaryDiscountValue === "number" ? c.beneficiaryDiscountValue : 0;
  if (t === "flat") return `₹${v} off / unit`;
  return `${v}% off`;
}

export default function AdminCombosPage() {
  const [list, setList] = useState<AdminCombo[]>([]);
  const [products, setProducts] = useState<ProductOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  console.log(products);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/combos");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed to load");
      setList(json.data as AdminCombo[]);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
      setList([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!modalOpen) return;
    let cancelled = false;
    setOptionsLoading(true);
    void (async () => {
      try {
        const prods = await fetchAllProductOptions();
        if (!cancelled) setProducts(prods);
      } catch {
        if (!cancelled) setProducts([]);
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm());
    setModalOpen(true);
  }

  async function openEdit(id: string) {
    setError(null);
    try {
      const res = await fetch(`/api/admin/combos/${id}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Failed");
      const c = json.data as AdminCombo;
      setEditingId(id);
      setForm({
        name: c.name,
        priority: String(c.priority ?? 100),
        isActive: c.isActive,
        beneficiaryProductId: c.beneficiaryProductId,
        beneficiaryDiscountType: c.beneficiaryDiscountType === "flat" ? "flat" : "percentage",
        beneficiaryDiscountValue: String(c.beneficiaryDiscountValue ?? ""),
        requirements:
          c.requirements?.length > 0
            ? c.requirements.map((r) => ({
                productId: r.productId,
                thresholdKind: r.thresholdKind,
                minOuterUnits: String(r.minOuterUnits),
              }))
            : [emptyReq()],
      });
      setModalOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load combo");
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const requirements = form.requirements
        .filter((r) => r.productId.trim())
        .map((r) => ({
          productId: r.productId.trim(),
          thresholdKind: r.thresholdKind,
          minOuterUnits: Math.max(1, parseInt(r.minOuterUnits, 10) || 1),
        }));
      if (requirements.length === 0) throw new Error("Add at least one requirement with a product.");
      const beneficiaryDiscountValue = Number(form.beneficiaryDiscountValue);
      if (!Number.isFinite(beneficiaryDiscountValue) || beneficiaryDiscountValue < 0) {
        throw new Error("Enter a valid discount value.");
      }
      if (form.beneficiaryDiscountType === "percentage" && beneficiaryDiscountValue > 100) {
        throw new Error("Percentage discount cannot exceed 100.");
      }
      const body = {
        name: form.name.trim(),
        priority: parseInt(form.priority, 10) || 100,
        isActive: form.isActive,
        beneficiaryProductId: form.beneficiaryProductId.trim(),
        beneficiaryDiscountType: form.beneficiaryDiscountType,
        beneficiaryDiscountValue,
        requirements,
      };
      if (!body.name) throw new Error("Name is required.");
      if (!body.beneficiaryProductId) throw new Error("Beneficiary product is required.");

      if (editingId) {
        const res = await fetch(`/api/admin/combos/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Save failed");
      } else {
        const res = await fetch("/api/admin/combos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(body),
        });
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Save failed");
      }
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this combo?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/combos/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || "Delete failed");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-toolbar">
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
          New combo
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      <p className="muted" style={{ maxWidth: "48rem", marginBottom: "1rem" }}>
        When <strong>all</strong> requirements are met, the chosen <strong>beneficiary</strong> product gets a{" "}
        <strong>percentage</strong> or <strong>flat ₹</strong> discount on its list unit prices (all sizes in cart).
        Count only <strong>master bag</strong> or <strong>carton</strong> lines toward thresholds. Lower{" "}
        <strong>priority</strong> runs first when multiple combos match.
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Priority</th>
                <th>Active</th>
                <th>Beneficiary</th>
                <th>Discount</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.name}</strong>
                  </td>
                  <td>{c.priority}</td>
                  <td>{c.isActive ? "Yes" : "No"}</td>
                  <td>{c.beneficiaryProduct?.name ?? c.beneficiaryProductId}</td>
                  <td>{discountLabel(c)}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      style={{ marginRight: 6 }}
                      onClick={() => void openEdit(c._id)}
                    >
                      Edit
                    </button>
                    <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void handleDelete(c._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onClick={() => setModalOpen(false)}
          onKeyDown={(e) => e.key === "Escape" && setModalOpen(false)}
        >
          <div className="admin-modal" role="dialog" aria-modal onClick={(ev) => ev.stopPropagation()}>
            <h2 className="admin-modal-title">{editingId ? "Edit combo" : "New combo"}</h2>
            {optionsLoading ? <p className="muted">Loading product list…</p> : null}
            <form onSubmit={handleSubmit} className="admin-form">
              <div className="admin-form-section">
                <label className="admin-field">
                  <span>Name</span>
                  <input
                    className="admin-input"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                    required
                  />
                </label>
                <label className="admin-field">
                  <span>Priority (lower runs first)</span>
                  <input
                    className="admin-input"
                    type="number"
                    value={form.priority}
                    onChange={(e) => setForm((f) => ({ ...f, priority: e.target.value }))}
                  />
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
                </label>
              </div>
              <div className="admin-form-section">
                <label className="admin-field">
                  <span>Beneficiary product</span>
                  <select
                    className="admin-input admin-select"
                    value={form.beneficiaryProductId}
                    onChange={(e) => setForm((f) => ({ ...f, beneficiaryProductId: e.target.value }))}
                    required
                  >
                    <option value="">—</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.sku} — {p.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="admin-field">
                  <span>Discount type</span>
                  <select
                    className="admin-input admin-select"
                    value={form.beneficiaryDiscountType}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        beneficiaryDiscountType: e.target.value as "percentage" | "flat",
                      }))
                    }
                  >
                    <option value="percentage">Percentage off list</option>
                    <option value="flat">Flat ₹ off per unit (GST-inclusive list)</option>
                  </select>
                </label>
                <label className="admin-field">
                  <span>
                    {form.beneficiaryDiscountType === "percentage"
                      ? "Percent off (0–100)"
                      : "Rupees off per priced unit (incl. GST)"}
                  </span>
                  <input
                    className="admin-input"
                    type="number"
                    step="any"
                    min={0}
                    max={form.beneficiaryDiscountType === "percentage" ? 100 : undefined}
                    value={form.beneficiaryDiscountValue}
                    onChange={(e) => setForm((f) => ({ ...f, beneficiaryDiscountValue: e.target.value }))}
                    required
                  />
                </label>
              </div>
              <div className="admin-form-section">
                <h3 className="admin-catalog-offers-heading">Requirements</h3>
                <p className="admin-catalog-hint">
                  Each row: product, whether to count <strong>bags</strong> or <strong>cartons</strong> (all sizes for
                  that product), and minimum outer units. Packet-only lines do not count.
                </p>
                {form.requirements.map((r, i) => (
                  <div key={i} className="admin-catalog-card" style={{ marginBottom: "0.75rem" }}>
                    <div className="admin-catalog-toolbar" style={{ flexWrap: "wrap", gap: "0.5rem" }}>
                      <select
                        className="admin-input admin-select"
                        style={{ minWidth: "14rem", flex: "1 1 12rem" }}
                        value={r.productId}
                        onChange={(e) => {
                          const next = [...form.requirements];
                          next[i] = { ...r, productId: e.target.value };
                          setForm((f) => ({ ...f, requirements: next }));
                        }}
                      >
                        <option value="">Product</option>
                        {products.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.sku} — {p.name}
                          </option>
                        ))}
                      </select>
                      <select
                        className="admin-input admin-select"
                        style={{ width: "8rem" }}
                        value={r.thresholdKind}
                        onChange={(e) => {
                          const next = [...form.requirements];
                          next[i] = { ...r, thresholdKind: e.target.value as "bag" | "carton" };
                          setForm((f) => ({ ...f, requirements: next }));
                        }}
                      >
                        <option value="bag">Bags</option>
                        <option value="carton">Cartons</option>
                      </select>
                      <input
                        className="admin-input"
                        style={{ width: "5rem" }}
                        type="number"
                        min={1}
                        value={r.minOuterUnits}
                        onChange={(e) => {
                          const next = [...form.requirements];
                          next[i] = { ...r, minOuterUnits: e.target.value };
                          setForm((f) => ({ ...f, requirements: next }));
                        }}
                      />
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        onClick={() => setForm((f) => ({ ...f, requirements: f.requirements.filter((_, j) => j !== i) }))}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => setForm((f) => ({ ...f, requirements: [...f.requirements, emptyReq()] }))}
                >
                  Add requirement
                </button>
              </div>
              <div className="admin-modal-actions">
                <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setModalOpen(false)}>
                  Cancel
                </button>
                <button type="submit" className="admin-btn admin-btn-primary" disabled={saving || optionsLoading}>
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
