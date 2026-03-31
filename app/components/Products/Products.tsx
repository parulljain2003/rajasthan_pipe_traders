"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import './Products.css';

// The 5 requested products with placeholder data
const productsData = [
  {
    id: 1,
    name: "Cable Clip",
    size: "4mm - 14mm",
    originalPrice: 12.00,
    salePrice: 8.50,
    image: "/Cable_Clip.png", // User will replace in public folder
    isNew: true
  },
  {
    id: 2,
    name: "Nail Cable Clip",
    size: "6mm, 8mm, 10mm",
    originalPrice: 15.50,
    salePrice: 11.00,
    image: "/Nail_Cable_Clip.png",
    isNew: false
  },
  {
    id: 3,
    name: "Circle Nail Cable Clip",
    size: "5mm - 20mm",
    originalPrice: 9.00,
    salePrice: 6.75,
    image: "/Nail_Cable_Clip.png",
    isNew: false
  },
  {
    id: 4,
    name: "Double Nail Clamp",
    size: "12mm, 16mm, 20mm",
    originalPrice: 22.00,
    salePrice: 18.50,
    image: "/Nail_Cable_Clip.png",
    isNew: true
  },
  // {
  //   id: 5,
  //   name: "Wire Clip",
  //   size: "Standard",
  //   originalPrice: 8.00,
  //   salePrice: 5.50,
  //   image: "/Nail_Cable_Clip.png",
  //   isNew: false
  // }
];

export default function Products() {
  // Simple state to toggle wishlist heart icons (for visual only)
  const [wishlist, setWishlist] = useState<number[]>([]);

  const toggleWishlist = (id: number) => {
    setWishlist(prev =>
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  return (
    <section className="products-section">
      <div className="products-container">

        {/* Section Header */}
        <div className="section-header">
          <h2 className="section-title">Featured Fasteners & Clips</h2>
          <p className="section-subtitle">Premium quality industrial cable management solutions</p>
        </div>

        {/* CSS Grid for Products */}
        <div className="products-grid">
          {productsData.map((product) => {
            const isWishlisted = wishlist.includes(product.id);

            return (
              <div key={product.id} className="product-card">

                {/* Image Container */}
                <div className="product-image-wrapper">
                  {/* Badges */}
                  {product.isNew && <span className="badge-new">New</span>}

                  {/* Wishlist Button (Heart) */}
                  <button
                    className={`wishlist-btn ${isWishlisted ? 'active' : ''}`}
                    onClick={() => toggleWishlist(product.id)}
                    aria-label="Add to Wishlist"
                  >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill={isWishlisted ? "#ff4757" : "none"} stroke={isWishlisted ? "#ff4757" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </button>

                  <div className="image-placeholder">
                    {/* Placeholder div until images are added. Next/Image handles it cleanly */}
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'contain' }} // Ensures product isn't cropped unpleasantly
                    />
                    <div className="fallback-text">Img</div>
                  </div>
                </div>

                {/* Content Container */}
                <div className="product-info">
                  <div className="info-top">
                    <span className="product-size">Size: {product.size}</span>
                  </div>

                  <h3 className="product-title">{product.name}</h3>

                  <div className="product-pricing">
                    <span className="original-price">₹{product.originalPrice.toFixed(2)}</span>
                    <span className="sale-price">₹{product.salePrice.toFixed(2)}</span>
                  </div>

                  <button className="add-to-cart-btn">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="m5 11 4-7" /><path d="m19 11-4-7" /><path d="M2 11h20" /><path d="m3.5 11 1.6 7.4a2 2 0 0 0 2 1.6h9.8c.9 0 1.8-.7 2-1.6l1.7-7.4" /><path d="m9 11 1 9" /><path d="M4.5 15.5h15" /><path d="m15 11-1 9" />
                    </svg>
                    Add to Cart
                  </button>
                </div>

              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
