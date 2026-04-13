"use client";

import { useCallback, useEffect, useState } from "react";

export default function AdminSettingsPage() {
  const [minimumOrderInclGst, setMinimumOrderInclGst] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/app-settings");
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      const n = json.data?.minimumOrderInclGst;
      setMinimumOrderInclGst(typeof n === "number" ? String(n) : "25000");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);
    try {
      const n = Number(minimumOrderInclGst.trim());
      if (!Number.isFinite(n) || n < 0) throw new Error("Enter a valid minimum order amount");
      const res = await fetch("/api/admin/app-settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minimumOrderInclGst: n }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.message || res.statusText);
      setSaved(true);
      setMinimumOrderInclGst(String(json.data?.minimumOrderInclGst ?? n));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <h1 style={{ marginTop: 0 }}>Store settings</h1>
      <p className="muted" style={{ maxWidth: "40rem" }}>
        Global rules used by checkout and the combo pricing engine. Minimum order is validated against the
        GST-inclusive cart total (before coupon discount, matching the existing cart policy).
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
        <form onSubmit={(e) => void handleSave(e)} className="admin-form-section" style={{ maxWidth: "24rem" }}>
          <div className="admin-field">
            <label htmlFor="mov">Minimum order value (incl. GST), ₹</label>
            <input
              id="mov"
              className="admin-input"
              type="number"
              min={0}
              step={1}
              value={minimumOrderInclGst}
              onChange={(e) => setMinimumOrderInclGst(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="admin-btn admin-btn-primary" disabled={saving}>
            {saving ? "Saving…" : "Save"}
          </button>
        </form>
      )}
    </div>
  );
}
