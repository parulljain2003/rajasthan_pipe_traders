"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { MediaImageField } from "../components/MediaImageField";
import AdminCategorySearchBar from "../components/AdminCategorySearchBar";
import type { AdminCategory } from "../types";

const CATEGORY_PAGE_SIZE = 20;

const emptyForm = {
  name: "",
  slug: "",
  description: "",
  image: "",
  parentId: "" as string,
  sortOrder: "",
  sourceSectionLabel: "",
  isActive: true,
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
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

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
      sortOrder: typeof c.sortOrder === "number" && c.sortOrder > 0 ? String(c.sortOrder) : "",
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
        sourceSectionLabel: form.sourceSectionLabel.trim() || undefined,
        isActive: form.isActive,
        parent: parentId,
      };
      const manualSortOrder = Number(form.sortOrder);
      if (Number.isFinite(manualSortOrder) && manualSortOrder > 0) {
        body.sortOrder = Math.trunc(manualSortOrder);
      }
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

  async function handleDropRow(dragId: string, targetId: string) {
    if (!dragId || dragId === targetId || reordering) return;

    const fromIndex = list.findIndex((item) => item._id === dragId);
    const toIndex = list.findIndex((item) => item._id === targetId);
    if (fromIndex < 0 || toIndex < 0) return;

    const dragged = list[fromIndex];
    const target = list[toIndex];
    const draggedParent = dragged.parent?._id ?? "";
    const targetParent = target.parent?._id ?? "";
    if (draggedParent !== targetParent) {
      setError("You can reorder categories only within the same parent group.");
      return;
    }

    setReordering(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${dragged._id}`, {
        method: "PATCH",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sortOrder: target.sortOrder ?? 0,
          swapSortOrderWith: target._id,
        }),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        throw new Error(json.message || "Failed to swap category sort order");
      }
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to swap category sort order");
      await load();
    } finally {
      setReordering(false);
      setDraggingId(null);
      setDropTargetId(null);
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
                <tr
                  key={c._id}
                  id={`admin-row-${c._id}`}
                  draggable={!reordering}
                  onDragStart={(ev) => {
                    ev.dataTransfer.effectAllowed = "move";
                    ev.dataTransfer.setData("text/plain", c._id);
                    setDraggingId(c._id);
                    setDropTargetId(null);
                  }}
                  onDragOver={(ev) => {
                    ev.preventDefault();
                    ev.dataTransfer.dropEffect = "move";
                    if (dropTargetId !== c._id) setDropTargetId(c._id);
                  }}
                  onDrop={(ev) => {
                    ev.preventDefault();
                    const dragId = ev.dataTransfer.getData("text/plain") || draggingId || "";
                    void handleDropRow(dragId, c._id);
                  }}
                  onDragEnd={() => {
                    setDraggingId(null);
                    setDropTargetId(null);
                  }}
                  style={{
                    cursor: reordering ? "progress" : "grab",
                    opacity: draggingId === c._id ? 0.45 : 1,
                    outline: dropTargetId === c._id ? "2px solid #4f46e5" : "none",
                    outlineOffset: -2,
                  }}
                >
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
                    <button
                      type="button"
                      className="admin-btn admin-btn-ghost"
                      style={{ marginRight: 6 }}
                      onClick={() => openEdit(c)}
                      disabled={reordering}
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn-danger"
                      onClick={() => void handleDelete(c._id)}
                      disabled={reordering}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              {/*
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
                    setForm((f) => ({
                      ...f,
                      sortOrder: e.target.value,
                    }));
                  }}
                />
                <p className="muted" style={{ marginTop: 6 }}>
                  Optional. Leave empty to let the database auto-assign the next order in this parent group.
                </p>
              </div>
              */}
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
    </div>
  );
}
