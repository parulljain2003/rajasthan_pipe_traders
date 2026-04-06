"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { productHeading } from "../../../lib/productHeading";
import styles from "./ProductInfo.module.css";
import type { Product } from "../../../data/products";
import WhatsAppPopup from "../../WhatsAppPopup/WhatsAppPopup";
import { useCartWishlist } from "../../../context/CartWishlistContext";

interface ProductInfoProps {
  product: Product;
}

export default function ProductInfo({ product }: ProductInfoProps) {
  const router = useRouter();
  const { toggleWishlist: ctxToggleWishlist, isWishlisted, addToCart } = useCartWishlist();
  const [selectedSizeIndex] = useState(0);
  const [addedToCart, setAddedToCart] = useState(false);
  const [popupOpen, setPopupOpen] = useState(false);
  const [showQtyError, setShowQtyError] = useState(false);
  const [quantity, setQuantity] = useState(0);

  /* Master-bag counter — only used for cable-nail-clips */
  const [masterBags, setMasterBags] = useState(0);

  const selectedSize = product.sizes[selectedSizeIndex];
  const step = selectedSize.pcsPerPacket;
  const wishlist = isWishlisted(product.id);
  const showMasterBagCounter = product.slug === "cable-nail-clips";

  const cartPayload = () => ({
    productId: product.id,
    productName: product.name,
    productSlug: product.slug,
    productImage: product.image,
    brand: product.brand,
    category: product.category,
    size: selectedSize.size,
    pricePerUnit: selectedSize.withGST,
    basicPricePerUnit: selectedSize.basicPrice,
    qtyPerBag: selectedSize.qtyPerBag,
    pcsPerPacket: selectedSize.pcsPerPacket,
  });

  const handleAddToCart = () => {
    if (quantity <= 0) {
      setShowQtyError(true);
      return;
    }
    setShowQtyError(false);
    addToCart(cartPayload(), quantity);
    setAddedToCart(true);
    setPopupOpen(true);
  };

  const handleMasterBagAddToCart = () => {
    if (masterBags <= 0) {
      setShowQtyError(true);
      return;
    }
    setShowQtyError(false);
    const totalPkts = masterBags * selectedSize.qtyPerBag * selectedSize.pcsPerPacket;
    addToCart(cartPayload(), totalPkts);
    setAddedToCart(true);
    setPopupOpen(true);
  };

  return (
    <div className={styles.infoPanel}>
      {/* Product Name */}
      <h1 className={styles.productName}>{productHeading(product.name, selectedSize.size)}</h1>

      {/* Product Code */}
      {product.brandCode && (
        <p className={styles.productCode}>
          Product Code: <strong>{product.brandCode}</strong>
        </p>
      )}

      {/* Star Rating */}
      <div className={styles.ratingRow}>
        <div className={styles.stars}>
          {[1, 2, 3, 4, 5].map((star) => (
            <svg
              key={star}
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill={star <= 4 ? "#f59e0b" : "none"}
              stroke="#f59e0b"
              strokeWidth="2"
            >
              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
            </svg>
          ))}
        </div>
        <span className={styles.ratingText}>4.0 / 5 (Wholesale Rating)</span>
      </div>

      {/* Divider */}
      <div className={styles.divider} />

      {/* Price Card */}
      <div className={styles.priceCard}>
        <div className={styles.priceRow}>
          <div>
            <p className={styles.priceLabel}>Basic Price (Per Packet)</p>
            <p className={styles.basicPrice}>₹{selectedSize.basicPrice.toFixed(2)}</p>
          </div>
          <div className={styles.gstPriceBlock}>
            <p className={styles.priceLabel}>With GST (Per Packet)</p>
            <p className={styles.gstPrice}>₹{selectedSize.withGST.toFixed(2)}</p>
          </div>
        </div>
        <div className={styles.gstNote}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          GST included in final price · Price valid from 01-04-2026
        </div>
      </div>

      {/* Modern Packing Dashboard */}
      <div className={styles.packingDashboard}>
        <div className={styles.packingHeader}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
            <polyline points="3.29 7 12 12 20.71 7" />
            <line x1="12" y1="22" x2="12" y2="12" />
          </svg>
          <span className={styles.packingTitleMain}>PACKING DETAILS</span>
        </div>
        
        <div className={styles.packingGrid}>
          <div className={`${styles.packingCard} ${styles.packItem}`}>
            <span className={styles.packValue}>{selectedSize.pcsPerPacket}</span>
            <span className={styles.packLabel}>Pieces per Packet</span>
          </div>
          <div className={`${styles.packingCard} ${styles.bagItem}`}>
            <span className={styles.packValue}>{selectedSize.qtyPerBag}</span>
            <span className={styles.packLabel}>Packets per Master Bag</span>
          </div>
        </div>
      </div>

      {/* Actionable Qty Section */}
      <div className={styles.modernQtyWrap}>
        <div className={styles.qtyHeader}>
          <label className={styles.modernQtyLabel}>QUANTITY</label>
        </div>
        
        <div className={styles.interactiveActionRow}>
          <div className={styles.modernQtyCounter}>
            <button
              type="button"
              className={styles.modernQtyBtn}
              disabled={quantity <= 0}
              onClick={() => { setQuantity(q => Math.max(0, q - step)); setShowQtyError(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
            
            <div className={styles.modernQtyInputBlock}>
              <input
                type="number"
                className={styles.modernQtyInput}
                value={quantity}
                min={0}
                step={step}
                onChange={e => {
                  const v = parseInt(e.target.value);
                  if (!isNaN(v) && v >= 0) { setQuantity(v); setShowQtyError(false); }
                }}
                onBlur={e => {
                  const v = parseInt(e.target.value);
                  if (isNaN(v) || v < 0) setQuantity(0);
                }}
              />
              <span className={styles.modernQtyUnit}>pc</span>
            </div>

            <button
              type="button"
              className={styles.modernQtyBtn}
              onClick={() => { setQuantity(q => q + step); setShowQtyError(false); }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
            </button>
          </div>

          <button
            className={`${styles.primaryCartBtn} ${addedToCart ? styles.btnSuccess : ""}`}
            onClick={handleAddToCart}
          >
            {addedToCart ? (
              <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 7 9 18l-5-5"/></svg> <span>Added to Cart</span></>
            ) : (
              <><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg> <span>Add to Cart</span></>
            )}
          </button>

          <button
            className={`${styles.modernWishlistBtn} ${wishlist ? styles.wishlistActive : ""}`}
            onClick={() => ctxToggleWishlist(product.id)}
            aria-label="Wishlist"
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill={wishlist ? "#fb7185" : "none"} stroke={wishlist ? "#fb7185" : "currentColor"} strokeWidth="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>
          </button>
        </div>
        
        {showQtyError && <div className={styles.qtyErrorInline}>Please add products first</div>}
      </div>

      {/* Modern Master Bag Promo Section */}
      {showMasterBagCounter && (
        <div className={styles.premiumBagSection}>
          <div className={styles.bagTopRow}>
            <div className={styles.bagPromoTag}>Best Value</div>
            <div className={styles.bagTitleBlock}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
                <polyline points="3.29 7 12 12 20.71 7" />
                <line x1="12" y1="22" x2="12" y2="12" />
              </svg>
              <span>Order by <strong>Master Bag</strong></span>
            </div>
            <p className={styles.bagCalc}>1 bag = {selectedSize.qtyPerBag} pkts · Total: {masterBags * selectedSize.qtyPerBag * selectedSize.pcsPerPacket} pc</p>
          </div>

          <div className={styles.bagActionControls}>
            <div className={styles.bagQtyCounter}>
              <button disabled={masterBags <= 0} onClick={() => setMasterBags(n => Math.max(0, n - 1))}>−</button>
              <input type="number" readOnly value={masterBags} />
              <button onClick={() => setMasterBags(n => n + 1)}>+</button>
              <span className={styles.bagQtyUnit}>bags</span>
            </div>
            <button className={styles.bagAddToCartBtn} onClick={handleMasterBagAddToCart}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>
              <span>Bulk Add</span>
            </button>
          </div>
        </div>
      )}

      {/* Quick Features */}
      {product.features.length > 0 && (
        <div className={styles.featuresBlock}>
          <p className={styles.featuresTitle}>Key Features</p>
          <ul className={styles.featuresList}>
            {product.features.map((f, i) => (
              <li key={i} className={styles.featureItem}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5">
                  <path d="M20 7 9 18l-5-5" />
                </svg>
                {f}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Material */}
      {product.material && (
        <div className={styles.materialBadge}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 8v4M12 16h.01" />
          </svg>
          Material: <strong>{product.material}</strong>
        </div>
      )}

      <WhatsAppPopup
        isOpen={popupOpen}
        onClose={() => setPopupOpen(false)}
        productName={product.name}
      />
    </div>
  );
}
