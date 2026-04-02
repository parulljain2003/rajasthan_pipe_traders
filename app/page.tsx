import React from 'react';
import HeroBanner from './components/HeroBanner/HeroBanner';
import HomeCategoryGrid from './components/HomeCategoryGrid/HomeCategoryGrid';
import HomeProductsSection from './components/HomeProductsSection/HomeProductsSection';

export default function Home() {
  return (
    <main style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <HeroBanner />
      <HomeCategoryGrid />
      <HomeProductsSection />
    </main>
  );
}
