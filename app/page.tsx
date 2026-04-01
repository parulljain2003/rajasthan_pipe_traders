import React from 'react';
import HeroBanner from './components/HeroBanner/HeroBanner';
import Products from './components/Products/Products';

export default function Home() {
  return (
    <main style={{ backgroundColor: '#fff', minHeight: '100vh' }}>
      <HeroBanner />
      <Products />
    </main>
  );
}
