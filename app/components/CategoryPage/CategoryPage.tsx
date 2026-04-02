"use client";

import React, { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import styles from './CategoryPage.module.css';
import FilterSidebar from './FilterSidebar/FilterSidebar';
import ProductGrid from '../ShopSection/ProductGrid/ProductGrid';
import { Product } from '../../data/products';
import { CategoryConfig } from '../../data/categories';

interface CategoryPageProps {
  category: CategoryConfig;
  products: Product[];
}

export default function CategoryPage({ category, products }: CategoryPageProps) {
  const allPrices = products.map(p => p.sizes[0].withGST);
  const globalMin = Math.floor(Math.min(...allPrices));
  const globalMax = Math.ceil(Math.max(...allPrices));

  const [selectedBrands, setSelectedBrands] = useState<Set<string>>(new Set());
  const [priceRange, setPriceRange] = useState<[number, number]>([globalMin, globalMax]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'name'>('default');

  const handleBrandToggle = useCallback((brand: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(brand)) next.delete(brand);
      else next.add(brand);
      return next;
    });
  }, []);

  const handleReset = useCallback(() => {
    setSelectedBrands(new Set());
    setPriceRange([globalMin, globalMax]);
  }, [globalMin, globalMax]);

  const filteredProducts = useMemo(() => {
    let list = products.filter(p => {
      const price = p.sizes[0].withGST;
      const brandOk = selectedBrands.size === 0 || selectedBrands.has(p.brand);
      const priceOk = price >= priceRange[0] && price <= priceRange[1];
      return brandOk && priceOk;
    });

    switch (sortBy) {
      case 'price-asc':
        list = [...list].sort((a, b) => a.sizes[0].withGST - b.sizes[0].withGST);
        break;
      case 'price-desc':
        list = [...list].sort((a, b) => b.sizes[0].withGST - a.sizes[0].withGST);
        break;
      case 'name':
        list = [...list].sort((a, b) => a.name.localeCompare(b.name));
        break;
    }
    return list;
  }, [products, selectedBrands, priceRange, sortBy]);

  const activeFilterCount =
    selectedBrands.size + (priceRange[0] !== globalMin || priceRange[1] !== globalMax ? 1 : 0);

  return (
    <div className={styles.page}>
      {/* ── Breadcrumb ── */}
      <div className={styles.breadcrumbBar}>
        <div className={styles.breadcrumbInner}>
          <Link href="/" className={styles.breadcrumbLink}>Home</Link>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="m9 18 6-6-6-6" />
          </svg>
          <span className={styles.breadcrumbCurrent}>{category.name}</span>
        </div>
      </div>

      {/* ── Category Hero ── */}
      <div className={styles.hero} style={{ background: category.bgColor + '55' }}>
        <div className={styles.heroInner}>
          <div className={styles.heroText}>
            <h1 className={styles.heroTitle}>{category.name}</h1>
            <p className={styles.heroDesc}>{category.description}</p>
            <span className={styles.heroCount}>{products.length} products</span>
          </div>
          <div className={styles.heroImage}>
            <Image
              src={category.image}
              alt={category.name}
              width={160}
              height={160}
              style={{ objectFit: 'contain' }}
            />
          </div>
        </div>
      </div>

      {/* ── Main layout ── */}
      <div className={styles.main}>
        <div className={styles.mainInner}>

          {/* Left: Filter sidebar */}
          <FilterSidebar
            products={products}
            selectedBrands={selectedBrands}
            priceRange={priceRange}
            onBrandToggle={handleBrandToggle}
            onPriceChange={setPriceRange}
            onReset={handleReset}
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
          />

          {/* Right: Products */}
          <div className={styles.content}>
            {/* Toolbar */}
            <div className={styles.toolbar}>
              <div className={styles.toolbarLeft}>
                <button
                  className={styles.filterToggleBtn}
                  onClick={() => setSidebarOpen(true)}
                  aria-label="Open filters"
                >
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
                  </svg>
                  Filters
                  {activeFilterCount > 0 && (
                    <span className={styles.filterCount}>{activeFilterCount}</span>
                  )}
                </button>
                <p className={styles.resultCount}>
                  {filteredProducts.length} of {products.length} products
                </p>
              </div>
              <div className={styles.toolbarRight}>
                <label className={styles.sortLabel} htmlFor="sort-select">Sort:</label>
                <select
                  id="sort-select"
                  className={styles.sortSelect}
                  value={sortBy}
                  onChange={e => setSortBy(e.target.value as typeof sortBy)}
                >
                  <option value="default">Default</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                  <option value="name">Name A–Z</option>
                </select>
              </div>
            </div>

            {/* Active filter chips */}
            {activeFilterCount > 0 && (
              <div className={styles.activeFilters}>
                {Array.from(selectedBrands).map(brand => (
                  <button
                    key={brand}
                    className={styles.filterChip}
                    onClick={() => handleBrandToggle(brand)}
                  >
                    {brand}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                ))}
                {(priceRange[0] !== globalMin || priceRange[1] !== globalMax) && (
                  <button
                    className={styles.filterChip}
                    onClick={() => setPriceRange([globalMin, globalMax])}
                  >
                    ₹{priceRange[0]}–₹{priceRange[1]}
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M18 6 6 18M6 6l12 12" />
                    </svg>
                  </button>
                )}
                <button className={styles.clearAllChip} onClick={handleReset}>
                  Clear all
                </button>
              </div>
            )}

            {/* Product grid */}
            {filteredProducts.length > 0 ? (
              <ProductGrid products={filteredProducts} />
            ) : (
              <div className={styles.empty}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.5">
                  <circle cx="11" cy="11" r="8" />
                  <path d="m21 21-4.35-4.35" />
                </svg>
                <h3>No products match your filters</h3>
                <p>Try adjusting or resetting your filters.</p>
                <button className={styles.resetFiltersBtn} onClick={handleReset}>
                  Reset filters
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

    </div>
  );
}
