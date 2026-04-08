"use client";

import { useCallback, useEffect, useState } from "react";

type MediaRow = Record<string, unknown>;

function normalizeMediaList(json: unknown): MediaRow[] {
  if (!json || typeof json !== "object") return [];
  const d = (json as Record<string, unknown>).data;
  if (Array.isArray(d)) return d as MediaRow[];
  if (d && typeof d === "object") {
    const o = d as Record<string, unknown>;
    if (Array.isArray(o.items)) return o.items as MediaRow[];
    if (Array.isArray(o.docs)) return o.docs as MediaRow[];
    if (Array.isArray(o.results)) return o.results as MediaRow[];
  }
  return [];
}

function rowUrl(row: MediaRow): string {
  const v =
    row.secure_url ??
    row.secureUrl ??
    row.url ??
    row.cloudinaryUrl ??
    row.src ??
    (row.file && typeof row.file === "object"
      ? (row.file as Record<string, unknown>).secure_url
      : undefined);
  return typeof v === "string" ? v : "";
}

function rowId(row: MediaRow): string {
  const v = row._id ?? row.id;
  return typeof v === "string" ? v : "";
}

export default function AdminMediaPage() {
  const [items, setItems] = useState<MediaRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const limit = 20;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const q = new URLSearchParams({ page: String(page), limit: String(limit) });
      const res = await fetch(`/api/admin/media?${q}`);
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "message" in json
            ? String((json as { message: unknown }).message)
            : res.statusText;
        throw new Error(msg);
      }
      setItems(normalizeMediaList(json));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load media");
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    void load();
  }, [load]);

  async function handleDelete(id: string) {
    if (!confirm("Delete this media record and Cloudinary asset?")) return;
    setError(null);
    try {
      const res = await fetch(`/api/admin/media/${encodeURIComponent(id)}`, { method: "DELETE" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          json && typeof json === "object" && "message" in json
            ? String((json as { message: unknown }).message)
            : res.statusText;
        throw new Error(msg);
      }
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Delete failed");
    }
  }

  return (
    <div>
      <p className="muted" style={{ marginBottom: "1rem", maxWidth: "40rem" }}>
        Lists uploads from your media API (<code>GET /api/media</code>). Configure{" "}
        <code>MEDIA_API_URL</code> in <code>.env.local</code>. See{" "}
        <code>docs/Cloudenary_MEDIA_API.md</code>.
      </p>
      {error ? (
        <div className="admin-banner err" role="alert">
          {error}
        </div>
      ) : null}
      <div className="admin-toolbar">
        <button type="button" className="admin-btn admin-btn-ghost" onClick={() => void load()} disabled={loading}>
          Refresh
        </button>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          disabled={loading || page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          Previous page
        </button>
        <span className="muted" style={{ fontSize: "0.875rem" }}>
          Page {page}
        </span>
        <button
          type="button"
          className="admin-btn admin-btn-ghost"
          disabled={loading || items.length < limit}
          onClick={() => setPage((p) => p + 1)}
        >
          Next page
        </button>
      </div>
      {loading ? (
        <p className="muted">Loading…</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Preview</th>
                <th>Id</th>
                <th>Kind / meta</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {items.map((row) => {
                const id = rowId(row);
                const url = rowUrl(row);
                return (
                  <tr key={id || JSON.stringify(row)}>
                    <td>
                      {url ? <img src={url} alt="" className="admin-thumb" /> : "—"}
                    </td>
                    <td>
                      <code style={{ fontSize: "0.75rem" }}>{id || "—"}</code>
                    </td>
                    <td>
                      <span className="muted" style={{ fontSize: "0.8rem" }}>
                        {String(row.kind ?? "—")}
                        {row.caption ? ` · ${String(row.caption)}` : ""}
                      </span>
                    </td>
                    <td>
                      {id ? (
                        <button
                          type="button"
                          className="admin-btn admin-btn-danger"
                          onClick={() => void handleDelete(id)}
                        >
                          Delete
                        </button>
                      ) : null}
                      {url ? (
                        <a
                          href={url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="admin-btn admin-btn-ghost"
                          style={{ marginLeft: 8, display: "inline-flex" }}
                        >
                          Open
                        </a>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          {items.length === 0 ? <p className="muted" style={{ padding: "1rem" }}>No media rows (or empty page).</p> : null}
        </div>
      )}
    </div>
  );
}
