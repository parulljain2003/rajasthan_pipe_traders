"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import styles from "./RelatedProducts.module.css";
import { getSellerOffers, type Product } from "../../../data/products";
import { productHeading, listingBrandPill } from "../../../lib/productHeading";
import { useCartWishlist } from "../../../context/CartWishlistContext";
import WhatsAppPopup from "../../WhatsAppPopup/WhatsAppPopup";

interface RelatedProductsProps {
  products: Product[];
}

export default function RelatedProducts({ products }: RelatedProductsProps) {
  const { addToCart } = useCartWishlist();
  const [quantities, setQuantities] = useState<Record<number, number>>(
    Object.fromEntries(products.map(p => [p.id, 0]))
  );
  const [popupOpen, setPopupOpen] = useState(false);
  const [activeProductName, setActiveProductName] = useState("");
  const [errorProductId, setErrorProductId] = useState<number | null>(null);

  if (products.length === 0) return null;

  const handleQtyChange = (id: number, val: number, step: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(0, val)
    }));
    setErrorProductId(null);
  };

  const handleAddToCart = (product: Product) => {
    const qty = quantities[product.id] || 0;
    if (qty <= 0) {
      setErrorProductId(product.id);
      return;
    }
    setErrorProductId(null);

    const offer = getSellerOffers(product)[0];
    const size = offer.sizes[0];
    const payload = {
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
      size: size.size,
      pricePerUnit: size.withGST,
      basicPricePerUnit: size.basicPrice,
      qtyPerBag: size.qtyPerBag,
      pcsPerPacket: size.pcsPerPacket,
    };

    addToCart(payload, qty);
    setActiveProductName(product.name);
    setPopupOpen(true);
  };

  return (
    <section className={styles.section}>
      {/* ... header code ... */}
      <div className={styles.sectionHeader}>
        <div>
          <h2 className={styles.sectionTitle}>Related Products</h2>
          <p className={styles.sectionSubtitle}>
            More products from the same category
          </p>
        </div>
        <Link href="/" className={styles.viewAllBtn}>
          View All
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
        </Link>
      </div>

      <div className={styles.grid}>
        {products.map((product) => {
          const offer = getSellerOffers(product)[0];
          const brandPill = listingBrandPill(offer.brand);
          const pillClass =
            brandPill === "HiTech"
              ? styles.listingBrandHitech
              : brandPill === "Tejas"
                ? styles.listingBrandTejas
                : styles.listingBrandNstar;
          const size = offer.sizes[0];
          const qty = quantities[product.id] || 0;
          const step = size.pcsPerPacket;

          return (
            <div key={product.id} className={styles.card}>
              <Link href={`/products/${product.slug}`} className={styles.imageLink}>
                <div className={styles.imageWrapper}>
                  {product.isNew && <span className={styles.badge}>New</span>}
                  {product.isBestseller && <span className={styles.badgeSell}>Hot</span>}
                  <div className={styles.imagePlaceholder}>
                    <Image
                      src={product.image}
                      alt={product.name}
                      fill
                      sizes="(max-width: 640px) 50vw, 25vw"
                      style={{ objectFit: "contain", padding: "1.5rem" }}
                    />
                  </div>
                </div>
              </Link>

              <div className={styles.cardInfo}>
                <Link href={`/products/${product.slug}`} className={styles.titleLink}>
                  <span className={`${styles.listingBrand} ${pillClass}`}>
                    {brandPill}
                  </span>
                  <h3 className={styles.cardName}>{productHeading(product.name, size.size)}</h3>
                </Link>
                
                <p className={styles.cardDesc}>{product.description}</p>
                
                <div className={styles.cardPricing}>
                  <span className={styles.fromLabel}>From</span>
                  <span className={styles.cardPrice}>₹{size.withGST.toFixed(2)}</span>
                  <span className={styles.gstTag}>incl. GST</span>
                </div>

                <div className={styles.cardCtaRow}>
                  <div className={styles.qtyCounter}>
                    <button 
                      className={styles.qtyBtn}
                      onClick={() => handleQtyChange(product.id, qty - step, step)}
                      disabled={qty <= 0}
                    >
                      −
                    </button>
                    <div className={styles.qtyInputBlock}>
                      <input 
                        type="number" 
                        value={qty}
                        min={0}
                        step={step}
                        onFocus={(e) => {
                          e.target.select();
                        }}
                        onChange={e => {
                          const v = parseInt(e.target.value) || 0;
                          if (v >= 0) {
                            handleQtyChange(product.id, v, step);
                          }
                        }}
                        onWheel={e => e.currentTarget.blur()}
                        onBlur={e => {
                          const v = parseInt(e.target.value) || 0;
                          if (v < 0) {
                            handleQtyChange(product.id, 0, step);
                          }
                        }}
                      />
                      <span className={styles.qtyUnit}>pc</span>
                    </div>
                    <button 
                      className={styles.qtyBtn}
                      onClick={() => handleQtyChange(product.id, qty + step, step)}
                    >
                      +
                    </button>
                  </div>

                  <button 
                    className={styles.addToCartBtn}
                    onClick={() => handleAddToCart(product)}
                  >
                    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
                      <path d="M0 2.5A.5.5 0 0 1 .5 2H2a.5.5 0 0 1 .485.379L2.89 4H14.5a.5.5 0 0 1 .485.621l-1.5 6A.5.5 0 0 1 13 11H4a.5.5 0 0 1-.485-.379L1.61 3H.5a.5.5 0 0 1-.5-.5zM3.14 5l1.25 5h8.22l1.25-5H3.14zM5 13a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0zm9-1a1 1 0 1 0 0 2 1 1 0 0 0 0-2zm-2 1a2 2 0 1 1 4 0 2 2 0 0 1-4 0z" />
                    </svg>
                    <span>Add to Cart</span>
                  </button>
                </div>
                {errorProductId === product.id && (
                  <div className={styles.qtyError}>
                    Please add product quantity first
                  </div>
                )}
                <div className={styles.moqLabel}>
                  Minimum Order Quantity: {product.moq ?? step} pc
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <WhatsAppPopup 
        isOpen={popupOpen} 
        onClose={() => setPopupOpen(false)} 
        productName={activeProductName}
      />
    </section>
  );
}
