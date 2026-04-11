"use client";

import React, { useMemo, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import './Products.css';
import {
  expandProductsForListing,
  products,
  type ProductListingEntry,
} from '../../data/products';
import { productHeading, listingBrandPill } from '../../lib/productHeading';
import { resolvePackingUnitLabels } from '@/lib/packingLabels';
import WhatsAppPopup from '../WhatsAppPopup/WhatsAppPopup';
import { useCartWishlist } from '../../context/CartWishlistContext';

const CATEGORIES = ['All', 'Cable Clips', 'Fasteners & Hardware', 'Electrical Accessories', 'Boxes & Plates', 'Sanitaryware'];

function listingKey(productId: number, sellerId: string) {
  return `${productId}:${sellerId}`;
}

export default function Products() {
  const { addToCart } = useCartWishlist();
  const [activeCategory, setActiveCategory] = useState('All');
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupProduct, setPopupProduct] = useState('');
  const [errorListingKey, setErrorListingKey] = useState<string | null>(null);
  const [quantities, setQuantities] = useState<Record<string, number>>({});

  const getQty = (entry: ProductListingEntry) =>
    quantities[listingKey(entry.product.id, entry.offer.sellerId)] ?? 0;

  const setQty = (entry: ProductListingEntry, val: number) =>
    setQuantities((prev) => ({
      ...prev,
      [listingKey(entry.product.id, entry.offer.sellerId)]: val,
    }));

  const handleAddToCart = (e: React.MouseEvent, entry: ProductListingEntry) => {
    e.preventDefault();
    e.stopPropagation();
    const { product, offer } = entry;
    const sizeRow = offer.sizes[0];
    if (getQty(entry) <= 0) {
      setErrorListingKey(listingKey(product.id, offer.sellerId));
      return;
    }
    setErrorListingKey(null);
    const qty = getQty(entry);
    addToCart({
      productId: product.id,
      mongoProductId: product.mongoProductId,
      categoryMongoId: product.categoryMongoId,
      productName: product.name,
      productSlug: product.slug,
      productImage: product.image,
      brand: offer.brand,
      category: product.category,
      sellerId: offer.sellerId,
      sellerName: offer.sellerName,
      size: sizeRow.size,
      pricePerUnit: sizeRow.withGST,
      basicPricePerUnit: sizeRow.basicPrice,
      qtyPerBag: sizeRow.qtyPerBag,
      pcsPerPacket: sizeRow.pcsPerPacket,
      orderMode: "packets" as const,
    }, qty);
    setPopupProduct(product.name);
    setPopupOpen(true);
  };

  const filteredEntries = useMemo(() => {
    const base =
      activeCategory === 'All'
        ? products
        : products.filter((p) => p.category === activeCategory);
    return expandProductsForListing(base);
  }, [activeCategory]);

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
          {filteredEntries.map((entry) => {
            const { product, offer } = entry;
            const brandPill = listingBrandPill(offer.brand);
            const pillClass =
              brandPill === "HiTech"
                ? "listing-brand-pill-hitech"
                : brandPill === "Tejas"
                  ? "listing-brand-pill-tejas"
                  : "listing-brand-pill-nstar";
            const size0 = offer.sizes[0];
            const lowestPrice = size0.withGST;
            const lowestBasic = size0.basicPrice;
            const listLabels = resolvePackingUnitLabels(product, size0);
            const lk = listingKey(product.id, offer.sellerId);

            return (
              <Link
                key={lk}
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
                  <div className="info-meta">
                    <span className={`listing-brand-pill ${pillClass}`}>
                      {brandPill}
                    </span>
                  </div>

                  {/* Name */}
                  <h3 className="product-title">{productHeading(product.name, size0.size)}</h3>

                  {/* Description */}
                  <p className="product-description">{product.description}</p>

                  {/* Pricing */}
                  <div className="product-pricing">
                    <div className="pricing-left">
                      <span className="price-from">from</span>
                      <span className="sale-price">₹{lowestPrice.toFixed(2)}</span>
                      <span className="gst-tag">incl. GST / {listLabels.inner}</span>
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
                          disabled={getQty(entry) <= 0}
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            setQty(entry, Math.max(0, getQty(entry) - 1));
                            setErrorListingKey(null);
                          }}
                        >−</button>
                        <div className="qty-value-cell">
                          <input
                            type="number"
                            className="qty-counter-input"
                            value={getQty(entry)}
                            min={0}
                            step={1}
                            onFocus={(e) => e.target.select()}
                            onChange={e => {
                              e.stopPropagation();
                              const v = parseInt(e.target.value) || 0;
                              if (v >= 0) {
                                setQty(entry, v);
                                setErrorListingKey(null);
                              }
                            }}
                            onBlur={e => {
                              const v = parseInt(e.target.value) || 0;
                              if (v < 0) setQty(entry, 0);
                            }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                            aria-label={`Quantity in ${listLabels.innerPlural}`}
                          />
                          <span className="qty-pc" aria-hidden>{listLabels.inner}</span>
                        </div>
                        <button
                          type="button"
                          className="qty-counter-btn"
                          onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                          onClick={e => {
                            e.preventDefault(); e.stopPropagation();
                            setQty(entry, getQty(entry) + 1);
                            setErrorListingKey(null);
                          }}
                        >+</button>
                      </div>
                    </div>
                    <button type="button" className="buy-now-btn" onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }} onClick={(e) => handleAddToCart(e, entry)}>
                      <span>Add to cart</span>
                      <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                        <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14zM5 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
                      </svg>
                    </button>
                  </div>
                  {errorListingKey === lk && (
                    <div className="qty-error-message">
                      Please add product quantity first
                    </div>
                  )}
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

      <WhatsAppPopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        productName={popupProduct}
      />
    </section>
  );
}
