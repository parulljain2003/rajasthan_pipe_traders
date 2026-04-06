"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import styles from './CartPage.module.css';
import CartItemCard from './CartItemCard/CartItemCard';
import OrderSummary from './OrderSummary/OrderSummary';
import OrderSuccessPopup from './OrderSuccessPopup/OrderSuccessPopup';
import { useCartWishlist } from '../../context/CartWishlistContext';

export default function CartPage() {
  const router = useRouter();
  const {
    cartItems,
    cartCount,
    cartTotal,
    cartBasicTotal,
    removeFromCart,
    updateQuantity,
    clearCart,
  } = useCartWishlist();

  const [successOpen, setSuccessOpen] = useState(false);
  const [orderedItems, setOrderedItems] = useState(cartItems);
  const [orderedTotal, setOrderedTotal] = useState(0);
  const [appliedCoupon, setAppliedCoupon] = useState<string | null>(null);

  const gstTotal = cartTotal - cartBasicTotal;

  const COUPON_PCT: Record<string, number> = { BULK7: 0.07, BULK9: 0.09, BULK12: 0.12, MIN25K: 0 };
  const couponDiscount = appliedCoupon ? Math.round(cartTotal * (COUPON_PCT[appliedCoupon] ?? 0)) : 0;
  const finalTotal = cartTotal - couponDiscount;

  const handlePlaceOrder = () => {
    setOrderedItems([...cartItems]);
    setOrderedTotal(finalTotal);
    setSuccessOpen(true);
  };

  const handleContinue = () => {
    clearCart();
    setSuccessOpen(false);
    router.push('/');
  };

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumbBar}>
        <div className={styles.breadcrumbInner}>
          <Link href="/" className={styles.bcLink}>Home</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className={styles.bcCurrent}>My Cart</span>
        </div>
      </div>

      <div className={styles.inner}>
        {/* ── Page title ── */}
        <div className={styles.pageHeader}>
          <div className={styles.titleRow}>
            <h1 className={styles.pageTitle}>My Cart</h1>
          </div>
          {cartCount > 0 && (
            <button className={styles.clearBtn} onClick={clearCart}>
              Clear all
            </button>
          )}
        </div>

        {cartItems.length === 0 ? (
          /* ── Empty state ── */
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>
              <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" />
                <circle cx="19" cy="21" r="1" />
                <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
            </div>
            <h2 className={styles.emptyTitle}>Your cart is empty</h2>
            <p className={styles.emptyText}>Browse our catalogue and add products to your order.</p>
            <Link href="/" className={styles.shopBtn}>
              Browse Products
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </Link>
          </div>
        ) : (
          /* ── Cart layout ── */
          <div className={styles.layout}>
            {/* Left: Items list */}
            <div className={styles.itemsCol}>
              <div className={styles.itemsHeader}>
                <h2 className={styles.itemsTitle}>Products</h2>
                <span className={styles.itemsSubtitle}>
                  {cartItems.length} product type{cartItems.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className={styles.itemsList}>
                {cartItems.map(item => (
                  <CartItemCard
                    key={`${item.productId}-${item.size}`}
                    item={item}
                    onRemove={removeFromCart}
                    onUpdateQty={updateQuantity}
                  />
                ))}
              </div>

              {/* Policy info bar */}
              <div className={styles.policyBar}>
                <div className={styles.policyItem}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                  </svg>
                  100% Advance Payment
                </div>
                <div className={styles.policyItem}>
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <rect x="1" y="3" width="15" height="13" rx="2" />
                    <path d="M16 8h4l3 3v5h-7V8z" />
                    <circle cx="5.5" cy="18.5" r="2.5" />
                    <circle cx="18.5" cy="18.5" r="2.5" />
                  </svg>
                  Buyer Arranges Transport
                </div>

                <div className={`${styles.policyItem} ${cartTotal >= 25000 ? styles.policyItemOk : styles.policyItemWarn}`}>
                  {cartTotal >= 25000 ? (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <polyline points="20 6 9 17 4 12" />
                    </svg>
                  ) : (
                    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                  )}
                  {cartTotal >= 25000
                    ? 'Minimum order ₹25,000 met'
                    : `Min. order ₹25,000 · Add ₹${(25000 - cartTotal).toFixed(0)} more`}
                </div>
              </div>
            </div>

            {/* Right: Order summary */}
            <div className={styles.summaryCol}>
              <OrderSummary
                basicTotal={cartBasicTotal}
                gstTotal={gstTotal}
                grandTotal={cartTotal}
                itemCount={cartItems.length}
                items={cartItems}
                appliedCoupon={appliedCoupon}
                onCouponChange={setAppliedCoupon}
                onPlaceOrder={handlePlaceOrder}
              />
            </div>
          </div>
        )}
      </div>

      <OrderSuccessPopup
        isOpen={successOpen}
        items={orderedItems}
        total={orderedTotal}
        onClose={() => setSuccessOpen(false)}
        onContinue={handleContinue}
      />
    </div>
  );
}
