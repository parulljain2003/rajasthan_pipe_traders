"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import './Header.css';
import { products } from '../../data/products';
import { useCartWishlist } from '../../context/CartWishlistContext';

/* ── Build flat search index from real product data ── */
const searchIndex = products.map(p => ({
  name: p.name,
  category: p.category,
  brand: p.brand,
  slug: p.slug,
}));

/* ── Mega menu navigation (slug-mapped) ── */
const coreProducts = [
  {
    category: "Cable Clips",
    items: [
      { name: "Cable Nail Clips", slug: "cable-nail-clips" },
      { name: "Double Nail Clamp", slug: "double-nail-clamp" },
      { name: "Nylon Cable Ties", slug: "nylon-cable-ties" },
      { name: "UPVC Pipe Clamp", slug: "upvc-pipe-clamp" },
      { name: "CPVC Pipe Clamp", slug: "cpvc-pipe-clamp" },
      { name: "Wall Plug (Gitti)", slug: "wall-plug-gitti" },
    ],
  },
  {
    category: "Electrical Accessories",
    items: [
      { name: "FR Insulation Tape", slug: "electric-insulation-tape" },
      { name: "Plain Modular Gang Box", slug: "plain-modular-gang-box" },
      { name: "Bulb Holder", slug: null },
      { name: "2 Pin / 3 Pin Top", slug: null },
      { name: "MCB Distribution Box", slug: null },
      { name: "Combined Switch Socket", slug: null },
    ],
  },
  {
    category: "Ball Valves",
    items: [
      { name: "PP White Ball Valve", slug: "ball-valve-white" },
      { name: "PP Grey Ball Valve", slug: "ball-valve-grey" },
      { name: "PP Black Ball Valve", slug: "ball-valve-black" },
      { name: "UPVC Ball Valve", slug: "upvc-ball-valve" },
      { name: "CPVC Ball Valve", slug: null },
    ],
  },
  {
    category: "Sanitaryware",
    items: [
      { name: "PP Bibcock", slug: null },
      { name: "PTMT Health Faucet", slug: null },
      { name: "PTMT Ball Cock", slug: null },
      { name: "Nani Trap", slug: null },
      { name: "Back Flow NRV", slug: null },
      { name: "ABS Square Shower", slug: null },
    ],
  },
  {
    category: "Fasteners & Hardware",
    items: [
      { name: "Concrete Nails", slug: null },
      { name: "Wall Plugs", slug: "wall-plug-gitti" },
      { name: "Dry Wall Screw", slug: null },
      { name: "Metal Gang Boxes", slug: null },
      { name: "Junction Boxes", slug: null },
    ],
  },
];

type SearchResult = { name: string; category: string; brand: string; slug: string };

const Header = () => {
  const router = useRouter();
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { wishlist, cartCount } = useCartWishlist();

  const handleSearch = useCallback((query: string) => {
    if (!query.trim()) { setSearchResults([]); return; }
    const lower = query.toLowerCase();
    const results = searchIndex.filter(
      item =>
        item.name.toLowerCase().includes(lower) ||
        item.category.toLowerCase().includes(lower) ||
        item.brand.toLowerCase().includes(lower)
    ).slice(0, 8);
    setSearchResults(results);
    setActiveIndex(-1);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => handleSearch(searchQuery), 180);
    return () => clearTimeout(t);
  }, [searchQuery, handleSearch]);

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
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const target = activeIndex >= 0 ? searchResults[activeIndex] : searchResults[0];
      if (target) navigateToProduct(target);
    } else if (e.key === 'Escape') {
      setIsSearchFocused(false);
      inputRef.current?.blur();
    }
  };

  const navigateToProduct = (result: SearchResult) => {
    setSearchQuery(result.name);
    setSearchResults([]);
    setIsSearchFocused(false);
    router.push(`/products/${result.slug}`);
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
        {/* Logo */}
        <Link href="/" className="logo-section">
          <div className="logo-container">
            <div className="logo-placeholder-graphic">
              <Image
                src="/logo.jpeg"
                alt="Rajasthan Pipe Traders Logo"
                width={150}
                height={50}
                className="main-logo"
                priority
              />
            </div>
          </div>
        </Link>

        {/* Navigation */}
        <nav className="nav-section">
          <div
            className="nav-item has-dropdown"
            onMouseEnter={() => setIsMegaMenuOpen(true)}
            onMouseLeave={() => setIsMegaMenuOpen(false)}
          >
            <span className="nav-link">
              Category
              <svg className={`chevron ${isMegaMenuOpen ? 'open' : ''}`} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>

            {isMegaMenuOpen && (
              <div className="mega-menu">
                <div className="mega-menu-content">
                  {coreProducts.map((group, idx) => (
                    <div key={idx} className="mega-menu-column">
                      <h3 className="column-title">{group.category}</h3>
                      <ul className="product-list">
                        {group.items.map((item, i) => (
                          <li key={i} className="product-item">
                            {item.slug ? (
                              <Link href={`/products/${item.slug}`}>{item.name}</Link>
                            ) : (
                              <a href="#" onClick={e => e.preventDefault()} className="coming-soon-link">
                                {item.name}
                                <span className="coming-soon-badge">Soon</span>
                              </a>
                            )}
                          </li>
                        ))}
                      </ul>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <Link href="/about" className="nav-link">About Us</Link>
          <Link href="/blogs" className="nav-link">Blogs</Link>
          <Link href="/contact" className="nav-link">Contact Us</Link>
        </nav>

        {/* Icons */}
        <div className="header-icons">
          <div className="header-icon-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill={wishlist.length > 0 ? "#ef4444" : "none"} stroke={wishlist.length > 0 ? "#ef4444" : "currentColor"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
            </svg>
            {wishlist.length > 0 && <span className="header-badge">{wishlist.length}</span>}
          </div>
          <div className="header-icon-item">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            {cartCount > 0 && <span className="header-badge">{cartCount}</span>}
          </div>
        </div>

        {/* Search */}
        <div className="search-section" ref={searchRef}>
          <div className={`search-bar ${isSearchFocused ? 'focused' : ''}`}>
            <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search products..."
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
                onClick={() => { setSearchQuery(''); setSearchResults([]); inputRef.current?.focus(); }}
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
                        onMouseDown={() => navigateToProduct(result)}
                        onMouseEnter={() => setActiveIndex(i)}
                      >
                        <svg className="result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
                        </svg>
                        <div className="result-text">
                          <span className="result-name">{highlightMatch(result.name, searchQuery)}</span>
                          <span className="result-category">{result.brand} · {result.category}</span>
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
                  <span>Try: Cable Clips, Ball Valve, Nylon Ties…</span>
                </div>
              ) : null}
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
