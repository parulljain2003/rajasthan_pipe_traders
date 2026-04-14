import type { Product, ProductListingEntry, ProductSellerOffer, ProductSize } from "../../data/products";
import { expandProductsForListing } from "../../data/products";
import { getApiBaseUrl, resolveAssetUrl } from "./baseUrl";
import type {
  ApiPricing,
  ApiProduct,
  ApiProductPackaging,
  ApiProductSize,
  ApiProductSellerOffer,
} from "./types";

function stableNumericId(mongoId: string): number {
  let h = 0;
  for (let i = 0; i < mongoId.length; i++) {
    h = (Math.imul(31, h) + mongoId.charCodeAt(i)) | 0;
  }
  return Math.abs(h) || 1;
}

function mapApiSize(s: ApiProductSize): ProductSize {
  const row: ProductSize = {
    size: s.size,
    basicPrice: s.basicPrice,
    withGST: s.priceWithGst,
    qtyPerBag: s.qtyPerBag ?? 0,
    pcsPerPacket: s.pcsPerPacket ?? 1,
    note: s.note,
    packingLabels: s.packingLabels,
  };
  return row;
}

function mapSellerOffer(s: ApiProductSellerOffer, pricing: ApiPricing): ProductSellerOffer {
  let sizes = (s.sizes ?? []).map(mapApiSize);
  if (sizes.length === 0) {
    sizes = [
      {
        size: "Standard",
        basicPrice: pricing.basicPrice,
        withGST: pricing.priceWithGst,
        qtyPerBag: 0,
        pcsPerPacket: 1,
      },
    ];
  }
  return {
    sellerId: s.sellerId,
    sellerName: s.sellerName,
    brand: s.brand,
    sizes,
    discountTiers: s.discountTiers ?? [],
    minOrder: s.minOrder ?? "",
    note: s.note,
  };
}

function catalogSlugFromSku(sku: string): string {
  const upper = sku.toUpperCase();
  if (upper.startsWith("CAT-")) return upper.slice(4).toLowerCase().replace(/_/g, "-");
  return sku.toLowerCase().replace(/_/g, "-");
}

export function apiProductToProduct(p: ApiProduct): Product {
  const baseUrl = getApiBaseUrl();
  const primaryImage = resolveAssetUrl(p.image ?? p.images?.[0], baseUrl);
  const gallery = (p.images ?? []).map((path) => resolveAssetUrl(path, baseUrl));

  const categoryName = p.category?.name ?? "";

  let sizes: ProductSize[] = [];
  let sellers: ProductSellerOffer[] | undefined;

  if (p.sellers && p.sellers.length > 0) {
    sellers = p.sellers.map((s) => mapSellerOffer(s, p.pricing));
  } else if (p.sizes && p.sizes.length > 0) {
    sizes = p.sizes.map(mapApiSize);
  } else {
    sizes = [
      {
        size: p.sizeOrModel?.trim() || "Standard",
        basicPrice: p.pricing.basicPrice,
        withGST: p.pricing.priceWithGst,
        qtyPerBag: 0,
        pcsPerPacket: 1,
      },
    ];
  }

  const slug =
    (p.slug && p.slug.trim()) ||
    (p.productKind === "catalog" ? catalogSlugFromSku(p.sku) : p.sku.toLowerCase());

  return {
    id: p.legacyId ?? stableNumericId(p._id),
    mongoProductId: p._id,
    categoryMongoId: p.category?._id,
    slug,
    name: p.name,
    brand: p.brand ?? "Hitech Square",
    category: categoryName,
    subCategory: p.subCategory ?? "",
    description: p.description ?? "",
    longDescription: p.longDescription ?? "",
    features: p.features ?? [],
    image: primaryImage,
    images: gallery.length ? gallery : [primaryImage],
    isNew: p.isNew ?? false,
    isBestseller: p.isBestseller,
    tags: p.tags ?? [],
    sizes,
    discountTiers: p.discountTiers ?? [],
    sellers,
    note: p.note,
    minOrder: p.minOrder ?? "",
    certifications: p.certifications,
    material: p.material,
    moq: p.moq,
    packingUnitLabels: p.packingUnitLabels,
    packaging: mapPackaging(p.packaging),
  };
}

function mapPackaging(p: ApiProductPackaging | undefined): Product["packaging"] {
  if (!p || typeof p !== "object") return undefined;
  return {
    pricingUnit: p.pricingUnit,
    pcsInCartoon: p.pcsInCartoon,
    pcsPerPacket: p.pcsPerPacket,
    packetsInMasterBag: p.packetsInMasterBag,
    pktInMasterBag: p.pktInMasterBag,
    pcsPerBox: p.pcsPerBox,
    boxesInMasterCartoon: p.boxesInMasterCartoon,
    notes: p.notes,
  };
}

export function apiProductsToListingEntries(products: ApiProduct[]): ProductListingEntry[] {
  return expandProductsForListing(products.map(apiProductToProduct));
}
