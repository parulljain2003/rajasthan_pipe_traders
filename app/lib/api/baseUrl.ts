/**
 * Backend origin for catalog/product HTTP API (see FRONTEND_API_INTEGRATION.md).
 * Set `NEXT_PUBLIC_API_BASE_URL` when the UI and API run on different hosts/ports.
 */
export function getApiBaseUrl(): string {
  const fromEnv = process.env.NEXT_PUBLIC_API_BASE_URL?.trim().replace(/\/$/, "") ?? "";
  if (fromEnv) return fromEnv;
  if (process.env.NODE_ENV === "development") return "http://localhost:3000";
  return "";
}

/**
 * Image paths from the API are often site-relative (e.g. `/Cable_Clip.png`).
 * Those map to this app's `public/` folder — do not prefix `NEXT_PUBLIC_API_BASE_URL`,
 * or `next/image` would request the file from the API host instead of the storefront.
 */
export function resolveAssetUrl(path: string | undefined, baseUrl?: string): string {
  if (!path) return "/Cable_Clip.png";
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  if (path.startsWith("/")) return path;
  const base = (baseUrl ?? getApiBaseUrl()).replace(/\/$/, "");
  const segment = path.replace(/^\/+/, "");
  if (!base) return `/${segment}`;
  return `${base}/${segment}`;
}
