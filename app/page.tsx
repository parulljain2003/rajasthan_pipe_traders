import React from 'react';
import HeroBanner from './components/HeroBanner/HeroBanner';
import HomeCategoryGrid from './components/HomeCategoryGrid/HomeCategoryGrid';
import HomeProductsSection from './components/HomeProductsSection/HomeProductsSection';

export const revalidate = 60;

export default function Home() {
  return (
    <div className="home-root">
      <HeroBanner />
      <HomeCategoryGrid />
      <HomeProductsSection />
    </div>
  );
}
