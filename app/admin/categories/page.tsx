"use client";

import { useCallback, useEffect, useState } from "react";
import { MediaImageField } from "../components/MediaImageField";
import type { AdminCategory } from "../types";

const ADD_NEW_PARENT = "__new__";

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

/** URL-safe slug for quick-created parent categories */
function slugFromCategoryName(name: string): string {
  const raw = name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");
  return raw || `category-${Date.now()}`;
}

export default function AdminCategoriesPage() {
  const [list, setList] = useState<AdminCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [newParentName, setNewParentName] = useState("");
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/categories?includeInactive=true");
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

  function openCreate() {
    setEditingId(null);
    setForm(emptyForm);
    setNewParentName("");
    setModalOpen(true);
  }

  function openEdit(c: AdminCategory) {
    setEditingId(c._id);
    setNewParentName("");
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      let parentId: string | null = form.parentId.trim() ? form.parentId.trim() : null;
      if (parentId === ADD_NEW_PARENT) {
        const nm = newParentName.trim();
        if (!nm) {
          throw new Error("Enter a name for the new category, or choose an existing category.");
        }
        const slug = slugFromCategoryName(nm);
        const parentRes = await fetch("/api/admin/categories", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            name: nm,
            slug,
            parent: null,
            sortOrder: 0,
            isActive: true,
          }),
        });
        const parentJson = (await parentRes.json()) as { data?: { _id: string }; message?: string };
        if (!parentRes.ok) {
          const base = parentJson.message || parentRes.statusText;
          if (parentRes.status === 409) {
            throw new Error(
              `${base} The new parent uses slug "${slug}" from "New category name". Pick a different name or choose an existing category.`
            );
          }
          throw new Error(base);
        }
        const createdId = parentJson.data?._id;
        if (!createdId) throw new Error("Could not create category");
        parentId = createdId;
      }

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
      const url = editingId ? `/api/admin/categories/${editingId}` : "/api/admin/categories";
      const res = await fetch(url, {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = (await res.json()) as { message?: string };
      if (!res.ok) {
        const base = json.message || res.statusText;
        if (res.status === 409 && String(base).toLowerCase().includes("slug")) {
          const s = form.slug.trim().toLowerCase();
          throw new Error(
            `${base} The "Slug (lowercase, URL-safe)" field must be unique for every category. It is separate from "New category name". Change this row’s slug (e.g. "${s}-2") if "${s}" is already taken.`
          );
        }
        throw new Error(base);
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
    if (!confirm("Delete this category? Products or subcategories may block deletion.")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  const parentOptions = list.filter((c) => c._id !== editingId);

  return (
    <div>
      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}

      <div className="admin-toolbar">
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

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Image</th>
                <th>Name</th>
                <th>Slug</th>
                <th>Category</th>
                <th>Order</th>
                <th>Active</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
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
                  <td>{c.parent?.name ?? "—"}</td>
                  <td>{c.sortOrder}</td>
                  <td>{c.isActive ? "Yes" : "No"}</td>
                  <td style={{ whiteSpace: "nowrap" }}>
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
              ))}
            </tbody>
          </table>
          {list.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No categories.</p> : null}
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
          <div className="admin-modal" role="dialog" aria-labelledby="cat-modal-title">
            <h2 id="cat-modal-title">{editingId ? "Edit category" : "New category"}</h2>
            <form onSubmit={(e) => void handleSubmit(e)}>
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
              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cat-parent">Category</label>
                  <select
                    id="cat-parent"
                    value={form.parentId}
                    onChange={(e) => {
                      const v = e.target.value;
                      setForm((f) => ({ ...f, parentId: v }));
                      if (v !== ADD_NEW_PARENT) setNewParentName("");
                    }}
                  >
                    <option value="">None</option>
                    {parentOptions.map((c) => (
                      <option key={c._id} value={c._id}>
                        {c.name}
                      </option>
                    ))}
                    <option value={ADD_NEW_PARENT}>Add new category…</option>
                  </select>
                  {form.parentId === ADD_NEW_PARENT ? (
                    <div className="admin-field" style={{ marginTop: "0.75rem" }}>
                      <label htmlFor="cat-new-parent-name">New category name</label>
                      <input
                        id="cat-new-parent-name"
                        value={newParentName}
                        onChange={(e) => setNewParentName(e.target.value)}
                        placeholder="Creates a top-level category, then links this one under it"
                        autoComplete="off"
                      />
                    </div>
                  ) : null}
                </div>
                <div className="admin-field">
                  <label htmlFor="cat-order">Sort order</label>
                  <input
                    id="cat-order"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
                </div>
              </div>
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
