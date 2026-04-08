export type CategoryParent = { _id: string; name: string; slug: string } | null;

export type AdminCategory = {
  _id: string;
  name: string;
  slug: string;
  description?: string;
  image?: string;
  parent: CategoryParent;
  sortOrder: number;
  sourceSectionLabel?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
};

export type PopulatedCategory = { _id: string; name: string; slug: string };

export type AdminCoupon = {
  _id: string;
  code: string;
  name?: string;
  discountType: "percentage" | "fixed_amount" | "free_dispatch" | "free_shipping";
  discountPercent?: number;
  fixedAmountOff?: number;
  displayPrimary: string;
  displaySecondary?: string;
  title: string;
  description?: string;
  themeKey: string;
  customColors?: {
    accent?: string;
    stubBackground?: string;
    border?: string;
    buttonBackground?: string;
    buttonText?: string;
  };
  applicableProductIds: string[];
  applicableCategoryIds: string[];
  applicableProducts?: Array<{ _id: string; sku?: string; name?: string; slug?: string }>;
  applicableCategories?: Array<{ _id: string; name?: string; slug?: string }>;
  minOrderValue?: number;
  minTotalQuantity?: number;
  minEligibleLines?: number;
  startAt?: string;
  endAt?: string;
  isActive: boolean;
  displayInBanner: boolean;
  showInCart: boolean;
  sortOrder: number;
  internalNotes?: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AdminProduct = {
  _id: string;
  sku: string;
  productKind: "sku" | "catalog";
  slug?: string;
  name: string;
  description?: string;
  category: PopulatedCategory;
  brand?: string;
  image?: string;
  images?: string[];
  isActive: boolean;
  isNew?: boolean;
  pricing: {
    basicPrice: number;
    priceWithGst: number;
    currency?: string;
  };
};
