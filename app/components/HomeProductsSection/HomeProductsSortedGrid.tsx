"use client";

import { useMemo } from "react";
import type { ApiProduct } from "@/app/lib/api/types";
import { apiProductsToListingEntries } from "@/app/lib/api/mapApiProduct";
import { sortApiProductsForDisplayOrder } from "@/app/lib/sortApiProductsDisplay";
import ProductGrid from "../ShopSection/ProductGrid/ProductGrid";

type Props = {
  apiProducts: ApiProduct[];
};

export default function HomeProductsSortedGrid({ apiProducts }: Props) {
  const listingEntries = useMemo(() => {
    const sorted = sortApiProductsForDisplayOrder(apiProducts);
    return apiProductsToListingEntries(sorted);
  }, [apiProducts]);

  return <ProductGrid listingEntries={listingEntries} cardListingLayout />;
}
