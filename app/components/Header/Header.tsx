"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import './Header.css';

const coreProducts = [
  {
    category: "Cable Clips",
    items: ["Nail Cable Clip", "Circle Nail Cable Clip", "Double Nail Cable Clip / Clamp", "Wire Clip", "Plastic Wire Clip", "Nylon Cable Tie", "UV Nylon Cable Tie", "UPVC Nail Clamp", "CPVC Nail Clamp", "SWR PVC Nail Clamp"]
  },
  {
    category: "Fasteners & Hardware",
    items: ["Concrete Nails", "China Concrete Nails", "Dry Wall Screw", "Kaju Pin", "Casing Pin"]
  },
  {
    category: "Electrical Accessories",
    items: ["Electrical Fittings & Accessories", "Bulb Holder", "Black Pendant Holder", "White Pendant Holder", "Skirt Pendant Holder", "2 Pin Top", "16 Amp Top", "Male Female Top"]
  },
  {
    category: "Boxes & Plates",
    items: ["GI Modular Box", "PVC MCB Box", "MCB Distribution Box", "Combined Switch Socket Box", "3×3 PVC Round Plate", "4×4 PVC Round Plate", "7×7 Fan Plate"]
  },
  {
    category: "Other Products",
    items: ["Wall Plug (Gitti)", "PVC Gitti", "Electrical Insulation Tape", "Cable Tie Variants (multiple sizes)"]
  }
];

// Flatten all searchable items with their category
const allSearchItems = coreProducts.flatMap(group =>
  group.items.map(item => ({ name: item, category: group.category }))
);

type SearchResult = { name: string; category: string };

const Header = () => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search logic
  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) {
      setSearchResults([]);
      return;
    }
    const lower = query.toLowerCase();
    const results = allSearchItems.filter(
      item =>
        item.name.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower)
    ).slice(0, 8); // Max 8 results
    setSearchResults(results);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => handleSearch(searchQuery), 180);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchFocused(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!searchResults.length) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => Math.min(prev + 1, searchResults.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => Math.max(prev - 1, -1));
    } else if (e.key === 'Enter' && activeIndex >= 0) {
      e.preventDefault();
      selectResult(searchResults[activeIndex]);
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const selectResult = (result: SearchResult) => {
    setSearchQuery(result.name);
    setSearchResults([]);
    setIsSearchFocused(false);
  };

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="search-highlight">{text.slice(idx, idx + query.length)}</mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  const showDropdown = isSearchFocused && (searchResults.length > 0 || searchQuery.trim().length > 0);

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-container">
            <div className="logo-placeholder-graphic">
              <Image
                src="/logo.png"
                alt="Rajasthan Pipe Traders Logo"
                width={150}
                height={50}
                className="main-logo"
                priority
              />
            </div>
          </div>
        </div>

        {/* Navigation Section */}
        <nav className="nav-section">
          <div
            className="nav-item has-dropdown"
            onMouseEnter={() => setIsMegaMenuOpen(true)}
            onMouseLeave={() => setIsMegaMenuOpen(false)}
          >
            <span className="nav-link">
              Shop
              <svg className={`chevron ${isMegaMenuOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>

            {/* Mega Menu */}
            {isMegaMenuOpen && (
              <div className="mega-menu">
                <div className="mega-menu-content">
                  {coreProducts.map((group, idx) => (
                    <div key={idx} className="mega-menu-column">
                      <h3 className="column-title">{group.category}</h3>
                      <ul className="product-list">
                        {group.items.map((item, i) => (
                          <li key={i} className="product-item">
                            <a href={`/products/${item.toLowerCase().replace(/ /g, '-')}`}>{item}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </nav>

        {/* Search Section */}
        <div className="search-section" ref={searchRef}>
          <div className={`search-bar ${isSearchFocused ? 'focused' : ''}`}>
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search for products, categories..."
              className="search-input"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              onFocus={() => setIsSearchFocused(true)}
              onKeyDown={handleKeyDown}
              autoComplete="off"
            />
            {searchQuery && (
              <button
                className="search-clear-btn"
                onClick={() => {
                  setSearchQuery('');
                  setSearchResults([]);
                  inputRef.current?.focus();
                }}
                aria-label="Clear search"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Search Dropdown */}
          {showDropdown && (
            <div className="search-dropdown">
              {searchResults.length > 0 ? (
                <>
                  <div className="search-dropdown-header">
                    <span>{searchResults.length} result{searchResults.length !== 1 ? 's' : ''} for &ldquo;{searchQuery}&rdquo;</span>
                  </div>
                  <ul className="search-results-list">
                    {searchResults.map((result, i) => (
                      <li
                        key={i}
                        className={`search-result-item ${i === activeIndex ? 'active' : ''}`}
                        onMouseDown={() => selectResult(result)}
                        onMouseEnter={() => setActiveIndex(i)}
                      >
                        <svg className="result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        <div className="result-text">
                          <span className="result-name">{highlightMatch(result.name, searchQuery)}</span>
                          <span className="result-category">{result.category}</span>
                        </div>
                        <svg className="result-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="m9 18 6-6-6-6" />
                        </svg>
                      </li>
                    ))}
                  </ul>
                </>
              ) : searchQuery.trim().length > 0 ? (
                <div className="search-no-results">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                  </svg>
                  <p>No results for &ldquo;{searchQuery}&rdquo;</p>
                  <span>Try searching for Cable Clips, Fasteners, or Boxes</span>
                </div>
              ) : null}
            </div>
          )}
        </div>

        {/* Actions Section */}
        <div className="actions-section">
          <div className="action-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            <span className="action-label">Wishlist</span>
          </div>
          <div className="action-item cart-item">
            <div className="cart-icon-wrapper">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" /><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
              </svg>
              <span className="cart-badge">1</span>
            </div>
            <span className="action-label">Cart (1)</span>
          </div>
          <div className="action-item">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" />
            </svg>
            <span className="action-label">Account</span>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
