"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminComboRule, ComboThresholdUnit } from "../types";
import { parseMinTriggerBags } from "@/lib/comboRules/comboRulePayload";

const UNIT_OPTIONS: { value: ComboThresholdUnit; label: string }[] = [
  { value: "packets", label: "Packets" },
  { value: "bags", label: "Bags" },
  { value: "cartons", label: "Cartons" },
];

type CategoryOption = { id: string; name: string };

type ProductOption = {
  id: string;
  slug: string;
  name: string;
  sku: string;
  categoryId: string;
  categoryName: string;
};

async function fetchCategoryOptions(): Promise<CategoryOption[]> {
  const res = await fetch("/api/admin/categories?includeInactive=true");
  if (!res.ok) {
    const j = await res.json().catch(() => ({}));
    throw new Error(typeof j.message === "string" ? j.message : "Failed to load categories");
  }
  const json = (await res.json()) as { data?: { _id: string; name: string }[] };
  const rows = json.data ?? [];
  return rows.map((c) => ({ id: String(c._id), name: c.name }));
}

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
      data?: Array<{
        _id: string;
        name: string;
        sku: string;
        slug?: string;
        category?: { _id?: string; name?: string };
      }>;
      meta?: { total?: number };
    };
    const rows = json.data ?? [];
    total = typeof json.meta?.total === "number" ? json.meta.total : skip + rows.length;
    for (const p of rows) {
      const catObj = p.category && typeof p.category === "object" ? p.category : null;
      const categoryId =
        catObj && "_id" in catObj && catObj._id != null ? String(catObj._id) : "";
      const categoryName = typeof catObj?.name === "string" ? catObj.name : "";
      const slug = typeof p.slug === "string" && p.slug.trim() ? p.slug.trim().toLowerCase() : "";
      if (!slug) continue;
      out.push({
        id: String(p._id),
        slug,
        name: p.name,
        sku: p.sku,
        categoryId,
        categoryName,
      });
    }
    skip += rows.length;
    if (rows.length === 0) break;
  } while (skip < total);
  return out;
}

function toggleSlug(slugs: string[], slug: string, on: boolean): string[] {
  const set = new Set(slugs);
  if (on) set.add(slug);
  else set.delete(slug);
  return [...set];
}

function toggleId(ids: string[], id: string, on: boolean): string[] {
  const set = new Set(ids);
  if (on) set.add(id);
  else set.delete(id);
  return [...set];
}

function MultiCheckboxBlock({
  title,
  hint,
  idPrefix,
  search,
  onSearchChange,
  loading,
  emptyMessage,
  options,
  selectedKeys,
  onToggle,
  onClear,
}: {
  title: string;
  hint: string;
  idPrefix: string;
  search: string;
  onSearchChange: (v: string) => void;
  loading: boolean;
  emptyMessage: string;
  options: { key: string; primary: string; secondary?: string }[];
  selectedKeys: string[];
  onToggle: (key: string, checked: boolean) => void;
  onClear: () => void;
}) {
  const n = selectedKeys.length;
  const q = search.trim().toLowerCase();
  const filtered = q
    ? options.filter(
        (o) =>
          o.primary.toLowerCase().includes(q) || (o.secondary && o.secondary.toLowerCase().includes(q))
      )
    : options;

  return (
    <div className="admin-field">
      <label>{title}</label>
      <p className="admin-multiselect-hint">{hint}</p>
      <div className="admin-multiselect" aria-busy={loading}>
        <div className="admin-multiselect-toolbar">
          <input
            type="search"
            placeholder="Filter…"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            disabled={loading}
            autoComplete="off"
            aria-label={`Filter ${title}`}
          />
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={onClear}
            disabled={loading || n === 0}
          >
            Clear ({n})
          </button>
        </div>
        {loading ? (
          <div className="admin-multiselect-empty">Loading…</div>
        ) : filtered.length === 0 ? (
          <div className="admin-multiselect-empty">{emptyMessage}</div>
        ) : (
          <div className="admin-multiselect-list" role="group" style={{ maxHeight: "14rem", overflowY: "auto" }}>
            {filtered.map((o) => {
              const checked = selectedKeys.includes(o.key);
              const domId = `${idPrefix}-${o.key.replace(/[^a-z0-9_-]/gi, "_")}`;
              return (
                <div className="admin-multiselect-row" key={o.key}>
                  <input
                    type="checkbox"
                    id={domId}
                    checked={checked}
                    onChange={(e) => onToggle(o.key, e.target.checked)}
                  />
                  <label htmlFor={domId}>
                    {o.primary}
                    {o.secondary ? <span className="admin-multiselect-meta">{o.secondary}</span> : null}
                  </label>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

const emptyForm = {
  name: "",
  triggerCategoryIds: [] as string[],
  triggerProductSlugs: [] as string[],
  targetCategoryIds: [] as string[],
  targetProductSlugs: [] as string[],
  minTriggerBags: "3",
  minTargetBags: "1",
  triggerThresholdUnit: "bags" as ComboThresholdUnit,
  targetThresholdUnit: "bags" as ComboThresholdUnit,
  suggestionMessage: "",
  isActive: true,
};

export default function AdminCombosPage() {
  const [list, setList] = useState<AdminComboRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const [categoryOptions, setCategoryOptions] = useState<CategoryOption[]>([]);
  const [productOptions, setProductOptions] = useState<ProductOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(false);
  const [optionsError, setOptionsError] = useState<string | null>(null);
  const [searchTrigCat, setSearchTrigCat] = useState("");
  const [searchTrigProd, setSearchTrigProd] = useState("");
  const [searchTgtCat, setSearchTgtCat] = useState("");
  const [searchTgtProd, setSearchTgtProd] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/combo-rules");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      setList(json.data as AdminComboRule[]);
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
    setOptionsError(null);
    setOptionsLoading(true);
    setSearchTrigCat("");
    setSearchTrigProd("");
    setSearchTgtCat("");
    setSearchTgtProd("");
    void (async () => {
      try {
        const [cats, prods] = await Promise.all([fetchCategoryOptions(), fetchAllProductOptions()]);
        if (cancelled) return;
        setCategoryOptions(cats);
        setProductOptions(prods);
      } catch (e) {
        if (!cancelled) {
          setOptionsError(e instanceof Error ? e.message : "Could not load lists");
          setCategoryOptions([]);
          setProductOptions([]);
        }
      } finally {
        if (!cancelled) setOptionsLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [modalOpen]);

  const triggerProductsForPicker = useMemo(() => {
    const catIds = form.triggerCategoryIds;
    if (catIds.length === 0) return productOptions;
    const set = new Set(catIds);
    return productOptions.filter((p) => p.categoryId && set.has(p.categoryId));
  }, [productOptions, form.triggerCategoryIds]);

  const targetProductsForPicker = useMemo(() => {
    const catIds = form.targetCategoryIds;
    if (catIds.length === 0) return productOptions;
    const set = new Set(catIds);
    return productOptions.filter((p) => p.categoryId && set.has(p.categoryId));
  }, [productOptions, form.targetCategoryIds]);

  useEffect(() => {
    if (productOptions.length === 0) return;
    const catIds = form.triggerCategoryIds;
    if (catIds.length === 0) return;
    const catSet = new Set(catIds);
    const allowed = new Set(
      productOptions.filter((p) => p.categoryId && catSet.has(p.categoryId)).map((p) => p.slug)
    );
    setForm((f) => {
      const next = f.triggerProductSlugs.filter((s) => allowed.has(s));
      if (next.length === f.triggerProductSlugs.length) return f;
      return { ...f, triggerProductSlugs: next };
    });
  }, [form.triggerCategoryIds, productOptions]);

  useEffect(() => {
    if (productOptions.length === 0) return;
    const catIds = form.targetCategoryIds;
    if (catIds.length === 0) return;
    const catSet = new Set(catIds);
    const allowed = new Set(
      productOptions.filter((p) => p.categoryId && catSet.has(p.categoryId)).map((p) => p.slug)
    );
    setForm((f) => {
      const next = f.targetProductSlugs.filter((s) => allowed.has(s));
      if (next.length === f.targetProductSlugs.length) return f;
      return { ...f, targetProductSlugs: next };
    });
  }, [form.targetCategoryIds, productOptions]);

  function openCreate() {
    setEditingId(null);
    setForm({ ...emptyForm });
    setModalOpen(true);
  }

  function openEdit(rule: AdminComboRule) {
    setEditingId(rule._id);
    setForm({
      name: rule.name,
      triggerCategoryIds: rule.triggerCategoryIds ?? [],
      triggerProductSlugs: [...(rule.triggerSlugs ?? [])],
      targetCategoryIds: rule.targetCategoryIds ?? [],
      targetProductSlugs: [...(rule.targetSlugs ?? [])],
      minTriggerBags: String(rule.minTriggerBags ?? 3),
      minTargetBags: String(
        rule.minTargetBags !== undefined && rule.minTargetBags !== null ? rule.minTargetBags : 1
      ),
      triggerThresholdUnit: rule.triggerThresholdUnit ?? "bags",
      targetThresholdUnit: rule.targetThresholdUnit ?? "bags",
      suggestionMessage: rule.suggestionMessage ?? "",
      isActive: rule.isActive,
    });
    setModalOpen(true);
  }

  function buildBody(): Record<string, unknown> {
    const trigStr = String(form.minTriggerBags ?? "").trim();
    const tgtStr = String(form.minTargetBags ?? "").trim();
    return {
      name: form.name.trim(),
      triggerSlugs: form.triggerProductSlugs,
      targetSlugs: form.targetProductSlugs,
      triggerCategoryIds: form.triggerCategoryIds,
      targetCategoryIds: form.targetCategoryIds,
      minTriggerBags: parseMinTriggerBags(trigStr === "" ? undefined : trigStr, 3),
      minTargetBags: parseMinTriggerBags(tgtStr === "" ? undefined : tgtStr, 1),
      triggerThresholdUnit: form.triggerThresholdUnit,
      targetThresholdUnit: form.targetThresholdUnit,
      suggestionMessage: form.suggestionMessage.trim(),
      isActive: form.isActive,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = buildBody();
      if (!body.name) throw new Error("Name is required");
      const url = editingId ? `/api/admin/combo-rules/${editingId}` : "/api/admin/combo-rules";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this combo rule?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/combo-rules/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const categoryRowsForMulti = useMemo(
    () => categoryOptions.map((c) => ({ key: c.id, primary: c.name, secondary: c.id })),
    [categoryOptions]
  );

  const triggerProdRows = useMemo(
    () =>
      triggerProductsForPicker.map((p) => ({
        key: p.slug,
        primary: p.name,
        secondary: `${p.sku} · ${p.categoryName || "—"}`,
      })),
    [triggerProductsForPicker]
  );

  const targetProdRows = useMemo(
    () =>
      targetProductsForPicker.map((p) => ({
        key: p.slug,
        primary: p.name,
        secondary: `${p.sku} · ${p.categoryName || "—"}`,
      })),
    [targetProductsForPicker]
  );

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Combo rules</h1>
      <p className="muted" style={{ maxWidth: "48rem", marginBottom: "1rem" }}>
        Pick categories and/or products for triggers and targets. Categories apply to every active product in that category;
        specific products add or narrow selection. Combo net pricing comes from each combo product&apos;s catalog size row
        (separate listings). Thresholds control trigger pool size and the maximum target amount at combo rates.
      </p>

      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}

      {optionsError && modalOpen ? (
        <div className="admin-banner err" role="alert">
          {optionsError}
        </div>
      ) : null}

      <div className="admin-toolbar">
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
          New combo rule
        </button>
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Triggers</th>
                <th>Targets</th>
                <th>Trigger / target max</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((r) => (
                <tr key={r._id}>
                  <td>
                    <strong>{r.name}</strong>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>
                      {(r.triggerCategoryIds?.length ?? 0) > 0
                        ? `${r.triggerCategoryIds!.length} cat(s) + `
                        : ""}
                      {(r.triggerSlugs ?? []).length} product slug(s)
                    </span>
                  </td>
                  <td>
                    <span className="muted" style={{ fontSize: "0.85rem" }}>
                      {(r.targetCategoryIds?.length ?? 0) > 0 ? `${r.targetCategoryIds!.length} cat(s) + ` : ""}
                      {(r.targetSlugs ?? []).length} product slug(s)
                    </span>
                  </td>
                  <td style={{ fontSize: "0.85rem" }}>
                    {r.minTriggerBags ?? 3} {r.triggerThresholdUnit ?? "bags"} → max {r.minTargetBags ?? 1}{" "}
                    {r.targetThresholdUnit ?? "bags"}
                  </td>
                  <td>{r.isActive ? "Yes" : "No"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      style={{ marginRight: 6 }}
                      onClick={() => openEdit(r)}
                    >
                      Edit
                    </button>
                    <button type="button" className="admin-btn admin-btn-danger" onClick={() => void handleDelete(r._id)}>
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No combo rules yet.</p> : null}
        </div>
      )}

      {modalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setModalOpen(false);
          }}
        >
          <div className="admin-modal" role="dialog" aria-labelledby="combo-modal-title" style={{ maxWidth: "42rem" }}>
            <h2 id="combo-modal-title">{editingId ? "Edit combo rule" : "New combo rule"}</h2>
            <form key={editingId ?? "new"} onSubmit={(e) => void handleSubmit(e)}>
              <div className="admin-field">
                <label htmlFor="combo-name">Name *</label>
                <input
                  id="combo-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. Standard Patti Offer"
                  required
                />
              </div>

              <MultiCheckboxBlock
                title="Trigger categories (optional)"
                hint="All active products in selected categories count as triggers. Leave empty to use only specific products below."
                idPrefix="trig-cat"
                search={searchTrigCat}
                onSearchChange={setSearchTrigCat}
                loading={optionsLoading}
                emptyMessage="No categories"
                options={categoryRowsForMulti}
                selectedKeys={form.triggerCategoryIds}
                onToggle={(key, checked) =>
                  setForm((f) => ({ ...f, triggerCategoryIds: toggleId(f.triggerCategoryIds, key, checked) }))
                }
                onClear={() => setForm((f) => ({ ...f, triggerCategoryIds: [] }))}
              />

              <MultiCheckboxBlock
                title="Trigger products"
                hint="When categories are selected above, only products in those categories are listed. Otherwise all catalog products with slugs are shown."
                idPrefix="trig-prod"
                search={searchTrigProd}
                onSearchChange={setSearchTrigProd}
                loading={optionsLoading}
                emptyMessage={
                  form.triggerCategoryIds.length > 0 ? "No products in the selected categories." : "No products with slugs."
                }
                options={triggerProdRows}
                selectedKeys={form.triggerProductSlugs}
                onToggle={(key, checked) =>
                  setForm((f) => ({ ...f, triggerProductSlugs: toggleSlug(f.triggerProductSlugs, key, checked) }))
                }
                onClear={() => setForm((f) => ({ ...f, triggerProductSlugs: [] }))}
              />

              <MultiCheckboxBlock
                title="Target categories (optional)"
                hint="All active products in these categories can receive combo pricing when the rule is active."
                idPrefix="tgt-cat"
                search={searchTgtCat}
                onSearchChange={setSearchTgtCat}
                loading={optionsLoading}
                emptyMessage="No categories"
                options={categoryRowsForMulti}
                selectedKeys={form.targetCategoryIds}
                onToggle={(key, checked) =>
                  setForm((f) => ({ ...f, targetCategoryIds: toggleId(f.targetCategoryIds, key, checked) }))
                }
                onClear={() => setForm((f) => ({ ...f, targetCategoryIds: [] }))}
              />

              <MultiCheckboxBlock
                title="Target products"
                hint="Specific combo listings (by slug). Combine with categories as needed."
                idPrefix="tgt-prod"
                search={searchTgtProd}
                onSearchChange={setSearchTgtProd}
                loading={optionsLoading}
                emptyMessage={
                  form.targetCategoryIds.length > 0 ? "No products in the selected categories." : "No products with slugs."
                }
                options={targetProdRows}
                selectedKeys={form.targetProductSlugs}
                onToggle={(key, checked) =>
                  setForm((f) => ({ ...f, targetProductSlugs: toggleSlug(f.targetProductSlugs, key, checked) }))
                }
                onClear={() => setForm((f) => ({ ...f, targetProductSlugs: [] }))}
              />

              <div className="admin-field">
                <span className="muted" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  Trigger threshold
                </span>
                <div className="admin-field-row" style={{ alignItems: "flex-end" }}>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-min-trig">Amount</label>
                    <input
                      id="combo-min-trig"
                      type="number"
                      min={0}
                      step={1}
                      value={form.minTriggerBags}
                      onChange={(e) => setForm((f) => ({ ...f, minTriggerBags: e.target.value }))}
                    />
                  </div>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-trig-unit">Unit</label>
                    <select
                      id="combo-trig-unit"
                      value={form.triggerThresholdUnit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, triggerThresholdUnit: e.target.value as ComboThresholdUnit }))
                      }
                    >
                      {UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="admin-field">
                <span className="muted" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  Target maximum threshold
                </span>
                <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 0.5rem" }}>
                  This is the maximum quantity allowed at the combo price.
                </p>
                <div className="admin-field-row" style={{ alignItems: "flex-end" }}>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-min-tgt">Amount</label>
                    <input
                      id="combo-min-tgt"
                      type="number"
                      min={0}
                      step={1}
                      value={form.minTargetBags}
                      onChange={(e) => setForm((f) => ({ ...f, minTargetBags: e.target.value }))}
                    />
                  </div>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-tgt-unit">Unit</label>
                    <select
                      id="combo-tgt-unit"
                      value={form.targetThresholdUnit}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, targetThresholdUnit: e.target.value as ComboThresholdUnit }))
                      }
                    >
                      {UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="admin-field">
                <label htmlFor="combo-msg">Suggestion message (B2C)</label>
                <textarea
                  id="combo-msg"
                  value={form.suggestionMessage}
                  onChange={(e) => setForm((f) => ({ ...f, suggestionMessage: e.target.value }))}
                  rows={2}
                  placeholder="Optional; cart copy is mostly automated."
                />
              </div>

              <div className="admin-field-row">
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(e) => setForm((f) => ({ ...f, isActive: e.target.checked }))}
                  />
                  Active
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
