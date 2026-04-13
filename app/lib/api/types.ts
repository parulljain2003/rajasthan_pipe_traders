/** Shapes from GET /api/categories and GET /api/products (FRONTEND_API_INTEGRATION.md). */

export interface ApiCategoryRef {
  _id: string;
  name: string;
  slug: string;
}

export interface ApiCategory extends ApiCategoryRef {
  description?: string;
  parent: ApiCategoryRef | null;
  sortOrder: number;
  sourceSectionLabel?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ApiPackingLabelsPartial {
  inner?: string;
  innerPlural?: string;
  outer?: string;
  outerPlural?: string;
  outerHeading?: string;
  innerHeading?: string;
}

export interface ApiProductSize {
  size: string;
  basicPrice: number;
  priceWithGst: number;
  /** Net combo (ex-GST) — no slab discount when combo applies */
  comboBasicPrice?: number;
  /** Net combo (incl. GST) — no slab discount when combo applies */
  comboPriceWithGst?: number;
  /** 20 / 25 MM core clip row for combo engine */
  coreComboVariant?: "20" | "25";
  /** Per-size eligible pool (overrides product-level when set) */
  countsTowardComboEligible?: boolean;
  qtyPerBag?: number;
  pcsPerPacket?: number;
  note?: string;
  packingLabels?: ApiPackingLabelsPartial;
}

export interface ApiDiscountTier {
  qty: string;
  discount: string;
}

export interface ApiProductSellerOffer {
  sellerId: string;
  sellerName: string;
  brand: string;
  sizes: ApiProductSize[];
  discountTiers?: ApiDiscountTier[];
  minOrder?: string;
  note?: string;
}

export interface ApiPricing {
  basicPrice: number;
  priceWithGst: number;
  currency?: string;
  priceListEffectiveDate?: string;
}

export interface ApiProduct {
  _id: string;
  sku: string;
  productKind: "sku" | "catalog";
  slug?: string;
  legacyId?: number;
  name: string;
  description?: string;
  longDescription?: string;
  subCategory?: string;
  category: ApiCategoryRef;
  brand?: string;
  brandCode?: string;
  productLine?: string;
  sizeOrModel?: string;
  features?: string[];
  image?: string;
  images?: string[];
  isNew?: boolean;
  isBestseller?: boolean;
  tags?: string[];
  certifications?: string[];
  material?: string;
  minOrder?: string;
  moq?: number;
  note?: string;
  listNotes?: string;
  packingUnitLabels?: ApiPackingLabelsPartial;
  discountTiers?: ApiDiscountTier[];
  sizes?: ApiProductSize[];
  sellers?: ApiProductSellerOffer[];
  pricing: ApiPricing;
  /** Counts toward eligible packet pool for 20/25MM combo pricing */
  isEligibleForCombo?: boolean;
  isActive?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ApiCategoriesResponse {
  data: ApiCategory[];
}

export interface ApiProductsListResponse {
  data: ApiProduct[];
  meta: { total: number; limit: number; skip: number };
}

export interface ApiErrorBody {
  message?: string;
}
