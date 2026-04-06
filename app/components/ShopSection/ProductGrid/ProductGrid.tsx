"use client";

import React, { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './ProductGrid.module.css';
import { Product } from '../../../data/products';
import { productHeading, listingBrandPill } from '../../../lib/productHeading';
import { useCartWishlist } from '../../../context/CartWishlistContext';
import WhatsAppPopup from '../../WhatsAppPopup/WhatsAppPopup';

interface ProductGridProps {
  products: Product[];
}

export default function ProductGrid({ products }: ProductGridProps) {
  const { toggleWishlist: ctxToggleWishlist, isWishlisted, addToCart } = useCartWishlist();
  const [popupOpen, setPopupOpen] = useState(false);
  const [popupProductName, setPopupProductName] = useState('');
  const [errorProductId, setErrorProductId] = useState<number | null>(null);
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
      setErrorProductId(product.id);
      return;
    }
    setErrorProductId(null);
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
    setPopupProductName(product.name);
    setPopupOpen(true);
  };

  if (products.length === 0) {
    return (
      <div className={styles.empty}>
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
          <circle cx="11" cy="11" r="8" />
          <path d="m21 21-4.35-4.35" />
        </svg>
        <p>No products found in this category.</p>
      </div>
    );
  }


  return (
    <>
    <WhatsAppPopup
      isOpen={popupOpen}
      onClose={() => setPopupOpen(false)}
      productName={popupProductName}
    />
    <div className={styles.grid}>
      {products.map((product) => {
        const wishlisted = isWishlisted(product.id);
        const brandPill = listingBrandPill(product.brand);
        const lowestPrice = product.sizes[0].withGST;
        const lowestBasic = product.sizes[0].basicPrice;

        return (
          <Link key={product.id} href={`/products/${product.slug}`} className={styles.card}>
            {/* Image area */}
            <div className={styles.imageWrapper}>
              <div className={styles.badgeGroup}>
                {product.isNew && <span className={styles.badgeNew}>NEW</span>}
                {product.isBestseller && <span className={styles.badgeHot}>HOT</span>}
              </div>

              <button
                className={`${styles.wishlistBtn} ${wishlisted ? styles.wishlistActive : ''}`}
                onClick={(e) => toggleWishlist(e, product.id)}
                aria-label="Add to Wishlist"
              >
                <svg
                  width="18" height="18" viewBox="0 0 24 24"
                  fill={wishlisted ? '#ff4757' : 'none'}
                  stroke={wishlisted ? '#ff4757' : 'currentColor'}
                  strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
                </svg>
              </button>

              <div className={styles.imageInner}>
                <Image
                  src={product.image}
                  alt={product.name}
                  fill
                  sizes="(max-width: 480px) 50vw, (max-width: 1024px) 33vw, 25vw"
                  style={{ objectFit: 'contain', padding: '1.5rem' }}
                />
              </div>
            </div>

            {/* Card info */}
            <div className={styles.info}>
              {brandPill && (
                <div className={styles.meta}>
                  <span
                    className={`${styles.listingBrand} ${brandPill === 'HiTech' ? styles.listingBrandHitech : styles.listingBrandTejas}`}
                  >
                    {brandPill}
                  </span>
                </div>
              )}

              <h3 className={styles.title}>{productHeading(product.name, product.sizes[0].size)}</h3>
              <p className={styles.description}>{product.description}</p>

              <div className={styles.pricing}>
                <div className={styles.pricingLeft}>
                  <span className={styles.priceFrom}>from</span>
                  <span className={styles.salePrice}>₹{lowestPrice.toFixed(2)}</span>
                  <span className={styles.gstTag}>incl. GST</span>
                </div>
                <span className={styles.originalPrice}>₹{lowestBasic.toFixed(2)}</span>
              </div>

              <div className={styles.ctaRow}>
                <div
                  className={styles.qtyCounter}
                  onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                >
                  <div className={styles.qtyCounterInner}>
                    <button
                      type="button"
                      className={styles.qtyCounterBtn}
                      disabled={getQty(product) <= 0}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={e => {
                        e.preventDefault(); e.stopPropagation();
                        const step = product.sizes[0].pcsPerPacket;
                        setQty(product.id, Math.max(0, getQty(product) - step));
                        setErrorProductId(null);
                      }}
                    >−</button>
                    <div className={styles.qtyValueCell}>
                      <input
                        type="number"
                        className={styles.qtyCounterInput}
                        value={getQty(product)}
                        min={0}
                        step={product.sizes[0].pcsPerPacket}
                        onFocus={(e) => e.target.select()}
                        onChange={e => {
                          e.stopPropagation();
                          const v = parseInt(e.target.value) || 0;
                          if (v >= 0) {
                            setQty(product.id, v);
                            setErrorProductId(null);
                          }
                        }}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0;
                          if (v < 0) setQty(product.id, 0);
                        }}
                        onClick={e => { e.preventDefault(); e.stopPropagation(); }}
                        aria-label="Quantity in pc"
                      />
                      <span className={styles.qtyPc} aria-hidden>pc</span>
                    </div>
                    <button
                      type="button"
                      className={styles.qtyCounterBtn}
                      onMouseDown={e => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={e => {
                        e.preventDefault(); e.stopPropagation();
                        const step = product.sizes[0].pcsPerPacket;
                        setQty(product.id, getQty(product) + step);
                        setErrorProductId(null);
                      }}
                    >+</button>
                  </div>
                </div>
                <button
                  type="button"
                  className={styles.cartBtn}
                  onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                  onClick={(e) => handleAddToCart(e, product)}
                >
                  <span>Add to Cart</span>
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                    <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14zM5 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
                  </svg>
                </button>
              </div>
              {errorProductId === product.id && (
                <div className={styles.qtyErrorMessage}>
                  Please add product quantity first
                </div>
              )}
              <div className={styles.moqLabel}>
                Minimum Order Quantity: {product.moq ?? product.sizes[0].pcsPerPacket} pc
              </div>
            </div>
          </Link>
        );
      })}
    </div>
    </>
  );
}
