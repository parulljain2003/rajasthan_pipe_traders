import type {
  ApiCategoriesResponse,
  ApiErrorBody,
  ApiProductsListResponse,
} from "./types";

async function readJson<T>(res: Response): Promise<T> {
  const text = await res.text();
  if (!text) {
    throw new Error(res.ok ? "Empty response" : `Request failed (${res.status})`);
  }
  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Invalid JSON from API");
  }
}

export async function fetchCategoriesList(init?: RequestInit): Promise<ApiCategoriesResponse> {
  const res = await fetch("/api/categories", {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  const body = await readJson<ApiCategoriesResponse & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(body.message ?? `Categories request failed (${res.status})`);
  }
  return body;
}

export async function fetchProductsList(
  searchParams: Record<string, string | number | undefined>,
  init?: RequestInit
): Promise<ApiProductsListResponse> {
  const q = new URLSearchParams();
  for (const [k, v] of Object.entries(searchParams)) {
    if (v === undefined || v === "") continue;
    q.set(k, String(v));
  }
  const res = await fetch(`/api/products?${q.toString()}`, {
    ...init,
    headers: { Accept: "application/json", ...init?.headers },
  });
  const body = await readJson<ApiProductsListResponse & ApiErrorBody>(res);
  if (!res.ok) {
    throw new Error(body.message ?? `Products request failed (${res.status})`);
  }
  return body;
}
