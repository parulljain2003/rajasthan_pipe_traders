import React from 'react';
import HeroBanner from './components/HeroBanner/HeroBanner';
import CategoryCards from './components/CategoryCards/CategoryCards';
import CategoryGrid from './components/CategoryGrid/CategoryGrid';
import Products from './components/Products/Products';

export default function Home() {
  return (
    <main style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <HeroBanner />
      <CategoryCards />
      <CategoryGrid />
      <Products />
    </main>
  );
}
