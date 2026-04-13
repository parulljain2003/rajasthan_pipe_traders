/** For display headings: "20MM" / "20mm" → "20 MM" */
export function formatSizeForHeading(size: string): string {
  return size.replace(/(\d)(MM)\b/gi, (_, digit: string) => `${digit} MM`);
}

/** e.g. "Double Nail Clamps" + "20MM" → "Double Nail Clamps 20 MM" */
export function productHeading(name: string, size: string): string {
  return `${name} ${formatSizeForHeading(size)}`.trim();
}

export type ListingBrandPill = "HiTech" | "Tejas" | "N-Star";

/** Card / hero pill — matches sidebar filters (HiTech, Tejas Craft). N-Star for sanitary range. */
export function listingBrandPill(brand: string): ListingBrandPill {
  if (brand === "Tejas Craft") return "Tejas";
  if (brand === "N-Star") return "N-Star";
  if (brand === "Hitech Square") return "HiTech";
  return "HiTech";
}
