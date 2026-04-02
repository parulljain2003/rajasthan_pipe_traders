import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import CategoryPage from '../../components/CategoryPage/CategoryPage';
import { categories, getCategoryBySlug } from '../../data/categories';
import { products } from '../../data/products';

interface PageProps {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return categories.map(cat => ({ slug: cat.slug }));
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) {
    return { title: 'Category Not Found | Rajasthan Pipe Traders' };
  }

  return {
    title: `${category.name} | Rajasthan Pipe Traders`,
    description: category.description,
    keywords: [category.name, 'RPT', 'Hitech Square', 'N-Star', 'Rajasthan Pipe Traders', 'Ahmedabad'].join(', '),
    openGraph: {
      title: `${category.name} | Rajasthan Pipe Traders`,
      description: category.description,
      images: [category.image],
    },
  };
}

export default async function CategorySlugPage({ params }: PageProps) {
  const { slug } = await params;
  const category = getCategoryBySlug(slug);

  if (!category) notFound();

  const categoryProducts = products.filter(p => p.category === category.id);

  return <CategoryPage category={category} products={categoryProducts} />;
}
