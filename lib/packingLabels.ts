import type { PackingUnitLabels, Product, ProductSize } from "@/app/data/products";
import type { CartItem } from "@/app/context/CartWishlistContext";

export type { PackingUnitLabels };

const DEFAULT_LABELS: PackingUnitLabels = {
  inner: "packet",
  innerPlural: "pkts",
  outer: "bag",
  outerPlural: "bags",
  outerHeading: "Master Bag",
  innerHeading: "Packet",
};

/** Category-level defaults (price list terminology). */
const CATEGORY_DEFAULTS: Record<string, Partial<PackingUnitLabels>> = {
  "Boxes & Plates": {
    inner: "box",
    innerPlural: "boxes",
    outer: "carton",
    outerPlural: "cartons",
    outerHeading: "Carton",
    innerHeading: "Box",
  },
  Sanitaryware: {
    inner: "box",
    innerPlural: "boxes",
    outer: "carton",
    outerPlural: "cartons",
    outerHeading: "Carton",
    innerHeading: "Box",
  },
};

function mergeLabels(
  base: PackingUnitLabels,
  ...partials: (Partial<PackingUnitLabels> | undefined)[]
): PackingUnitLabels {
  let out = { ...base };
  for (const p of partials) {
    if (!p) continue;
    out = { ...out, ...p };
  }
  return out;
}

export function resolvePackingUnitLabels(product: Product, size: ProductSize): PackingUnitLabels {
  const cat = CATEGORY_DEFAULTS[product.category];
  return mergeLabels(
    DEFAULT_LABELS,
    cat,
    product.packingUnitLabels,
    size.packingLabels
  );
}

/** When only category is known (e.g. hero carousel stubs without full `Product`). */
export function defaultPackingLabelsForCategory(category: string): PackingUnitLabels {
  return mergeLabels(DEFAULT_LABELS, CATEGORY_DEFAULTS[category]);
}

/** Cart line only has category + size fields — enough for label resolution */
export function resolvePackingLabelsForCartLine(line: CartItem): PackingUnitLabels {
  const product = {
    category: line.category,
  } as Product;
  const size = {
    size: line.size,
    basicPrice: line.basicPricePerUnit,
    withGST: line.pricePerUnit,
    qtyPerBag: line.qtyPerBag,
    pcsPerPacket: line.pcsPerPacket,
  } as ProductSize;
  return resolvePackingUnitLabels(product, size);
}
