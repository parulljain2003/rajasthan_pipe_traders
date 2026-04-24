"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { AdminComboRule, ComboThresholdUnit } from "../types";
import { parseMinTriggerBags } from "@/lib/comboRules/comboRulePayload";

const UNIT_OPTIONS: { value: ComboThresholdUnit; label: string }[] = [
  { value: "packets", label: "Packets" },
  { value: "bags", label: "Bags" },
  { value: "cartons", label: "Cartons" },
];

const BULK_UNIT_OPTIONS = [
  { value: "per_bag", label: "Bags" },
  { value: "per_cartoon", label: "Carton" },
] as const;

const INNER_UNIT_OPTIONS = [
  { value: "per_packet", label: "Packets" },
  { value: "per_box", label: "Box" },
] as const;

type CategoryOption = { id: string; name: string };

type ProductOption = {
  id: string;
  slug: string;
  name: string;
  sku?: string;
  priceWithGst?: number;
  isEligibleForCombo?: unknown;
  categoryId: string;
  categoryName: string;
};

async function fetchCategoryOptions(): Promise<CategoryOption[]> {
  const res = await fetch("/api/admin/categories?includeInactive=true", { cache: "no-store" });
  if (!res.ok) {
    const j = (await res.json().catch(() => ({}))) as { message?: string; details?: string };
    const msg = typeof j.details === "string" ? j.details : typeof j.message === "string" ? j.message : "Failed to load categories";
    throw new Error(msg);
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
    const res = await fetch(`/api/admin/products?limit=${limit}&skip=${skip}`, { cache: "no-store" });
    if (!res.ok) {
      const j = (await res.json().catch(() => ({}))) as { message?: string; details?: string };
      const msg = typeof j.details === "string" ? j.details : typeof j.message === "string" ? j.message : "Failed to load products";
      throw new Error(msg);
    }
    const json = (await res.json()) as {
      data?: Array<{
        _id: string;
        name: string;
        sku: string;
        slug?: string;
        pricing?: { priceWithGst?: number };
        isEligibleForCombo?: unknown;
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
        priceWithGst:
          typeof p.pricing?.priceWithGst === "number" && Number.isFinite(p.pricing.priceWithGst)
            ? p.pricing.priceWithGst
            : undefined,
        isEligibleForCombo: p.isEligibleForCombo,
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

function normSlug(value: string): string {
  return String(value).trim().toLowerCase();
}

function toSlugLike(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildMinOrderLine(
  moq: number | undefined,
  moqBags: number | undefined,
  packetsPerBag: number
): string | undefined {
  const parts: string[] = [];
  if (packetsPerBag > 0) parts.push(`1 bag = ${packetsPerBag} packets`);
  if (moq != null && moq > 0) parts.push(`MOQ ${moq} packets`);
  if (moqBags != null && moqBags > 0 && packetsPerBag > 0) parts.push(`MOQ ${moqBags} bags`);
  return parts.length ? parts.join(" · ") : undefined;
}

function MultiCheckboxBlock({
  title,
  hint,
  idPrefix,
  search,
  showSearch = true,
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
  showSearch?: boolean;
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
          {showSearch ? (
            <input
              type="search"
              placeholder="Filter…"
              value={search}
              onChange={(e) => onSearchChange(e.target.value)}
              disabled={loading}
              autoComplete="off"
              aria-label={`Filter ${title}`}
            />
          ) : (
            <div aria-hidden="true" />
          )}
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
  targetProductSlugs: [] as string[],
  fallbackTargetProductSlugs: [] as string[],
  targetProductCategoryFocus: "",
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
  const [searchTgtProd, setSearchTgtProd] = useState("");
  const [searchFallbackTgtProd, setSearchFallbackTgtProd] = useState("");
  const [addProductModalOpen, setAddProductModalOpen] = useState(false);
  const [addProductSlug, setAddProductSlug] = useState("");
  const [addProductTo, setAddProductTo] = useState<"target" | "fallback">("target");
  const [addProductMode, setAddProductMode] = useState<"existing" | "new">("existing");
  const [addProductCategoryFocus, setAddProductCategoryFocus] = useState("");
  const [newProductName, setNewProductName] = useState("");
  const [newProductSku, setNewProductSku] = useState("");
  const [newProductSlug, setNewProductSlug] = useState("");
  const [newProductKind, setNewProductKind] = useState<"catalog" | "sku">("catalog");
  const [newProductBrand, setNewProductBrand] = useState("");
  const [newProductDescription, setNewProductDescription] = useState("");
  const [newProductSizeOrModel, setNewProductSizeOrModel] = useState("");
  const [newProductBasicPrice, setNewProductBasicPrice] = useState("");
  const [newProductPriceWithGst, setNewProductPriceWithGst] = useState("");
  const [newProductImage, setNewProductImage] = useState("");
  const [newProductBulkUnit, setNewProductBulkUnit] = useState<"per_bag" | "per_cartoon">("per_bag");
  const [newProductInnerUnit, setNewProductInnerUnit] = useState<"per_packet" | "per_box">("per_packet");
  const [newProductPcsPerPacket, setNewProductPcsPerPacket] = useState("100");
  const [newProductPacketsPerBag, setNewProductPacketsPerBag] = useState("");
  const [newProductKeyFeaturesText, setNewProductKeyFeaturesText] = useState("");
  const [newProductCurrency, setNewProductCurrency] = useState("INR");
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [addProductError, setAddProductError] = useState<string | null>(null);

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
    setSearchTgtProd("");
    setSearchFallbackTgtProd("");
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
    if (catIds.length === 0) return [];
    const set = new Set(catIds);
    const blockedSlugs = new Set([
      ...form.targetProductSlugs.map(normSlug),
      ...form.fallbackTargetProductSlugs.map(normSlug),
    ]);
    return productOptions.filter(
      (p) =>
        p.categoryId &&
        set.has(p.categoryId) &&
        !blockedSlugs.has(normSlug(p.slug)) &&
        typeof p.isEligibleForCombo !== "boolean"
    );
  }, [
    productOptions,
    form.triggerCategoryIds,
    form.targetProductSlugs,
    form.fallbackTargetProductSlugs,
  ]);

  const targetProductsForPicker = useMemo(() => {
    const selectedCategoryIds = form.triggerCategoryIds;
    if (selectedCategoryIds.length === 0) return [];
    const selectedCategorySet = new Set(selectedCategoryIds);
    const productsInSelectedCategories = productOptions.filter(
      (p) => p.categoryId && selectedCategorySet.has(p.categoryId)
    );
    if (selectedCategoryIds.length === 1) return productsInSelectedCategories;
    const focusedCategoryId = form.targetProductCategoryFocus;
    if (!focusedCategoryId || !selectedCategorySet.has(focusedCategoryId)) {
      return productsInSelectedCategories;
    }
    return productsInSelectedCategories.filter((p) => p.categoryId === focusedCategoryId);
  }, [productOptions, form.triggerCategoryIds, form.targetProductCategoryFocus]);

  useEffect(() => {
    setForm((f) => {
      const catIds = f.triggerCategoryIds;
      if (catIds.length === 0) {
        if (!f.targetProductCategoryFocus) return f;
        return { ...f, targetProductCategoryFocus: "" };
      }
      if (catIds.length === 1) {
        const singleCategoryId = catIds[0];
        if (f.targetProductCategoryFocus === singleCategoryId) return f;
        return { ...f, targetProductCategoryFocus: singleCategoryId };
      }
      if (f.targetProductCategoryFocus && !catIds.includes(f.targetProductCategoryFocus)) {
        return { ...f, targetProductCategoryFocus: "" };
      }
      return f;
    });
  }, [form.triggerCategoryIds]);

  useEffect(() => {
    if (productOptions.length === 0) return;
    const catIds = form.triggerCategoryIds;
    if (catIds.length === 0) return;
    const catSet = new Set(catIds);
    const allowed = new Set(
      productOptions.filter((p) => p.categoryId && catSet.has(p.categoryId)).map((p) => normSlug(p.slug))
    );
    setForm((f) => {
      const next = f.triggerProductSlugs.filter((s) => allowed.has(normSlug(s)));
      if (next.length === f.triggerProductSlugs.length) return f;
      return { ...f, triggerProductSlugs: next };
    });
  }, [form.triggerCategoryIds, productOptions]);

  useEffect(() => {
    setForm((f) => {
      if (f.triggerProductSlugs.length === 0) return f;
      const blocked = new Set([
        ...f.targetProductSlugs.map(normSlug),
        ...f.fallbackTargetProductSlugs.map(normSlug),
      ]);
      const next = f.triggerProductSlugs.filter((slug) => !blocked.has(normSlug(slug)));
      if (next.length === f.triggerProductSlugs.length) return f;
      return { ...f, triggerProductSlugs: next };
    });
  }, [form.targetProductSlugs, form.fallbackTargetProductSlugs]);

  useEffect(() => {
    if (productOptions.length === 0) return;
    const catIds = form.triggerCategoryIds;
    if (catIds.length === 0) return;
    const catSet = new Set(catIds);
    const allowed = new Set(
      productOptions.filter((p) => p.categoryId && catSet.has(p.categoryId)).map((p) => normSlug(p.slug))
    );
    setForm((f) => {
      const next = f.targetProductSlugs.filter((s) => allowed.has(normSlug(s)));
      const fallbackNext = f.fallbackTargetProductSlugs.filter((s) => allowed.has(normSlug(s)));
      if (
        next.length === f.targetProductSlugs.length &&
        fallbackNext.length === f.fallbackTargetProductSlugs.length
      ) {
        return f;
      }
      return {
        ...f,
        targetProductSlugs: next,
        fallbackTargetProductSlugs: fallbackNext,
      };
    });
  }, [form.triggerCategoryIds, productOptions]);

  useEffect(() => {
    if (productOptions.length === 0) return;
    const bySlug = new Map(productOptions.map((p) => [normSlug(p.slug), p]));
    setForm((f) => {
      const targetNext = f.targetProductSlugs.filter((slug) => {
        const p = bySlug.get(normSlug(slug));
        return p?.isEligibleForCombo === true;
      });
      const fallbackNext = f.fallbackTargetProductSlugs.filter((slug) => {
        const p = bySlug.get(normSlug(slug));
        return p?.isEligibleForCombo === false;
      });
      if (
        targetNext.length === f.targetProductSlugs.length &&
        fallbackNext.length === f.fallbackTargetProductSlugs.length
      ) {
        return f;
      }
      return {
        ...f,
        targetProductSlugs: targetNext,
        fallbackTargetProductSlugs: fallbackNext,
      };
    });
  }, [productOptions]);

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
      targetProductSlugs: [...(rule.targetSlugs ?? [])],
      fallbackTargetProductSlugs: [...(rule.fallbackTargetSlugs ?? [])],
      targetProductCategoryFocus:
        (rule.triggerCategoryIds?.length ?? 0) === 1 ? String(rule.triggerCategoryIds?.[0]) : "",
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
      fallbackTargetSlugs: form.fallbackTargetProductSlugs,
      triggerCategoryIds: form.triggerCategoryIds,
      targetCategoryIds: form.triggerCategoryIds,
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
    setError(null);
    if (form.targetProductSlugs.length === 0) {
      setError("At least one target product is required.");
      return;
    }
    if (form.fallbackTargetProductSlugs.length === 0) {
      setError("At least one fallback target product is required.");
      return;
    }
    setSaving(true);
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
        secondary: `${p.sku ?? "—"} · ${p.categoryName || "—"}`,
      })),
    [triggerProductsForPicker]
  );

  const targetProdRows = useMemo(
    () =>
      targetProductsForPicker.map((p) => ({
        key: p.slug,
        primary: p.name,
        secondary: `${p.sku ?? "—"} · ${p.categoryName || "—"} · ₹${
          typeof p.priceWithGst === "number" ? p.priceWithGst.toFixed(2) : "—"
        }`,
      })),
    [targetProductsForPicker]
  );

  const productBySlug = useMemo(() => {
    const map = new Map<string, ProductOption>();
    for (const p of productOptions) map.set(p.slug, p);
    return map;
  }, [productOptions]);

  const selectedTargetProdRows = useMemo(
    () =>
      form.targetProductSlugs.map((slug) => {
        const p = productBySlug.get(slug);
        return {
          key: slug,
          primary: p?.name ?? slug,
          secondary: `${p?.sku ?? "—"} · ${p?.categoryName || "—"} · ₹${
            typeof p?.priceWithGst === "number" ? p.priceWithGst.toFixed(2) : "—"
          }`,
        };
      }),
    [form.targetProductSlugs, productBySlug]
  );

  const selectedFallbackProdRows = useMemo(
    () =>
      form.fallbackTargetProductSlugs.map((slug) => {
        const p = productBySlug.get(slug);
        return {
          key: slug,
          primary: p?.name ?? slug,
          secondary: `${p?.sku ?? "—"} · ${p?.categoryName || "—"} · ₹${
            typeof p?.priceWithGst === "number" ? p.priceWithGst.toFixed(2) : "—"
          }`,
        };
      }),
    [form.fallbackTargetProductSlugs, productBySlug]
  );

  const triggerCategoriesForAddModal = useMemo(
    () => categoryOptions.filter((c) => form.triggerCategoryIds.includes(c.id)),
    [categoryOptions, form.triggerCategoryIds]
  );

  const addModalProductsForPicker = useMemo(() => {
    if (form.triggerCategoryIds.length === 0) return [];
    const categorySet = new Set(form.triggerCategoryIds);
    const base = productOptions.filter((p) => p.categoryId && categorySet.has(p.categoryId));
    if (form.triggerCategoryIds.length <= 1) return base;
    if (!addProductCategoryFocus || !categorySet.has(addProductCategoryFocus)) return [];
    return base.filter((p) => p.categoryId === addProductCategoryFocus);
  }, [productOptions, form.triggerCategoryIds, addProductCategoryFocus]);

  const targetProductsForAddModal = useMemo(
    () => {
      const blocked = new Set([
        ...form.targetProductSlugs.map(normSlug),
        ...form.fallbackTargetProductSlugs.map(normSlug),
      ]);
      return addModalProductsForPicker
        .filter((p) =>
          addProductTo === "fallback"
            ? p.isEligibleForCombo === false
            : p.isEligibleForCombo === true
        )
        .filter((p) => !blocked.has(normSlug(p.slug)))
        .map((p) => ({
          slug: p.slug,
          label: `${p.name} (${p.sku ?? "—"}) · ${p.categoryName || "—"} · ₹${
            typeof p.priceWithGst === "number" ? p.priceWithGst.toFixed(2) : "—"
          }`,
        }));
    },
    [addModalProductsForPicker, addProductTo, form.targetProductSlugs, form.fallbackTargetProductSlugs]
  );

  useEffect(() => {
    if (form.triggerCategoryIds.length <= 1) {
      const onlyCategory = form.triggerCategoryIds[0] ?? "";
      if (addProductCategoryFocus !== onlyCategory) setAddProductCategoryFocus(onlyCategory);
      return;
    }
    if (addProductCategoryFocus && form.triggerCategoryIds.includes(addProductCategoryFocus)) return;
    setAddProductCategoryFocus("");
  }, [form.triggerCategoryIds, addProductCategoryFocus]);

  useEffect(() => {
    if (!addProductSlug) return;
    const exists = targetProductsForAddModal.some((p) => p.slug === addProductSlug);
    if (!exists) setAddProductSlug("");
  }, [targetProductsForAddModal, addProductSlug]);

  function openAddProductModal(defaultBucket: "target" | "fallback" = "target") {
    setAddProductTo(defaultBucket);
    setAddProductMode("existing");
    setAddProductSlug("");
    setAddProductCategoryFocus(form.triggerCategoryIds.length === 1 ? form.triggerCategoryIds[0] : "");
    setAddProductError(null);
    setNewProductName("");
    setNewProductSku("");
    setNewProductSlug("");
    setNewProductKind("catalog");
    setNewProductBrand("");
    setNewProductDescription("");
    setNewProductSizeOrModel("");
    setNewProductBasicPrice("");
    setNewProductPriceWithGst("");
    setNewProductImage("");
    setNewProductBulkUnit("per_bag");
    setNewProductInnerUnit("per_packet");
    setNewProductPcsPerPacket("100");
    setNewProductPacketsPerBag("");
    setNewProductKeyFeaturesText("");
    setNewProductCurrency("INR");
    setAddProductModalOpen(true);
  }

  async function markProductComboSpecific(slug: string) {
    const row = productOptions.find((p) => p.slug === slug);
    if (!row?.id) return;
    await fetch(`/api/admin/products/${row.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEligibleForCombo: true }),
    });
  }

  async function handleAddProductFromModal() {
    if (!addProductSlug) return;
    setAddProductError(null);
    try {
      await markProductComboSpecific(addProductSlug);
    } catch (e) {
      setAddProductError(e instanceof Error ? e.message : "Could not mark product as combo-specific");
      return;
    }
    setForm((f) => {
      if (addProductTo === "target") {
        return {
          ...f,
          targetProductSlugs: toggleSlug(f.targetProductSlugs, addProductSlug, true),
          fallbackTargetProductSlugs: toggleSlug(f.fallbackTargetProductSlugs, addProductSlug, false),
        };
      }
      return {
        ...f,
        targetProductSlugs: toggleSlug(f.targetProductSlugs, addProductSlug, false),
        fallbackTargetProductSlugs: toggleSlug(f.fallbackTargetProductSlugs, addProductSlug, true),
      };
    });
    setAddProductModalOpen(false);
  }

  async function handleCreateAndAddProduct() {
    setAddProductError(null);
    const name = newProductName.trim();
    const category = addProductCategoryFocus.trim();
    const sku = newProductSku.trim();
    const slugFromInput = newProductSlug.trim().toLowerCase();
    const brand = newProductBrand.trim();
    const sizeOrModel = newProductSizeOrModel.trim();
    const basicPrice = Number(newProductBasicPrice);
    const priceWithGst = Number(newProductPriceWithGst);
    const pcsPerPacketNum = Math.max(1, Math.floor(Number(newProductPcsPerPacket) || 1));
    const packetsPerBagRaw = String(newProductPacketsPerBag ?? "").trim();
    const packetsPerBagNum =
      packetsPerBagRaw === "" ? 0 : Math.max(0, Math.floor(Number(packetsPerBagRaw)));
    if (!name) {
      setAddProductError("Product name is required.");
      return;
    }
    if (!category) {
      setAddProductError("Select category first.");
      return;
    }
    if (!sku) {
      setAddProductError("SKU is required.");
      return;
    }
    if (!slugFromInput) {
      setAddProductError("Slug is required.");
      return;
    }
    if (!brand) {
      setAddProductError("Brand is required.");
      return;
    }
    if (!sizeOrModel) {
      setAddProductError("Size / model is required.");
      return;
    }
    if (!Number.isFinite(basicPrice) || basicPrice < 0) {
      setAddProductError("Basic price must be a valid non-negative number.");
      return;
    }
    if (!Number.isFinite(priceWithGst) || priceWithGst < 0) {
      setAddProductError("Price with GST must be a valid non-negative number.");
      return;
    }
    setCreatingProduct(true);
    try {
      const finalSlug = slugFromInput;

      const keyLines = newProductKeyFeaturesText
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
      const keyFeatures = keyLines.map((text) => ({ text, icon: "check" }));

      const image = newProductImage.trim();

      const body: Record<string, unknown> = {
        name,
        category,
        productKind: newProductKind,
        pricing: {
          basicPrice,
          priceWithGst,
          currency: String(newProductCurrency || "INR").trim().toUpperCase() || "INR",
        },
        isActive: true,
        isNew: false,
        isIsiCertified: false,
        isEligibleForCombo: true,
        packaging: {
          pricingUnit: newProductInnerUnit,
          bulkUnitChoices: [newProductBulkUnit],
          innerUnitChoices: [newProductInnerUnit],
          pcsPerPacket: pcsPerPacketNum,
          ...(packetsPerBagNum > 0
            ? { packetsInMasterBag: packetsPerBagNum, pktInMasterBag: packetsPerBagNum }
            : {}),
        },
        ...(keyFeatures.length > 0
          ? { keyFeatures, features: [] }
          : { keyFeatures: null, features: [] }),
        ...(image ? { image, images: [image] } : {}),
        sellers: [],
      };
      const description = newProductDescription.trim();
      body.sku = sku;
      body.slug = finalSlug;
      body.brand = brand;
      if (description) body.description = description;
      body.sizeOrModel = sizeOrModel;
      if (newProductKind === "catalog") {
        body.sizes = [
          {
            size: sizeOrModel || "Standard",
            basicPrice,
            priceWithGst,
            pcsPerPacket: pcsPerPacketNum,
            qtyPerBag: packetsPerBagNum > 0 ? packetsPerBagNum : 0,
          },
        ];
      }

      const res = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json().catch(() => ({}))) as {
        message?: string;
        data?: { _id?: string; slug?: string };
      };
      if (!res.ok) {
        throw new Error(json.message || "Failed to create product");
      }
      const createdSlug =
        typeof json.data?.slug === "string" && json.data.slug.trim()
          ? json.data.slug.trim().toLowerCase()
          : "";
      if (!createdSlug) {
        throw new Error("Could not resolve product slug for combo target. Please enter product slug manually.");
      }

      const prods = await fetchAllProductOptions();
      setProductOptions(prods);
      setForm((f) => {
        if (addProductTo === "target") {
          return {
            ...f,
            targetProductSlugs: toggleSlug(f.targetProductSlugs, createdSlug, true),
          };
        }
        return {
          ...f,
          fallbackTargetProductSlugs: toggleSlug(f.fallbackTargetProductSlugs, createdSlug, true),
        };
      });
      setAddProductModalOpen(false);
    } catch (e) {
      setAddProductError(e instanceof Error ? e.message : "Could not create product");
    } finally {
      setCreatingProduct(false);
    }
  }

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
                      {(r.targetSlugs ?? []).length} combo slug(s), {(r.fallbackTargetSlugs ?? []).length} fallback slug(s)
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
                hint="Select one or multiple trigger categories. Trigger products list below will show only products from selected categories."
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
                hint="Only products belonging to selected trigger categories are shown here."
                idPrefix="trig-prod"
                search={searchTrigProd}
                onSearchChange={setSearchTrigProd}
                loading={optionsLoading}
                emptyMessage={
                  form.triggerCategoryIds.length > 0
                    ? "No products in the selected categories."
                    : "Select a trigger category first."
                }
                options={triggerProdRows}
                selectedKeys={form.triggerProductSlugs}
                onToggle={(key, checked) =>
                  setForm((f) => ({ ...f, triggerProductSlugs: toggleSlug(f.triggerProductSlugs, key, checked) }))
                }
                onClear={() => setForm((f) => ({ ...f, triggerProductSlugs: [] }))}
              />

              <MultiCheckboxBlock
                title="Target products"
                hint="These are combo target products. They must belong to selected trigger categories."
                idPrefix="tgt-prod"
                search={searchTgtProd}
                showSearch={false}
                onSearchChange={setSearchTgtProd}
                loading={optionsLoading}
                emptyMessage={
                  form.triggerCategoryIds.length > 0
                    ? "No target product added yet. Use Add Product button below."
                    : "Select a trigger category first."
                }
                options={selectedTargetProdRows}
                selectedKeys={form.targetProductSlugs}
                onToggle={(key, checked) =>
                  setForm((f) => ({ ...f, targetProductSlugs: toggleSlug(f.targetProductSlugs, key, checked) }))
                }
                onClear={() => setForm((f) => ({ ...f, targetProductSlugs: [] }))}
              />

              <MultiCheckboxBlock
                title="Fallback target products (shown when trigger threshold is NOT met)"
                hint="Pick higher-price or regular products from selected trigger categories. These are alternatives shown before combo unlock."
                idPrefix="fallback-tgt-prod"
                search={searchFallbackTgtProd}
                showSearch={false}
                onSearchChange={setSearchFallbackTgtProd}
                loading={optionsLoading}
                emptyMessage={
                  form.triggerCategoryIds.length > 0
                    ? "No fallback target product added yet. Use Add Product button below."
                    : "Select a trigger category first."
                }
                options={selectedFallbackProdRows}
                selectedKeys={form.fallbackTargetProductSlugs}
                onToggle={(key, checked) =>
                  setForm((f) => ({
                    ...f,
                    fallbackTargetProductSlugs: toggleSlug(f.fallbackTargetProductSlugs, key, checked),
                  }))
                }
                onClear={() => setForm((f) => ({ ...f, fallbackTargetProductSlugs: [] }))}
              />
              <div className="admin-field-row" style={{ marginTop: "-0.5rem", marginBottom: "0.65rem" }}>
                <button
                  type="button"
                  className="admin-btn admin-btn-ghost"
                  onClick={() => openAddProductModal("target")}
                  disabled={form.triggerCategoryIds.length === 0 || targetProductsForAddModal.length === 0}
                >
                  Add Product (Target / Fallback)
                </button>
              </div>

              <div className="admin-field">
                <span className="muted" style={{ display: "block", marginBottom: "0.35rem", fontSize: "0.85rem" }}>
                  Trigger threshold
                </span>
                <p className="muted" style={{ fontSize: "0.8rem", margin: "0 0 0.5rem" }}>
                  User must add at least this quantity of trigger products in cart to activate combo pricing.
                </p>
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
                  This is the maximum quantity allowed at combo price. After this limit, user should see: "You can
                  only add that much bags."
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
                <button
                  type="submit"
                  className="admin-btn admin-btn-primary"
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      ) : null}

      {modalOpen && addProductModalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setAddProductModalOpen(false);
          }}
        >
          <div className="admin-modal" role="dialog" aria-labelledby="combo-add-product-modal-title" style={{ maxWidth: "36rem" }}>
            <h2 id="combo-add-product-modal-title">Add product</h2>
            {addProductError ? (
              <div className="admin-banner err" role="alert">
                {addProductError}
              </div>
            ) : null}
            <div className="admin-field">
              <label htmlFor="combo-add-product-bucket">Add to</label>
              <select
                id="combo-add-product-bucket"
                value={addProductTo}
                onChange={(e) => setAddProductTo(e.target.value === "fallback" ? "fallback" : "target")}
              >
                <option value="target">Target products</option>
                <option value="fallback">Fallback target products</option>
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="combo-add-product-category-focus">Category</label>
              <select
                id="combo-add-product-category-focus"
                value={addProductCategoryFocus}
                onChange={(e) => setAddProductCategoryFocus(e.target.value)}
                disabled={triggerCategoriesForAddModal.length <= 1}
              >
                {triggerCategoriesForAddModal.length > 1 ? (
                  <option value="">Select category</option>
                ) : null}
                {triggerCategoriesForAddModal.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="admin-field">
              <label htmlFor="combo-add-product-mode">Mode</label>
              <select
                id="combo-add-product-mode"
                value={addProductMode}
                onChange={(e) => setAddProductMode(e.target.value === "new" ? "new" : "existing")}
              >
                <option value="existing">Select existing product</option>
                <option value="new">Create new product</option>
              </select>
            </div>
            {addProductMode === "existing" ? (
              <>
                <div className="admin-field">
                  <label htmlFor="combo-add-product-slug">Product</label>
                  <select
                    id="combo-add-product-slug"
                    value={addProductSlug}
                    onChange={(e) => setAddProductSlug(e.target.value)}
                    disabled={
                      triggerCategoriesForAddModal.length === 0 ||
                      (triggerCategoriesForAddModal.length > 1 && !addProductCategoryFocus) ||
                      targetProductsForAddModal.length === 0
                    }
                  >
                    <option value="">Select product</option>
                    {targetProductsForAddModal.map((p) => (
                      <option key={p.slug} value={p.slug}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <p className="muted" style={{ margin: "0.35rem 0 0", fontSize: "0.8rem" }}>
                    {triggerCategoriesForAddModal.length > 1 && !addProductCategoryFocus
                      ? "Select a category first to view products."
                      : targetProductsForAddModal.length === 0
                        ? "No products available for selected category and bucket."
                        : "Products are filtered by selected trigger category."}
                  </p>
                </div>
              </>
            ) : (
              <>
                <div className="admin-field">
                  <label htmlFor="combo-new-product-name">Product name *</label>
                  <input
                    id="combo-new-product-name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    placeholder="e.g. 20mm Clamp Premium"
                  />
                </div>
                <div className="admin-field-row">
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-sku">SKU *</label>
                    <input
                      id="combo-new-product-sku"
                      value={newProductSku}
                      onChange={(e) => setNewProductSku(e.target.value)}
                      placeholder="e.g. CLP20PREM"
                    />
                  </div>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-slug">Slug *</label>
                    <input
                      id="combo-new-product-slug"
                      value={newProductSlug}
                      onChange={(e) => setNewProductSlug(e.target.value)}
                      placeholder="e.g. 20mm-clamp-premium"
                    />
                  </div>
                </div>
                <div className="admin-field-row">
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-kind">Product kind</label>
                    <select
                      id="combo-new-product-kind"
                      value={newProductKind}
                      onChange={(e) =>
                        setNewProductKind(e.target.value === "sku" ? "sku" : "catalog")
                      }
                    >
                      <option value="catalog">Catalog</option>
                      <option value="sku">SKU line item</option>
                    </select>
                  </div>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-brand">Brand *</label>
                    <input
                      id="combo-new-product-brand"
                      value={newProductBrand}
                      onChange={(e) => setNewProductBrand(e.target.value)}
                      placeholder="e.g. Astral"
                    />
                  </div>
                </div>
                <div className="admin-field">
                  <label htmlFor="combo-new-product-description">Description (optional)</label>
                  <textarea
                    id="combo-new-product-description"
                    value={newProductDescription}
                    onChange={(e) => setNewProductDescription(e.target.value)}
                    rows={3}
                    placeholder="Short product description"
                  />
                </div>
                <div className="admin-field-row">
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-size-model">Size / model *</label>
                    <input
                      id="combo-new-product-size-model"
                      value={newProductSizeOrModel}
                      onChange={(e) => setNewProductSizeOrModel(e.target.value)}
                      placeholder="e.g. 20 MM"
                    />
                  </div>
                  <div className="admin-field" style={{ maxWidth: "9rem" }}>
                    <label htmlFor="combo-new-product-currency">Currency</label>
                    <input
                      id="combo-new-product-currency"
                      value={newProductCurrency}
                      onChange={(e) => setNewProductCurrency(e.target.value)}
                      placeholder="INR"
                    />
                  </div>
                </div>
                <div className="admin-field-row">
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-basic">Basic price *</label>
                    <input
                      id="combo-new-product-basic"
                      type="number"
                      min={0}
                      step="0.01"
                      value={newProductBasicPrice}
                      onChange={(e) => setNewProductBasicPrice(e.target.value)}
                    />
                  </div>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-gst">Price with GST *</label>
                    <input
                      id="combo-new-product-gst"
                      type="number"
                      min={0}
                      step="0.01"
                      value={newProductPriceWithGst}
                      onChange={(e) => setNewProductPriceWithGst(e.target.value)}
                    />
                  </div>
                </div>
                <div className="admin-field">
                  <label htmlFor="combo-new-product-image">Image URL (optional)</label>
                  <input
                    id="combo-new-product-image"
                    value={newProductImage}
                    onChange={(e) => setNewProductImage(e.target.value)}
                    placeholder="https://..."
                  />
                </div>
                <div className="admin-field-row">
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-bulk-unit">Bags / carton</label>
                    <select
                      id="combo-new-product-bulk-unit"
                      value={newProductBulkUnit}
                      onChange={(e) =>
                        setNewProductBulkUnit(
                          e.target.value === "per_cartoon" ? "per_cartoon" : "per_bag"
                        )
                      }
                    >
                      {BULK_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-inner-unit">Packets / box</label>
                    <select
                      id="combo-new-product-inner-unit"
                      value={newProductInnerUnit}
                      onChange={(e) =>
                        setNewProductInnerUnit(
                          e.target.value === "per_box" ? "per_box" : "per_packet"
                        )
                      }
                    >
                      {INNER_UNIT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>
                          {o.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="admin-field-row">
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-pcs-per-packet">PCS per packet</label>
                    <input
                      id="combo-new-product-pcs-per-packet"
                      type="number"
                      min={1}
                      step={1}
                      value={newProductPcsPerPacket}
                      onChange={(e) => setNewProductPcsPerPacket(e.target.value)}
                    />
                  </div>
                  <div className="admin-field" style={{ flex: 1 }}>
                    <label htmlFor="combo-new-product-packets-per-bag">Packets per master bag</label>
                    <input
                      id="combo-new-product-packets-per-bag"
                      type="number"
                      min={0}
                      step={1}
                      value={newProductPacketsPerBag}
                      onChange={(e) => setNewProductPacketsPerBag(e.target.value)}
                      placeholder="e.g. 750"
                    />
                  </div>
                </div>
                <div className="admin-field">
                  <label htmlFor="combo-new-product-key-features">Key features (one line each)</label>
                  <textarea
                    id="combo-new-product-key-features"
                    value={newProductKeyFeaturesText}
                    onChange={(e) => setNewProductKeyFeaturesText(e.target.value)}
                    rows={4}
                    placeholder={"Feature 1\nFeature 2"}
                  />
                </div>
              </>
            )}
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setAddProductModalOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={addProductMode === "existing" ? !addProductSlug : creatingProduct}
                onClick={() =>
                  void (addProductMode === "existing" ? handleAddProductFromModal() : handleCreateAndAddProduct())
                }
              >
                {addProductMode === "existing"
                  ? "Add product"
                  : creatingProduct
                    ? "Creating…"
                    : "Create and add"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
