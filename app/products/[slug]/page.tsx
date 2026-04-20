import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductDetail from "../../components/ProductDetail/ProductDetail";
import { getProductBySlug, getRelatedProducts, products } from "../../data/products";
import { apiProductToProduct } from "../../lib/api/mapApiProduct";
import type { ApiProduct } from "../../lib/api/types";
import { getStorefrontProductBySlug, getStorefrontRelatedProducts } from "@/lib/catalog/storefront";
import { sortProductsForDisplayOrder } from "@/app/lib/sortApiProductsDisplay";

const RELATED_FETCH_LIMIT = 80;
const RELATED_SHOW_COUNT = 4;

interface PageProps {
  params: Promise<{ slug: string }>;
}

/* ── Static Params (SSG) ── */
export async function generateStaticParams() {
  return products.map((p) => ({ slug: p.slug }));
}

/* ── Dynamic Metadata ── */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const staticProduct = getProductBySlug(slug);
  if (staticProduct) {
    return {
      title: `${staticProduct.name} | Rajasthan Pipe Traders`,
      description: staticProduct.description,
      keywords: [staticProduct.brand, staticProduct.category, staticProduct.subCategory, ...staticProduct.tags].join(", "),
      openGraph: {
        title: `${staticProduct.name} | Rajasthan Pipe Traders`,
        description: staticProduct.description,
        images: [staticProduct.image],
      },
    };
  }

  const doc = await getStorefrontProductBySlug(slug);
  if (!doc) {
    return { title: "Product Not Found | Rajasthan Pipe Traders" };
  }
  const product = apiProductToProduct(doc as unknown as ApiProduct);
  return {
    title: `${product.name} | Rajasthan Pipe Traders`,
    description: product.description,
    keywords: [product.brand, product.category, product.subCategory, ...product.tags].join(", "),
    openGraph: {
      title: `${product.name} | Rajasthan Pipe Traders`,
      description: product.description,
      images: [product.image],
    },
  };
}

/* ── Page Component ── */
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;

  const staticProduct = getProductBySlug(slug);
  if (staticProduct) {
    const relatedProducts = getRelatedProducts(staticProduct, 4);
    return <ProductDetail product={staticProduct} relatedProducts={relatedProducts} />;
  }

  const doc = await getStorefrontProductBySlug(slug);
  if (!doc) {
    notFound();
  }

  const product = apiProductToProduct(doc as unknown as ApiProduct);
  const cat = doc.category as { _id?: string } | undefined;
  const categoryMongoId = typeof cat?._id === "string" ? cat._id : undefined;
  const relatedCandidates = await getStorefrontRelatedProducts(
    categoryMongoId,
    String(doc._id),
    RELATED_FETCH_LIMIT
  );
  const relatedProducts = sortProductsForDisplayOrder(relatedCandidates).slice(0, RELATED_SHOW_COUNT);

  return <ProductDetail product={product} relatedProducts={relatedProducts} />;
}
