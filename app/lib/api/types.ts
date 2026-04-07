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

export interface ApiProductSize {
  size: string;
  basicPrice: number;
  priceWithGst: number;
  qtyPerBag?: number;
  pcsPerPacket?: number;
  note?: string;
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
  discountTiers?: ApiDiscountTier[];
  sizes?: ApiProductSize[];
  sellers?: ApiProductSellerOffer[];
  pricing: ApiPricing;
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
