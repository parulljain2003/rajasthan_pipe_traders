/** For display headings: "20MM" / "20mm" → "20 MM" */
export function formatSizeForHeading(size: string): string {
  return size.replace(/(\d)(MM)\b/gi, (_, digit: string) => `${digit} MM`);
}

/** e.g. "RPT Premium Double Nail Clamps" + "20MM" → "RPT Premium Double Nail Clamps 20 MM" */
export function productHeading(name: string, size: string): string {
  return `${name} ${formatSizeForHeading(size)}`.trim();
}

const BRANDS_HIDDEN_FROM_BADGE = new Set([
  "RPT",
  "Hitech Square / Tejas Craft",
  "Hitech Square",
]);

export function shouldShowBrandBadge(brand: string): boolean {
  return !BRANDS_HIDDEN_FROM_BADGE.has(brand);
}

/** Card pill under image: only HiTech / Tejas — matches sidebar filters */
export function listingBrandPill(brand: string): "HiTech" | "Tejas" | null {
  if (brand === "Hitech Square / Tejas Craft") return "Tejas";
  if (brand === "Hitech Square") return "HiTech";
  return null;
}
