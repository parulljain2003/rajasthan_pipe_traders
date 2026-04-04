"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './Products.css';
import { products, type Product } from '../../data/products';
import { productHeading, listingBrandPill } from '../../lib/productHeading';
import WhatsAppPopup from '../WhatsAppPopup/WhatsAppPopup';
import QtyRequiredPopup from '../QtyRequiredPopup/QtyRequiredPopup';
import { useCartWishlist } from '../../context/CartWishlistContext';

const CATEGORIES = ['All', 'Cable Clips', 'Fasteners & Hardware', 'Electrical Accessories', 'Boxes & Plates', 'Sanitaryware'];

export default function Products() {
  const { toggleWishlist: ctxToggleWishlist, isWishlisted, addToCart } = useCartWishlist();
  const [activeCategory, setActiveCategory] = useState('All');
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupProduct, setPopupProduct] = useState('');
  const [qtyHintOpen, setQtyHintOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  const getQty = (product: Product) =>
    quantities[product.id] ?? 0;

  const setQty = (productId: number, val: number) =>
    setQuantities(prev => ({ ...prev, [productId]: val }));

  const toggleWishlist = (e: React.MouseEvent, id: number) => {
    e.preventDefault();
    e.stopPropagation();
    ctxToggleWishlist(id);
  };

  const handleAddToCart = (e: React.MouseEvent, product: Product) => {
    e.preventDefault();
    e.stopPropagation();
    if (getQty(product) <= 0) {
      setQtyHintOpen(true);
      return;
    }
    const qty = getQty(product);
    addToCart({
      productId: product.id,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.image,
      brand: product.brand,
      category: product.category,
      size: product.sizes[0].size,
      pricePerUnit: product.sizes[0].withGST,
      basicPricePerUnit: product.sizes[0].basicPrice,
      qtyPerBag: product.sizes[0].qtyPerBag,
      pcsPerPacket: product.sizes[0].pcsPerPacket,
    }, qty);
    setPopupProduct(product.name);
    setPopupOpen(true);
  };

  const filtered = activeCategory === 'All'
    ? products
    : products.filter(p => p.category === activeCategory);

  return (
    <section className="products-section">
      <div className="products-container">

        

        {/* Category Filter Tabs */}
        <div className="filter-tabs-wrapper">
          <div className="filter-tabs">
            {CATEGORIES.map(cat => (
              <button
                key={cat}
                className={`filter-tab ${activeCategory === cat ? 'filter-tab-active' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {cat}
                {cat !== 'All' && (
                  <span className="filter-count">
                    {products.filter(p => p.category === cat).length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Products Grid */}
        <div className="products-grid">
          {filtered.map((product) => {
            const wishlisted = isWishlisted(product.id);
            const brandPill = listingBrandPill(product.brand);
            const lowestPrice = product.sizes[0].withGST;
            const lowestBasic = product.sizes[0].basicPrice;

            return (
              <Link
                key={product.id}
                href={`/products/${product.slug}`}
                className="product-card"
              >
                {/* Image Container */}
                <div className="product-image-wrapper">
                  {/* Badges */}
                  <div className="badge-group">
                    {product.isNew && <span className="badge-new">New</span>}
                    {product.isBestseller && <span className="badge-hot">Hot</span>}
                  </div>

                  {/* Wishlist */}
                  <button
                    className={`wishlist-btn ${wishlisted ? 'active' : ''}`}
                    onClick={(e) => toggleWishlist(e, product.id)}
                    aria-label="Add to Wishlist"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24"
                      fill={wishlisted ? "#ff4757" : "none"}
                      stroke={wishlisted ? "#ff4757" : "currentColor"}
                      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                    </svg>
                  </button>

                  {/* Product Image */}
                  <div className="image-inner">
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      style={{ objectFit: 'contain', padding: '1.5rem' }}
                    />
                  </div>

                 
                </div>

                {/* Card Content */}
                <div className="product-info">
                  {brandPill && (
                    <div className="info-meta">
                      <span
                        className={`listing-brand-pill ${brandPill === 'HiTech' ? 'listing-brand-pill-hitech' : 'listing-brand-pill-tejas'}`}
                      >
                        {brandPill}
                      </span>
                    </div>
                  )}

                  {/* Name */}
                  <h3 className="product-title">{productHeading(product.name, product.sizes[0].size)}</h3>

                  {/* Description */}
                  <p className="product-description">{product.description}</p>

                  {/* Pricing */}
                  <div className="product-pricing">
                    <div className="pricing-left">
                      <span className="price-from">from</span>
                      <span className="sale-price">₹{lowestPrice.toFixed(2)}</span>
                      <span className="gst-tag">incl. GST</span>
                    </div>
                    <span className="original-price">₹{lowestBasic.toFixed(2)}</span>
                  </div>

                  {/* CTA */}
                  <div className="card-cta-row">
                    <div
                      className="qty-counter"
                      onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                    >
                      <div className="qty-counter-inner">
                        <button
                          type="button"
                          className="qty-counter-btn"
                          disabled={getQty(product) <= 0}
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            const step = product.sizes[0].pcsPerPacket;
                            setQty(product.id, Math.max(0, getQty(product) - step));
                          }}
                        >−</button>
                        <div className="qty-value-cell">
                          <input
                            type="number"
                            className="qty-counter-input"
                            value={getQty(product)}
                            min={0}
                            step={product.sizes[0].pcsPerPacket}
                            onChange={e => {
                              e.stopPropagation();
                              const v = parseInt(e.target.value);
                              if (!isNaN(v) && v >= 0) setQty(product.id, v);
                            }}
                            onBlur={e => {
                              const v = parseInt(e.target.value);
                              if (isNaN(v) || v < 0) setQty(product.id, 0);
                            }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                            aria-label="Quantity in pc"
                          />
                          <span className="qty-pc" aria-hidden>pc</span>
                        </div>
                        <button
                          type="button"
                          className="qty-counter-btn"
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            const step = product.sizes[0].pcsPerPacket;
                            setQty(product.id, getQty(product) + step);
                          }}
                        >+</button>
                      </div>
                    </div>
                    <button type="button" className="buy-now-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => handleAddToCart(e, product)}>
                      <span>Add to cart</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14zM5 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
                      </svg>
                    </button>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer row */}
        <div className="products-footer">
          <p className="footer-note">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
            Min. order ₹25,000 (incl. GST) · 100% advance · Prices effective 01-04-2026
          </p>
          <Link href="/#shop" className="view-catalogue-btn">
            View Full Catalogue
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="m9 18 6-6-6-6" />
            </svg>
          </Link>
        </div>

      </div>

      <QtyRequiredPopup isOpen={qtyHintOpen} onClose={() => setQtyHintOpen(false)} />
      <WhatsAppPopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        productName={popupProduct}
      />
    </section>
  );
}
