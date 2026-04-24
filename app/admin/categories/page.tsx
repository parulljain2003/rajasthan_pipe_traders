"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaImageField } from "../components/MediaImageField";
import AdminCategorySearchBar from "../components/AdminCategorySearchBar";
import type { AdminCategory } from "../types";
import {
  DndContext,
  closestCenter,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { restrictToVerticalAxis, restrictToWindowEdges } from "@dnd-kit/modifiers";
import { SortableCategoryRow } from "./SortableCategoryRow";

const CATEGORY_PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
  parentId: "" as string,
  sortOrder: 0,
  sourceSectionLabel: "",
  isActive: true,
};

type AdminCategoryProduct = {
  _id: string;
  name: string;
  slug?: string;
  isActive?: boolean;
  isEligibleForCombo?: boolean | null;
  category?: { _id: string; name: string; slug: string } | null;
};

const emptyProductEdit = {
  id: "",
  name: "",
  slug: "",
  isActive: true,
  isEligibleForCombo: false,
};

export default function AdminCategoriesPage() {
  const [list, setList] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [sortConflict, setSortConflict] = useState<{
    _id: string;
    name: string;
    sortOrder: number;
  } | null>(null);
  const [page, setPage] = useState(0);
  const [activeCategoryId, setActiveCategoryId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  const [comboCountByCategoryId, setComboCountByCategoryId] = useState<Record<string, number>>({});
  const [comboModalOpen, setComboModalOpen] = useState(false);
  const [comboModalCategory, setComboModalCategory] = useState<AdminCategory | null>(null);
  const [comboProducts, setComboProducts] = useState<AdminCategoryProduct[]>([]);
  const [comboProductsLoading, setComboProductsLoading] = useState(false);
  const [productEditOpen, setProductEditOpen] = useState(false);
  const [productEditSaving, setProductEditSaving] = useState(false);
  const [productEdit, setProductEdit] = useState(emptyProductEdit);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories?includeInactive=true", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      setList(json.data as AdminCategory[]);
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

  const loadComboCounts = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/products?limit=500", { cache: "no-store" });
      const json = (await res.json()) as { data?: AdminCategoryProduct[] };
      if (!res.ok || !Array.isArray(json.data)) return;
      const next: Record<string, number> = {};
      for (const p of json.data) {
        if (typeof p.isEligibleForCombo !== "boolean") continue;
        const cid = p.category?._id;
        if (!cid) continue;
        next[cid] = (next[cid] ?? 0) + 1;
      }
      setComboCountByCategoryId(next);
    } catch {
      // silent: category CRUD should keep working even if this helper fails
    }
  }, []);

  useEffect(() => {
    void loadComboCounts();
  }, [loadComboCounts]);

  const total = list.length;
  const pageSlice = useMemo(
    () => list.slice(page * CATEGORY_PAGE_SIZE, page * CATEGORY_PAGE_SIZE + CATEGORY_PAGE_SIZE),
    [list, page],
  );

  useEffect(() => {
    const maxPage = Math.max(0, Math.ceil(total / CATEGORY_PAGE_SIZE) - 1);
    if (total === 0) setPage(0);
    else if (page > maxPage) setPage(maxPage);
  }, [total, page]);

  const canPrevPage = page > 0;
  const canNextPage = (page + 1) * CATEGORY_PAGE_SIZE < total;
  const activeCategory = activeCategoryId
    ? list.find((category) => category._id === activeCategoryId) ?? null
    : null;

  useEffect(() => {
    if (!activeCategoryId) return;

    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    let pointerY: number | null = null;
    const PAGE_TURN_ZONE = 120;
    const PAGE_TURN_DELAY = 250;

    const schedulePageTurn = () => {
      if (timeoutId || pointerY === null) return;

      if (pointerY >= window.innerHeight - PAGE_TURN_ZONE && canNextPage) {
        timeoutId = setTimeout(() => {
          setPage((currentPage) => currentPage + 1);
          timeoutId = null;
          frameId = requestAnimationFrame(schedulePageTurn);
        }, PAGE_TURN_DELAY);
        return;
      }

      if (pointerY <= PAGE_TURN_ZONE && canPrevPage) {
        timeoutId = setTimeout(() => {
          setPage((currentPage) => Math.max(0, currentPage - 1));
          timeoutId = null;
          frameId = requestAnimationFrame(schedulePageTurn);
        }, PAGE_TURN_DELAY);
      }
    };

    const handlePointerMove = (event: PointerEvent) => {
      pointerY = event.clientY;
      schedulePageTurn();
    };

    window.addEventListener("pointermove", handlePointerMove);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      if (frameId) cancelAnimationFrame(frameId);
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [activeCategoryId, canNextPage, canPrevPage]);

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setSortConflict(null);
    setModalOpen(true);
  }

  function openEdit(c: AdminCategory) {
    setEditingId(c._id);
    setSortConflict(null);
    setForm({
      name: c.name,
      slug: c.slug,
      description: c.description ?? "",
      image: c.image ?? "",
      parentId: c.parent?._id ?? "",
      sortOrder: c.sortOrder ?? 0,
      sourceSectionLabel: c.sourceSectionLabel ?? "",
      isActive: c.isActive,
    });
    setModalOpen(true);
  }

  async function saveCategory(swapSortOrderWith?: string) {
    setSaving(true);
    setError(null);
    if (!swapSortOrderWith) setSortConflict(null);
    try {
      const parentId = form.parentId.trim() ? form.parentId.trim() : null;

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        slug: form.slug.trim().toLowerCase(),
        description: form.description.trim() || undefined,
        image: form.image.trim() || null,
        sortOrder: Number(form.sortOrder) || 0,
        sourceSectionLabel: form.sourceSectionLabel.trim() || undefined,
        isActive: form.isActive,
        parent: parentId,
      };
      if (swapSortOrderWith) {
        body.swapSortOrderWith = swapSortOrderWith;
      }
      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as {
        message?: string;
        code?: string;
        conflict?: { _id: string; name: string; sortOrder: number };
      };
      if (!res.ok) {
        const base = json.message || res.statusText;
        if (res.status === 409 && json.code === "SORT_ORDER_CONFLICT" && json.conflict) {
          setSortConflict(json.conflict);
          setError(
            `Sort order ${json.conflict.sortOrder} is already used by “${json.conflict.name}” in this group.`
          );
          return;
        }
        if (res.status === 409 && String(base).toLowerCase().includes("slug")) {
          const s = form.slug.trim().toLowerCase();
          throw new Error(
            `${base} The slug must be unique. Try a different value (e.g. "${s}-2").`
          );
        }
        throw new Error(base);
      }
      setSortConflict(null);
      setModalOpen(false);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    void saveCategory();
  }

  async function handleSwapSortOrder() {
    if (!sortConflict) return;
    await saveCategory(sortConflict._id);
  }

  async function handleDelete(id: string) {
    if (!confirm("Delete this category? Products or subcategories may block deletion.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE", cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  function handleDragStart(event: DragStartEvent) {
    setActiveCategoryId(String(event.active.id));
  }

  async function handleDragEnd(event: DragEndEvent) {
    setActiveCategoryId(null);
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = list.findIndex((c) => c._id === active.id);
    const newIndex = list.findIndex((c) => c._id === over.id);

    if (oldIndex === -1 || newIndex === -1) return;

    const newList = arrayMove(list, oldIndex, newIndex);
    setList(newList);

    try {
      const res = await fetch("/api/admin/categories/reorder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: newList.map((c) => c._id) }),
      });
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.message || "Failed to save new order");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reorder failed");
      void load(); // Rollback on failure
    }
  }

  function handleDragCancel() {
    setActiveCategoryId(null);
  async function openComboProducts(c: AdminCategory) {
    setComboModalCategory(c);
    setComboModalOpen(true);
    setComboProducts([]);
    setComboProductsLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/admin/products?categorySlug=${encodeURIComponent(c.slug)}&limit=500`,
        { cache: "no-store" }
      );
      const json = (await res.json()) as { data?: AdminCategoryProduct[]; message?: string };
      if (!res.ok) throw new Error(json.message || res.statusText);
      const rows = Array.isArray(json.data) ? json.data : [];
      setComboProducts(rows.filter((p) => typeof p.isEligibleForCombo === "boolean"));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load category products");
      setComboProducts([]);
    } finally {
      setComboProductsLoading(false);
    }
  }

  function openProductEdit(p: AdminCategoryProduct) {
    setProductEdit({
      id: p._id,
      name: p.name ?? "",
      slug: p.slug ?? "",
      isActive: p.isActive !== false,
      isEligibleForCombo: p.isEligibleForCombo === true,
    });
    setProductEditOpen(true);
  }

  async function saveProductEdit() {
    if (!productEdit.id) return;
    setProductEditSaving(true);
    setError(null);
    try {
      const body = {
        name: productEdit.name.trim(),
        slug: productEdit.slug.trim().toLowerCase(),
        isActive: productEdit.isActive,
        isEligibleForCombo: productEdit.isEligibleForCombo,
      };
      const res = await fetch(`/api/admin/products/${productEdit.id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message || res.statusText);
      setProductEditOpen(false);
      if (comboModalCategory) await openComboProducts(comboModalCategory);
      await loadComboCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setProductEditSaving(false);
    }
  }

  async function deleteComboProduct(id: string) {
    if (!confirm("Delete this product?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/products/${id}`, { method: "DELETE", cache: "no-store" });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) throw new Error(json.message || res.statusText);
      setComboProducts((prev) => prev.filter((p) => p._id !== id));
      await loadComboCounts();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  return (
    <div>
      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-toolbar admin-toolbar-with-search">
        <div className="admin-toolbar-left">
          <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
            New category
          </button>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            onClick={() => void load()}
            disabled={loading}
          >
            Refresh
          </button>
        </div>
        {!loading ? <AdminCategorySearchBar categories={list} /> : null}
      </div>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
            modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  <th style={{ width: "40px" }} />
                  <th>S.No</th>
                  <th>Image</th>
                  <th>Name</th>
                  <th>Slug</th>
                  <th>Order</th>
                  <th>Active</th>
                  <th />
          <table className="admin-table">
            <thead>
              <tr>
                <th>S.No</th>
                <th>Image</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Order</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {pageSlice.map((c, index) => (
                <tr key={c._id} id={`admin-row-${c._id}`}>
                  <td>{page * CATEGORY_PAGE_SIZE + index + 1}</td>
                  <td>
                    {c.image ? (
                      <img src={c.image} alt="" className="admin-thumb" />
                    ) : (
                      "—"
                    )}
                  </td>
                  <td>{c.name}</td>
                  <td>
                    <span className="muted">{c.slug}</span>
                  </td>
                  <td>{c.sortOrder ?? 0}</td>
                  <td>{c.isActive ? "Yes" : "No"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
                    {((comboCountByCategoryId[c._id] ?? 0) > 0) ? (
                      <button
                        type="button"
                        className="admin-btn admin-btn-ghost"
                        style={{ marginRight: 6 }}
                        onClick={() => void openComboProducts(c)}
                      >
                        Combo products
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      style={{ marginRight: 6 }}
                      onClick={() => openEdit(c)}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => void handleDelete(c._id)}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              </thead>
              <SortableContext items={pageSlice.map((c) => c._id)} strategy={verticalListSortingStrategy}>
                <tbody>
                  {pageSlice.map((c, index) => (
                    <SortableCategoryRow
                      key={c._id}
                      category={c}
                      index={index}
                      page={page}
                      pageSize={CATEGORY_PAGE_SIZE}
                      onEdit={openEdit}
                      onDelete={handleDelete}
                    />
                  ))}
                </tbody>
              </SortableContext>
            </table>
            <DragOverlay>
              {activeCategory ? (
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "56px minmax(0, 1fr)",
                    gap: 12,
                    alignItems: "center",
                    minWidth: 320,
                    maxWidth: 520,
                    padding: "12px 16px",
                    borderRadius: 12,
                    border: "1px solid rgba(148, 163, 184, 0.4)",
                    background: "#ffffff",
                    boxShadow: "0 18px 38px rgba(15, 23, 42, 0.18)",
                  }}
                >
                  <div
                    style={{
                      fontSize: 12,
                      fontWeight: 600,
                      color: "var(--admin-muted, #64748b)",
                    }}
                  >
                    #{list.findIndex((category) => category._id === activeCategory._id) + 1}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 600,
                        color: "var(--admin-text, #0f172a)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {activeCategory.name}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--admin-muted, #64748b)",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {activeCategory.slug}
                    </div>
                  </div>
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          {list.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No categories.</p> : null}
        </div>
      )}

      {!loading && total > 0 ? (
        <div className="admin-pagination">
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            disabled={!canPrevPage || loading}
            onClick={() => setPage((p) => Math.max(0, p - 1))}
          >
            Previous
          </button>
          <span>
            Showing {page * CATEGORY_PAGE_SIZE + 1}–{Math.min((page + 1) * CATEGORY_PAGE_SIZE, total)} of{" "}
            {total}
          </span>
          <button
            type="button"
            className="admin-btn admin-btn-ghost"
            disabled={!canNextPage || loading}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </button>
        </div>
      ) : null}

      {modalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setModalOpen(false);
          }}
        >
          <div className="admin-modal" role="dialog" aria-labelledby="cat-modal-title">
            <h2 id="cat-modal-title">{editingId ? "Edit category" : "New category"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="admin-field">
                <label htmlFor="cat-name">Name</label>
                <input
                  id="cat-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="cat-slug">Slug (lowercase, URL-safe)</label>
                <input
                  id="cat-slug"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="cat-desc">Description</label>
                <textarea
                  id="cat-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                />
              </div>
              <MediaImageField
                label="Category image (Cloudinary)"
                kind="category"
                categoryId={editingId ?? undefined}
                value={form.image}
                onUrlChange={(url) => setForm((f) => ({ ...f, image: url }))}
                helpText="Uploads to Cloudinary (folder rpt/category/…). Set CLOUDINARY_URL in .env.local."
              />
              <div className="admin-field">
                <label htmlFor="cat-sort">Sort order</label>
                <input
                  id="cat-sort"
                  type="number"
                  inputMode="numeric"
                  min={0}
                  step={1}
                  value={form.sortOrder}
                  onChange={(e) => {
                    setSortConflict(null);
                    const v = e.target.value;
                    setForm((f) => ({
                      ...f,
                      sortOrder: v === "" ? 0 : Number(v),
                    }));
                  }}
                />
                <p className="muted" style={{ marginTop: 6 }}>
                  Lower numbers appear first within the same parent group. If this order is already taken, you can swap after save.
                </p>
              </div>
              {sortConflict ? (
                <div className="admin-banner" role="status" style={{ marginBottom: 12 }}>
                  <p style={{ margin: "0 0 8px" }}>
                    {editingId
                      ? `Swap: this category will take sort order ${sortConflict.sortOrder}, and “${sortConflict.name}” will take your current order.`
                      : `“${sortConflict.name}” uses this order. Move it to the end of the list and use ${sortConflict.sortOrder} for this category.`}
                  </p>
                  <button
                    type="button"
                    className="admin-btn admin-btn-primary"
                    disabled={saving}
                    onClick={() => void handleSwapSortOrder()}
                  >
                    {editingId ? "Swap sort order" : "Apply and move other category"}
                  </button>
                </div>
              ) : null}
              <div className="admin-field">
                <label htmlFor="cat-source">Source section label (optional)</label>
                <input
                  id="cat-source"
                  value={form.sourceSectionLabel}
                  onChange={(e) => setForm((f) => ({ ...f, sourceSectionLabel: e.target.value }))}
                />
              </div>
              <div className="admin-field">
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

      {comboModalOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setComboModalOpen(false);
          }}
        >
          <div className="admin-modal" role="dialog" aria-labelledby="combo-products-title">
            <h2 id="combo-products-title">
              Combo products in {comboModalCategory?.name ?? "category"}
            </h2>
            {comboProductsLoading ? <p className="muted">Loading products…</p> : null}
            {!comboProductsLoading && comboProducts.length === 0 ? (
              <p className="muted">No products with combo eligibility set in this category.</p>
            ) : null}
            {!comboProductsLoading && comboProducts.length > 0 ? (
              <div className="admin-table-wrap" style={{ marginBottom: 12 }}>
                <table className="admin-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Slug</th>
                      <th>Combo flag</th>
                      <th>Active</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {comboProducts.map((p) => (
                      <tr key={p._id}>
                        <td>{p.name}</td>
                        <td><span className="muted">{p.slug || "—"}</span></td>
                        <td>{p.isEligibleForCombo === true ? "true" : p.isEligibleForCombo === false ? "false" : "null"}</td>
                        <td>{p.isActive === false ? "No" : "Yes"}</td>
                        <td style={{ whiteSpace: "nowrap" }}>
                          <button
                            type="button"
                            className="admin-btn admin-btn-ghost"
                            style={{ marginRight: 6 }}
                            onClick={() => openProductEdit(p)}
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            className="admin-btn admin-btn-danger"
                            onClick={() => void deleteComboProduct(p._id)}
                          >
                            Delete
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setComboModalOpen(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {productEditOpen ? (
        <div
          className="admin-modal-backdrop"
          role="presentation"
          onMouseDown={(ev) => {
            if (ev.target === ev.currentTarget) setProductEditOpen(false);
          }}
        >
          <div className="admin-modal" role="dialog" aria-labelledby="combo-product-edit-title">
            <h2 id="combo-product-edit-title">Edit combo product</h2>
            <div className="admin-field">
              <label htmlFor="combo-prod-name">Name</label>
              <input
                id="combo-prod-name"
                value={productEdit.name}
                onChange={(e) => setProductEdit((p) => ({ ...p, name: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label htmlFor="combo-prod-slug">Slug</label>
              <input
                id="combo-prod-slug"
                value={productEdit.slug}
                onChange={(e) => setProductEdit((p) => ({ ...p, slug: e.target.value }))}
              />
            </div>
            <div className="admin-field">
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={productEdit.isEligibleForCombo}
                  onChange={(e) =>
                    setProductEdit((p) => ({ ...p, isEligibleForCombo: e.target.checked }))
                  }
                />
                isEligibleForCombo = true
              </label>
            </div>
            <div className="admin-field">
              <label className="admin-check">
                <input
                  type="checkbox"
                  checked={productEdit.isActive}
                  onChange={(e) => setProductEdit((p) => ({ ...p, isActive: e.target.checked }))}
                />
                Active
              </label>
            </div>
            <div className="admin-modal-actions">
              <button type="button" className="admin-btn admin-btn-ghost" onClick={() => setProductEditOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="admin-btn admin-btn-primary"
                disabled={productEditSaving}
                onClick={() => void saveProductEdit()}
              >
                {productEditSaving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
