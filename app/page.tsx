import React from 'react';
import HeroBanner from './components/HeroBanner/HeroBanner';
import Products from './components/Products/Products';

export default function Home() {
  return (
    <main className="home-page" style={{ backgroundColor: '#fcfcfc', minHeight: '100vh' }}>
      {/* 
        This is the new Banner Section.
        Images inside HeroBanner can be swapped 
        with your actual assets from the `public` folder.
      */}
      <HeroBanner />
      
      {/* Featured Products Listing */}
      <Products />
    </main>
  );
}
