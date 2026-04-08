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
