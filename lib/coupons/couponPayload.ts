import mongoose from "mongoose";

export function parseObjectIdList(v: unknown): mongoose.Types.ObjectId[] {
  if (v == null) return [];
  const parts: string[] = [];
  if (Array.isArray(v)) {
    for (const x of v) {
      if (typeof x === "string" && x.trim()) parts.push(x.trim());
    }
  } else if (typeof v === "string") {
    for (const s of v.split(/[\s,]+/)) {
      if (s.trim()) parts.push(s.trim());
    }
  }
  const out: mongoose.Types.ObjectId[] = [];
  const seen = new Set<string>();
  for (const id of parts) {
    if (!mongoose.Types.ObjectId.isValid(id)) continue;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(new mongoose.Types.ObjectId(id));
  }
  return out;
}

export function parseOptionalDate(v: unknown): Date | undefined {
  if (v == null || v === "") return undefined;
  const d = new Date(String(v));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const THEME_KEYS = new Set(["blue", "indigo", "green", "amber", "brown"]);
const DISCOUNT_TYPES = new Set(["percentage", "fixed_amount", "free_dispatch", "free_shipping"]);

export function normalizeThemeKey(v: unknown): string {
  return typeof v === "string" && THEME_KEYS.has(v) ? v : "blue";
}

export function isDiscountType(v: unknown): v is "percentage" | "fixed_amount" | "free_dispatch" | "free_shipping" {
  return typeof v === "string" && DISCOUNT_TYPES.has(v);
}

export function parseCustomColors(body: Record<string, unknown>): Record<string, string> | undefined {
  const raw = body.customColors;
  if (!raw || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const out: Record<string, string> = {};
  const keys = ["accent", "stubBackground", "border", "buttonBackground", "buttonText"] as const;
  for (const k of keys) {
    if (typeof o[k] === "string" && o[k].trim()) out[k] = o[k].trim();
  }
  return Object.keys(out).length ? out : undefined;
}
