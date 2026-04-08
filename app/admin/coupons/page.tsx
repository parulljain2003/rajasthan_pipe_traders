"use client";

import { useCallback, useEffect, useState } from "react";
import type { AdminCoupon } from "../types";

function toDatetimeLocalValue(iso: string | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * datetime-local often stores "end" as midnight start of that day, which makes the coupon
 * expire immediately for the rest of the day. Treat midnight as "through end of that local day".
 */
function endAtToIso(formEnd: string): string {
  const d = new Date(formEnd);
  if (
    !Number.isNaN(d.getTime()) &&
    d.getHours() === 0 &&
    d.getMinutes() === 0 &&
    d.getSeconds() === 0 &&
    d.getMilliseconds() === 0
  ) {
    d.setHours(23, 59, 59, 999);
  }
  return d.toISOString();
}

const emptyForm = {
  code: "",
  name: "",
  discountType: "percentage" as AdminCoupon["discountType"],
  discountPercent: 7,
  fixedAmountOff: 0,
  displayPrimary: "",
  displaySecondary: "OFF",
  title: "",
  description: "",
  themeKey: "blue",
  colorAccent: "",
  colorStub: "",
  colorBorder: "",
  colorBtnBg: "",
  colorBtnText: "",
  applicableProductIds: "",
  applicableCategoryIds: "",
  minOrderValue: 0,
  minTotalQuantity: 0,
  minEligibleLines: 0,
  startAt: "",
  endAt: "",
  isActive: true,
  displayInBanner: true,
  showInCart: true,
  sortOrder: 0,
  internalNotes: "",
};

export default function AdminCouponsPage() {
  const [list, setList] = useState<AdminCoupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/coupons");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      setList(json.data as AdminCoupon[]);
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
    setModalOpen(true);
  }

  function openEdit(c: AdminCoupon) {
    setEditingId(c._id);
    const cc = c.customColors ?? {};
    setForm({
      code: c.code,
      name: c.name ?? "",
      discountType: c.discountType,
      discountPercent: c.discountPercent ?? 0,
      fixedAmountOff: c.fixedAmountOff ?? 0,
      displayPrimary: c.displayPrimary,
      displaySecondary: c.displaySecondary ?? "",
      title: c.title,
      description: c.description ?? "",
      themeKey: c.themeKey ?? "blue",
      colorAccent: cc.accent ?? "",
      colorStub: cc.stubBackground ?? "",
      colorBorder: cc.border ?? "",
      colorBtnBg: cc.buttonBackground ?? "",
      colorBtnText: cc.buttonText ?? "",
      applicableProductIds: (c.applicableProductIds ?? []).join(", "),
      applicableCategoryIds: (c.applicableCategoryIds ?? []).join(", "),
      minOrderValue: c.minOrderValue ?? 0,
      minTotalQuantity: c.minTotalQuantity ?? 0,
      minEligibleLines: c.minEligibleLines ?? 0,
      startAt: toDatetimeLocalValue(c.startAt),
      endAt: toDatetimeLocalValue(c.endAt),
      isActive: c.isActive,
      displayInBanner: c.displayInBanner,
      showInCart: c.showInCart,
      sortOrder: c.sortOrder ?? 0,
      internalNotes: c.internalNotes ?? "",
    });
    setModalOpen(true);
  }

  function buildBody(): Record<string, unknown> {
    const hasColor =
      form.colorAccent.trim() ||
      form.colorStub.trim() ||
      form.colorBorder.trim() ||
      form.colorBtnBg.trim() ||
      form.colorBtnText.trim();
    const customColors = hasColor
      ? {
          accent: form.colorAccent.trim() || undefined,
          stubBackground: form.colorStub.trim() || undefined,
          border: form.colorBorder.trim() || undefined,
          buttonBackground: form.colorBtnBg.trim() || undefined,
          buttonText: form.colorBtnText.trim() || undefined,
        }
      : editingId
        ? null
        : undefined;
    return {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim() || undefined,
      discountType: form.discountType,
      discountPercent: form.discountType === "percentage" ? Number(form.discountPercent) : undefined,
      fixedAmountOff: form.discountType === "fixed_amount" ? Number(form.fixedAmountOff) : undefined,
      displayPrimary: form.displayPrimary.trim(),
      displaySecondary: form.displaySecondary.trim(),
      title: form.title.trim(),
      description: form.description.trim(),
      themeKey: form.themeKey,
      customColors,
      applicableProductIds: form.applicableProductIds,
      applicableCategoryIds: form.applicableCategoryIds,
      minOrderValue: Number(form.minOrderValue) || 0,
      minTotalQuantity: Number(form.minTotalQuantity) || 0,
      minEligibleLines: Number(form.minEligibleLines) || 0,
      startAt: form.startAt ? new Date(form.startAt).toISOString() : null,
      endAt: form.endAt ? endAtToIso(form.endAt) : null,
      isActive: form.isActive,
      displayInBanner: form.displayInBanner,
      showInCart: form.showInCart,
      sortOrder: Number(form.sortOrder) || 0,
      internalNotes: form.internalNotes.trim() || undefined,
    };
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      const body = buildBody();
      const url = editingId ? `/api/admin/coupons/${editingId}` : "/api/admin/coupons";
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
    if (!confirm("Delete this coupon?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/coupons/${id}`, { method: "DELETE" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      await load();
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

      <div className="admin-toolbar">
        <button type="button" className="admin-btn admin-btn-primary" onClick={openCreate}>
          New coupon
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

      <p className="muted" style={{ maxWidth: "48rem", marginBottom: "1rem" }}>
        Coupons can target specific products or categories (comma-separated MongoDB ObjectIds). Leave those lists empty
        to allow all catalog items. Minimum order and quantity apply only to eligible lines. Set dates to limit the
        campaign window.
      </p>

      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Code</th>
                <th>Title</th>
                <th>Type</th>
                <th>Banner</th>
                <th>Cart</th>
                <th>Active</th>
                <th>Order</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {list.map((c) => (
                <tr key={c._id}>
                  <td>
                    <strong>{c.code}</strong>
                  </td>
                  <td>{c.title}</td>
                  <td>
                    <span className="muted">{c.discountType}</span>
                  </td>
                  <td>{c.displayInBanner ? "Yes" : "No"}</td>
                  <td>{c.showInCart ? "Yes" : "No"}</td>
                  <td>{c.isActive ? "Yes" : "No"}</td>
                  <td>{c.sortOrder}</td>
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
          {list.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No coupons yet.</p> : null}
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
          <div className="admin-modal wide" role="dialog" aria-labelledby="coupon-modal-title">
            <h2 id="coupon-modal-title">{editingId ? "Edit coupon" : "New coupon"}</h2>
            <form onSubmit={(e) => void handleSubmit(e)}>
              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-code">Code *</label>
                  <input
                    id="cp-code"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))}
                    required
                    disabled={Boolean(editingId)}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-name">Internal name</label>
                  <input
                    id="cp-name"
                    value={form.name}
                    onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-dtype">Discount type *</label>
                  <select
                    id="cp-dtype"
                    value={form.discountType}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, discountType: e.target.value as AdminCoupon["discountType"] }))
                    }
                  >
                    <option value="percentage">Percentage off eligible subtotal</option>
                    <option value="fixed_amount">Fixed INR off eligible subtotal</option>
                    <option value="free_dispatch">Free dispatch (display / policy)</option>
                    <option value="free_shipping">Free shipping (display / policy)</option>
                  </select>
                </div>
                {form.discountType === "percentage" ? (
                  <div className="admin-field">
                    <label htmlFor="cp-pct">Discount %</label>
                    <input
                      id="cp-pct"
                      type="number"
                      min={0}
                      max={100}
                      step={0.01}
                      value={form.discountPercent}
                      onChange={(e) => setForm((f) => ({ ...f, discountPercent: Number(e.target.value) }))}
                    />
                  </div>
                ) : null}
                {form.discountType === "fixed_amount" ? (
                  <div className="admin-field">
                    <label htmlFor="cp-fixed">Amount off (INR)</label>
                    <input
                      id="cp-fixed"
                      type="number"
                      min={0}
                      step={1}
                      value={form.fixedAmountOff}
                      onChange={(e) => setForm((f) => ({ ...f, fixedAmountOff: Number(e.target.value) }))}
                    />
                  </div>
                ) : null}
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-d1">Display primary (stub) *</label>
                  <input
                    id="cp-d1"
                    value={form.displayPrimary}
                    onChange={(e) => setForm((f) => ({ ...f, displayPrimary: e.target.value }))}
                    placeholder="e.g. 7%"
                    required
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-d2">Display secondary (stub)</label>
                  <input
                    id="cp-d2"
                    value={form.displaySecondary}
                    onChange={(e) => setForm((f) => ({ ...f, displaySecondary: e.target.value }))}
                    placeholder="e.g. OFF"
                  />
                </div>
              </div>

              <div className="admin-field">
                <label htmlFor="cp-title">Title (condition line) *</label>
                <input
                  id="cp-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  required
                />
              </div>
              <div className="admin-field">
                <label htmlFor="cp-desc">Description</label>
                <textarea
                  id="cp-desc"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={2}
                />
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-theme">Theme preset</label>
                  <select
                    id="cp-theme"
                    value={form.themeKey}
                    onChange={(e) => setForm((f) => ({ ...f, themeKey: e.target.value }))}
                  >
                    <option value="blue">Blue</option>
                    <option value="indigo">Indigo</option>
                    <option value="green">Green</option>
                    <option value="amber">Amber</option>
                    <option value="brown">Brown / gold</option>
                  </select>
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-sort">Sort order</label>
                  <input
                    id="cp-sort"
                    type="number"
                    value={form.sortOrder}
                    onChange={(e) => setForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <p className="muted" style={{ margin: "0.25rem 0 0.5rem" }}>
                Optional hex colors override the preset for the storefront card.
              </p>
              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-ca">Accent text</label>
                  <input
                    id="cp-ca"
                    value={form.colorAccent}
                    onChange={(e) => setForm((f) => ({ ...f, colorAccent: e.target.value }))}
                    placeholder="#93c5fd"
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-cs">Stub background</label>
                  <input
                    id="cp-cs"
                    value={form.colorStub}
                    onChange={(e) => setForm((f) => ({ ...f, colorStub: e.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-cb">Border</label>
                  <input
                    id="cp-cb"
                    value={form.colorBorder}
                    onChange={(e) => setForm((f) => ({ ...f, colorBorder: e.target.value }))}
                  />
                </div>
              </div>
              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-cbb">Button background</label>
                  <input
                    id="cp-cbb"
                    value={form.colorBtnBg}
                    onChange={(e) => setForm((f) => ({ ...f, colorBtnBg: e.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-cbt">Button text</label>
                  <input
                    id="cp-cbt"
                    value={form.colorBtnText}
                    onChange={(e) => setForm((f) => ({ ...f, colorBtnText: e.target.value }))}
                  />
                </div>
              </div>

              <div className="admin-field">
                <label htmlFor="cp-prod">Applicable product IDs (comma or whitespace)</label>
                <textarea
                  id="cp-prod"
                  value={form.applicableProductIds}
                  onChange={(e) => setForm((f) => ({ ...f, applicableProductIds: e.target.value }))}
                  rows={2}
                  placeholder="Empty = all products"
                />
              </div>
              <div className="admin-field">
                <label htmlFor="cp-cat">Applicable category IDs (comma or whitespace)</label>
                <textarea
                  id="cp-cat"
                  value={form.applicableCategoryIds}
                  onChange={(e) => setForm((f) => ({ ...f, applicableCategoryIds: e.target.value }))}
                  rows={2}
                  placeholder="Empty = all categories"
                />
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-mino">Min order (₹) on eligible lines</label>
                  <input
                    id="cp-mino"
                    type="number"
                    min={0}
                    value={form.minOrderValue}
                    onChange={(e) => setForm((f) => ({ ...f, minOrderValue: Number(e.target.value) }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-minq">Min total qty (eligible lines)</label>
                  <input
                    id="cp-minq"
                    type="number"
                    min={0}
                    value={form.minTotalQuantity}
                    onChange={(e) => setForm((f) => ({ ...f, minTotalQuantity: Number(e.target.value) }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-minl">Min eligible line items</label>
                  <input
                    id="cp-minl"
                    type="number"
                    min={0}
                    value={form.minEligibleLines}
                    onChange={(e) => setForm((f) => ({ ...f, minEligibleLines: Number(e.target.value) }))}
                  />
                </div>
              </div>

              <div className="admin-field-row">
                <div className="admin-field">
                  <label htmlFor="cp-start">Start (local)</label>
                  <input
                    id="cp-start"
                    type="datetime-local"
                    value={form.startAt}
                    onChange={(e) => setForm((f) => ({ ...f, startAt: e.target.value }))}
                  />
                </div>
                <div className="admin-field">
                  <label htmlFor="cp-end">End (local)</label>
                  <input
                    id="cp-end"
                    type="datetime-local"
                    value={form.endAt}
                    onChange={(e) => setForm((f) => ({ ...f, endAt: e.target.value }))}
                  />
                </div>
              </div>
              <p className="muted" style={{ margin: "0 0 0.75rem", fontSize: "0.85rem" }}>
                Leave start/end empty for no date limit. If the coupon never appears on the site, check that today is
                not after the end date — end time 00:00 is treated as the end of that calendar day.
              </p>

              <div className="admin-field-row">
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
                    checked={form.displayInBanner}
                    onChange={(e) => setForm((f) => ({ ...f, displayInBanner: e.target.checked }))}
                  />
                  Show in hero banner
                </label>
                <label className="admin-check">
                  <input
                    type="checkbox"
                    checked={form.showInCart}
                    onChange={(e) => setForm((f) => ({ ...f, showInCart: e.target.checked }))}
                  />
                  Show in cart
                </label>
              </div>

              <div className="admin-field">
                <label htmlFor="cp-notes">Internal notes</label>
                <textarea
                  id="cp-notes"
                  value={form.internalNotes}
                  onChange={(e) => setForm((f) => ({ ...f, internalNotes: e.target.value }))}
                  rows={2}
                />
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
