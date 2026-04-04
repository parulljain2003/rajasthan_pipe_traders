import React from 'react';
import styles from './FilterSidebar.module.css';
import { Product } from '../../../data/products';

interface FilterSidebarProps {
  products: Product[];
  selectedBrands: Set<string>;
  priceRange: [number, number];
  onBrandToggle: (brand: string) => void;
  onPriceChange: (range: [number, number]) => void;
  onReset: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export default function FilterSidebar({
  products,
  selectedBrands,
  priceRange,
  onBrandToggle,
  onPriceChange,
  onReset,
  isOpen,
  onClose,
}: FilterSidebarProps) {
  const BRAND_FILTERS = [
    { label: 'HiTech', value: 'Hitech Square' },
    { label: 'Tejas', value: 'Hitech Square / Tejas Craft' },
  ];
  const allPrices = products.map(p => p.sizes[0].withGST);
  const globalMin = Math.floor(Math.min(...allPrices));
  const globalMax = Math.ceil(Math.max(...allPrices));

  const activeFilterCount =
    selectedBrands.size + (priceRange[0] !== globalMin || priceRange[1] !== globalMax ? 1 : 0);

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && <div className={styles.overlay} onClick={onClose} />}

      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ''}`}>
        <div className={styles.sidebarInner}>
          {/* Header */}
          <div className={styles.sidebarHeader}>
            <div className={styles.headerLeft}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className={styles.filterBadge}>{activeFilterCount}</span>
              )}
            </div>
            <div className={styles.headerRight}>
              {activeFilterCount > 0 && (
                <button className={styles.resetBtn} onClick={onReset}>
                  Reset all
                </button>
              )}
              <button className={styles.closeBtn} onClick={onClose} aria-label="Close filters">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Brand / Company Filter */}
          <div className={styles.filterGroup}>
            <h4 className={styles.groupTitle}>Brand / Company</h4>
            <div className={styles.checkList}>
              {BRAND_FILTERS.map(({ label, value }) => {
                const count = products.filter(p => p.brand === value).length;
                return (
                  <label key={value} className={styles.checkItem}>
                    <input
                      type="checkbox"
                      checked={selectedBrands.has(value)}
                      onChange={() => onBrandToggle(value)}
                      className={styles.checkbox}
                    />
                    <span className={styles.checkLabel}>{label}</span>
                    <span className={styles.checkCount}>{count}</span>
                  </label>
                );
              })}
            </div>
          </div>

          {/* Price Range Filter */}
          <div className={styles.filterGroup}>
            <h4 className={styles.groupTitle}>Price Range (incl. GST)</h4>
            <div className={styles.priceRange}>
              <div className={styles.priceInputRow}>
                <div className={styles.priceInputWrap}>
                  <span className={styles.rupee}>₹</span>
                  <input
                    type="number"
                    className={styles.priceInput}
                    value={priceRange[0]}
                    min={globalMin}
                    max={priceRange[1]}
                    onChange={e => onPriceChange([Number(e.target.value), priceRange[1]])}
                  />
                </div>
                <span className={styles.priceSep}>—</span>
                <div className={styles.priceInputWrap}>
                  <span className={styles.rupee}>₹</span>
                  <input
                    type="number"
                    className={styles.priceInput}
                    value={priceRange[1]}
                    min={priceRange[0]}
                    max={globalMax}
                    onChange={e => onPriceChange([priceRange[0], Number(e.target.value)])}
                  />
                </div>
              </div>
              <div className={styles.rangeSliderWrap}>
                <input
                  type="range"
                  className={styles.rangeSlider}
                  min={globalMin}
                  max={globalMax}
                  value={priceRange[0]}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val < priceRange[1]) onPriceChange([val, priceRange[1]]);
                  }}
                />
                <input
                  type="range"
                  className={styles.rangeSlider}
                  min={globalMin}
                  max={globalMax}
                  value={priceRange[1]}
                  onChange={e => {
                    const val = Number(e.target.value);
                    if (val > priceRange[0]) onPriceChange([priceRange[0], val]);
                  }}
                />
              </div>
              <div className={styles.priceHint}>
                Showing products from ₹{priceRange[0].toFixed(0)} to ₹{priceRange[1].toFixed(0)}
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
