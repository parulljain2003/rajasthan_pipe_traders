"use client";

import React, { useMemo, useState } from "react";
import { productHeading } from "../../../lib/productHeading";
import styles from "./ProductInfo.module.css";
import { getSellerOffers, type Product } from "../../../data/products";
import { resolvePackingUnitLabels } from "@/lib/packingLabels";
import type { ListingMoqCartModel } from "@/lib/cart/listingMoqModel";
import { useMoqCartForModel } from "@/lib/cart/useMoqCartForModel";

interface ProductInfoProps {
  product: Product;
}

const BRAND_PILL_COLORS: Record<string, string> = {
  "Hitech Square": "#7c3aed",
  "Tejas Craft": "#2563eb",
  "N-Star": "#059669",
};

export default function ProductInfo({ product }: ProductInfoProps) {
  const offers = getSellerOffers(product);
  const [sellerIdx, setSellerIdx] = useState(0);
  const [selectedSizeIndex] = useState(0);

  const activeOffer = offers[sellerIdx];
  const brandPillColor = BRAND_PILL_COLORS[activeOffer.brand] ?? "#2563eb";
  const selectedSize = activeOffer.sizes[selectedSizeIndex];
  const labels = resolvePackingUnitLabels(product, selectedSize);
  const hasBulk = selectedSize.qtyPerBag > 0;

  const moqModel = useMemo((): ListingMoqCartModel => {
    return {
      productId: product.id,
      mongoProductId: product.mongoProductId,
      categoryMongoId: product.categoryMongoId,
      productSlug: product.slug,
      productImage: product.image,
      productName: product.name,
      brand: activeOffer.brand,
      category: product.category,
      sellerId: activeOffer.sellerId,
      sellerName: activeOffer.sellerName,
      size: selectedSize.size,
      pricePerUnit: selectedSize.withGST,
      basicPricePerUnit: selectedSize.basicPrice,
      qtyPerBag: selectedSize.qtyPerBag,
      pcsPerPacket: selectedSize.pcsPerPacket,
    };
  }, [product, activeOffer, selectedSize]);

  const { bagQty, pktQty, pktSteps, onBagDelta, onPacketDelta, setPacketStepsFromInput, setPacketTarget } =
    useMoqCartForModel(moqModel);

  return (
    <div className={styles.infoPanel}>
      <div className={styles.metaRow}>
        <span
          className={styles.sellerBrandPill}
          style={{ "--brand-color": brandPillColor } as React.CSSProperties}
        >
          {activeOffer.brand}
        </span>
      </div>

      {/* Product Name */}
      <h1 className={styles.productName}>{productHeading(product.name, selectedSize.size)}</h1>

      {/* Product Code */}
      {product.brandCode && (
        <p className={styles.productCode}>
          Product Code: <strong>{product.brandCode}</strong>
        </p>
      )}

      {offers.length > 1 && (
        <div className={styles.sellerTabs}>
          <span className={styles.sellerTabsLabel}>Seller</span>
          <div className={styles.sellerTabRow} role="tablist" aria-label="Choose seller">
            {offers.map((o, i) => (
              <button
                key={o.sellerId}
                type="button"
                role="tab"
                aria-selected={i === sellerIdx}
                className={i === sellerIdx ? styles.sellerTabActive : styles.sellerTab}
                onClick={() => {
                  setSellerIdx(i);
                }}
              >
                {o.sellerName}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Star Rating */}
      {/* <div className={styles.ratingRow}>
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
      </div> */}

      {/* Divider */}
      <div className={styles.divider} />

      {/* Price Card */}
      <div className={styles.priceCard}>
        <div className={styles.priceRow}>
          <div>
            <p className={styles.priceLabel}>Basic Price (ex-GST, per {labels.inner})</p>
            <p className={styles.basicPrice}>₹{selectedSize.basicPrice.toFixed(2)}</p>
          </div>
          <div className={styles.gstPriceBlock}>
            <p className={styles.priceLabel}>With GST (per {labels.inner})</p>
            <p className={styles.gstPrice}>₹{selectedSize.withGST.toFixed(2)}</p>
          </div>
        </div>
        <div className={styles.gstNote}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#64748b" strokeWidth="2">
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4M12 8h.01" />
          </svg>
          GST included in final price
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
        
        <div className={`${styles.packingGrid} ${!hasBulk ? styles.packingGridOne : ""}`}>
          <div className={`${styles.packingCard} ${styles.packItem}`}>
            <span className={styles.packValue}>{selectedSize.pcsPerPacket}</span>
            <span className={styles.packLabel}>Pcs/{labels.innerHeading}</span>
          </div>
          {hasBulk && (
            <div className={`${styles.packingCard} ${styles.bagItem}`}>
              <span className={styles.packValue}>{selectedSize.qtyPerBag}</span>
              <span className={styles.packLabel}>
                {labels.innerPlural} / {labels.outerHeading}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Bulk + inner order — all products; labels from price list / DB */}
      <div className={styles.premiumBagSection}>
        <div className={styles.bagTopRow}>
          {hasBulk && <div className={styles.bagPromoTag}>Best value</div>}
          <div className={styles.bagTitleBlock}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden>
              <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
              <polyline points="3.29 7 12 12 20.71 7" />
              <line x1="12" y1="22" x2="12" y2="12" />
            </svg>
            <span>
              {hasBulk ? (
                <>
                  Order by <strong>{labels.outerHeading}</strong> or <strong>{labels.innerHeading}</strong>
                </>
              ) : (
                <>
                  Order by <strong>{labels.innerHeading}</strong>
                </>
              )}
            </span>
          </div>
          <p className={styles.bagCalc}>
            {hasBulk ? (
              (() => {
                const qtyPerBag = selectedSize.qtyPerBag;
                const pcs = selectedSize.pcsPerPacket;
                const totalBagsEq = bagQty + pktSteps;
                const totalPkts = totalBagsEq * qtyPerBag;
                const totalPcs = totalPkts * pcs;
                if (bagQty === 0 && pktSteps === 0) {
                  return (
                    <>
                      Select {labels.outerPlural} or {labels.innerPlural} quantity
                    </>
                  );
                }
                const outerWordEq = totalBagsEq === 1 ? labels.outer : labels.outerPlural;
                return (
                  <>
                    {totalBagsEq} {outerWordEq} = {totalPkts} {labels.innerPlural} ({totalPcs.toLocaleString("en-IN")}{" "}
                    pcs)
                  </>
                );
              })()
            ) : (
              <>
                1 {labels.inner} = {selectedSize.pcsPerPacket} pcs · Price is per {labels.inner}
              </>
            )}
          </p>
        </div>

        <div className={styles.bagActionControls}>
          <div className={`${styles.dualQtyWrapper} ${!hasBulk ? styles.dualQtySingle : ""}`}>
            {hasBulk ? (
              <>
              <div className={styles.bulkQtyRow}>
                <div className={styles.qtySection}>
                  <label className={styles.qtyCounterLabel}>Order by {labels.outerHeading}</label>
                  <div className={styles.bagQtyCounter}>
                    <button type="button" disabled={bagQty <= 0} onClick={() => onBagDelta(-1)}>
                      −
                    </button>
                    <input type="number" readOnly value={bagQty} aria-label={`Count in ${labels.outerPlural}`} />
                    <button type="button" onClick={() => onBagDelta(1)}>
                      +
                    </button>
                    <span className={styles.bagQtyUnit}>{labels.outerPlural}</span>
                  </div>
                </div>

                <div className={styles.qtySection}>
                  <label className={styles.qtyCounterLabel}>Order by {labels.innerHeading}</label>
                  <div className={styles.modernQtyCounter}>
                    <button
                      type="button"
                      className={styles.modernQtyBtn}
                      disabled={pktSteps <= 0}
                      onClick={() => onPacketDelta(-1)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>

                    <div className={styles.modernQtyInputBlock}>
                      <input
                        type="number"
                        className={styles.modernQtyInput}
                        value={pktQty}
                        min={0}
                        step={selectedSize.qtyPerBag}
                        onFocus={(e) => e.currentTarget.select()}
                        onChange={(e) => {
                          const v = parseInt(e.target.value, 10) || 0;
                          if (v >= 0) setPacketTarget(v);
                        }}
                        onWheel={(e) => e.currentTarget.blur()}
                        onBlur={(e) => {
                          const v = parseInt(e.target.value, 10) || 0;
                          if (v < 0) setPacketTarget(0);
                        }}
                        aria-label={`${labels.innerHeading} quantity in ${labels.innerPlural} (adds ${selectedSize.qtyPerBag} per click)`}
                      />
                      <span className={styles.modernQtyUnit}>{labels.innerPlural}</span>
                    </div>

                    <button
                      type="button"
                      className={styles.modernQtyBtn}
                      onClick={() => onPacketDelta(1)}
                    >
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                        <line x1="12" y1="5" x2="12" y2="19" />
                        <line x1="5" y1="12" x2="19" y2="12" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              </>
            ) : (
              <div className={styles.qtySection}>
                <label className={styles.qtyCounterLabel}>Order by {labels.innerHeading}</label>
                <div className={styles.modernQtyCounter}>
                  <button
                    type="button"
                    className={styles.modernQtyBtn}
                    disabled={pktQty <= 0}
                    onClick={() => onPacketDelta(-1)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>

                  <div className={styles.modernQtyInputBlock}>
                    <input
                      type="number"
                      className={styles.modernQtyInput}
                      value={pktQty}
                      min={0}
                      step={1}
                      onFocus={(e) => e.currentTarget.select()}
                      onChange={(e) => {
                        const v = parseInt(e.target.value, 10) || 0;
                        if (v >= 0) setPacketStepsFromInput(v);
                      }}
                      onWheel={(e) => e.currentTarget.blur()}
                      onBlur={(e) => {
                        const v = parseInt(e.target.value, 10) || 0;
                        if (v < 0) setPacketStepsFromInput(0);
                      }}
                    />
                    <span className={styles.modernQtyUnit}>{labels.inner}</span>
                  </div>

                  <button
                    type="button"
                    className={styles.modernQtyBtn}
                    onClick={() => onPacketDelta(1)}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <line x1="12" y1="5" x2="12" y2="19" />
                      <line x1="5" y1="12" x2="19" y2="12" />
                    </svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

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

    </div>
  );
}
