"use client";

import React, { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import './Header.css';
import { searchData } from '../../data/searchData';
import { useCartWishlist } from '../../context/CartWishlistContext';
import { fetchCategoriesList } from '../../lib/api/client';
import type { ApiCategory } from '../../lib/api/types';

const searchIndex = searchData;

import type { SearchEntry } from '../../data/searchData';
type SearchResult = SearchEntry;

const Header = () => {
  const router = useRouter();
  const pathname = usePathname();
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileCatOpen, setMobileCatOpen] = useState(false);

  useEffect(() => {
    setIsMegaMenuOpen(false);
    setMobileMenuOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [mobileMenuOpen]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const { cartCount } = useCartWishlist();
  const [navCategories, setNavCategories] = useState<ApiCategory[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await fetchCategoriesList();
        if (!cancelled) setNavCategories(data);
      } catch {
        if (!cancelled) setNavCategories([]);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  /** Live suggestions: query Mongo catalog via `/api/products?q=` (multi-field match); fallback to static `searchData`. */
  useEffect(() => {
    const ac = new AbortController();
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      setActiveIndex(-1);
      return () => ac.abort();
    }
    const t = setTimeout(() => {
      void (async () => {
        try {
          const res = await fetch(`/api/products?q=${encodeURIComponent(q)}&limit=8`, {
            cache: "no-store",
            signal: ac.signal,
          });
          if (!res.ok) throw new Error("search failed");
          const json = (await res.json()) as { data?: Record<string, unknown>[] };
          const rows = Array.isArray(json.data) ? json.data : [];
          const mapped: SearchResult[] = [];
          for (const d of rows) {
            const slug =
              typeof d.slug === "string" && d.slug.trim() ? d.slug.trim() : "";
            const name = String(d.name ?? "");
            if (!slug || !name) continue;
            const cat = d.category as { name?: string } | undefined;
            mapped.push({
              name,
              slug,
              category: cat?.name ?? "",
              brand: String(d.brand ?? ""),
            });
          }
          if (mapped.length > 0) {
            setSearchResults(mapped.slice(0, 8));
            setActiveIndex(-1);
            return;
          }
        } catch (e) {
          if ((e as Error).name === "AbortError") return;
        }
        const tokens = q
          .toLowerCase()
          .split(/\s+/)
          .filter((tok) => tok.length >= 2);
        const fallback = searchIndex.filter((item) => {
          const hay = `${item.name} ${item.category} ${item.brand}`.toLowerCase();
          return tokens.every((tok) => hay.includes(tok));
        });
        setSearchResults(fallback.slice(0, 8));
        setActiveIndex(-1);
      })();
    }, 200);
    return () => {
      clearTimeout(t);
      ac.abort();
    };
  }, [searchQuery]);

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

  const showDropdown =
    isSearchFocused && (searchResults.length > 0 || searchQuery.trim().length >= 2);

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
                <div className="mega-menu-inner">
                  <div className="mega-menu-grid">
                    {navCategories.length === 0 ? (
                      <span className="mega-menu-empty">Loading categories…</span>
                    ) : (
                      navCategories.map((cat) => (
                        <Link
                          key={cat._id}
                          href={`/category/${cat.slug}`}
                          className="mega-menu-category-link"
                          onClick={() => setIsMegaMenuOpen(false)}
                        >
                          {cat.name}
                        </Link>
                      ))
                    )}
                  </div>
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
         
          <Link href="/cart" className="header-icon-item" aria-label="View cart">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="8" cy="21" r="1" /><circle cx="19" cy="21" r="1" />
              <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
            </svg>
            {cartCount > 0 && <span className="header-badge">{cartCount}</span>}
          </Link>

          {/* Hamburger — mobile only */}
          <button
            className="hamburger-btn"
            onClick={() => setMobileMenuOpen(o => !o)}
            aria-label="Toggle menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
            ) : (
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>
            )}
          </button>
        </div>

        {/* Mobile menu overlay */}
        {mobileMenuOpen && (
          <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
            <nav className="mobile-menu" onClick={e => e.stopPropagation()}>
              <div className="mobile-menu-header">
                <span className="mobile-menu-title">Menu</span>
                <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
                </button>
              </div>

              <div className="mobile-menu-search">
                <input
                  type="text"
                  placeholder="Search products..."
                  className="mobile-search-input"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && searchResults.length > 0) { navigateToProduct(searchResults[0]); setMobileMenuOpen(false); } }}
                />
              </div>

              {searchResults.length > 0 && (
                <ul className="mobile-search-results">
                  {searchResults.slice(0, 5).map((result, i) => (
                    <li key={i} onMouseDown={() => { navigateToProduct(result); setMobileMenuOpen(false); }} className="mobile-search-result-item">
                      <span>{result.name}</span>
                      <span className="mobile-result-category">{result.category}</span>
                    </li>
                  ))}
                </ul>
              )}

              <ul className="mobile-nav-links">
                <li><Link href="/" className="mobile-nav-link">Home</Link></li>
                <li>
                  <button className="mobile-nav-link mobile-cat-toggle" onClick={() => setMobileCatOpen(o => !o)}>
                    Category
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" style={{ transform: mobileCatOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><path d="m6 9 6 6 6-6"/></svg>
                  </button>
                  {mobileCatOpen && (
                    <div className="mobile-cat-list">
                      {navCategories.map((cat) => (
                        <Link
                          key={cat._id}
                          href={`/category/${cat.slug}`}
                          className="mobile-cat-link"
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          {cat.name}
                        </Link>
                      ))}
                    </div>
                  )}
                </li>
                <li><Link href="/about" className="mobile-nav-link">About Us</Link></li>
                <li><Link href="/blogs" className="mobile-nav-link">Blogs</Link></li>
                <li><Link href="/contact" className="mobile-nav-link">Contact Us</Link></li>
                <li><Link href="/cart" className="mobile-nav-link" onClick={() => setMobileMenuOpen(false)}>
                  Cart {cartCount > 0 && <span className="mobile-cart-badge">{cartCount}</span>}
                </Link></li>
              </ul>
            </nav>
          </div>
        )}

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
              ) : searchQuery.trim().length >= 2 ? (
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
