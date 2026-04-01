import { notFound } from "next/navigation";
import type { Metadata } from "next";
import ProductDetail from "../../components/ProductDetail/ProductDetail";
import { getProductBySlug, getRelatedProducts, products } from "../../data/products";

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
  const product = getProductBySlug(slug);

  if (!product) {
    return { title: "Product Not Found | Rajasthan Pipe Traders" };
  }

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
  const product = getProductBySlug(slug);

  if (!product) {
    notFound();
  }

  const relatedProducts = getRelatedProducts(product, 4);

  return <ProductDetail product={product} relatedProducts={relatedProducts} />;
}
