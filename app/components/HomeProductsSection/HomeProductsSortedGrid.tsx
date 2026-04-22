"use client";

import { useMemo } from "react";
import type { ApiProduct } from "@/app/lib/api/types";
import { apiProductToProduct } from "@/app/lib/api/mapApiProduct";
import { sortApiProductsForDisplayOrder } from "@/app/lib/sortApiProductsDisplay";
import { getSellerOffers, type ProductListingEntry } from "@/app/data/products";
import ProductGrid from "../ShopSection/ProductGrid/ProductGrid";

type Props = {
  apiProducts: ApiProduct[];
};

export default function HomeProductsSortedGrid({ apiProducts }: Props) {
  const listingEntries = useMemo(() => {
    const sorted = sortApiProductsForDisplayOrder(apiProducts);
    return sorted
      .map((apiProduct) => {
        const product = apiProductToProduct(apiProduct);
        const offer = getSellerOffers(product)[0];
        if (!offer) return null;
        const entry: ProductListingEntry = { product, offer };
        return entry;
      })
      .filter((entry): entry is ProductListingEntry => entry !== null);
  }, [apiProducts]);

  return <ProductGrid listingEntries={listingEntries} cardListingLayout />;
}
