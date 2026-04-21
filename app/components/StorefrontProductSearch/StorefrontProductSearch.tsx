"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { searchData, type SearchEntry } from "@/app/data/searchData";

function highlightMatch(text: string, query: string): React.ReactNode {
  const q = query.trim();
  if (!q) return text;
  const lower = text.toLowerCase();
  const qi = q.toLowerCase();
  const idx = lower.indexOf(qi);
  if (idx === -1) return text;
  return (
    <>
      {text.slice(0, idx)}
      <span className="search-highlight">{text.slice(idx, idx + q.length)}</span>
      {text.slice(idx + q.length)}
    </>
  );
}

export function useStorefrontProductSearch() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const searchResults = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return [];
    return searchData
      .filter(
        (e) =>
          e.name.toLowerCase().includes(q) ||
          e.slug.toLowerCase().includes(q) ||
          e.category.toLowerCase().includes(q) ||
          e.brand.toLowerCase().includes(q),
      )
      .slice(0, 8);
  }, [searchQuery]);

  useEffect(() => {
    setActiveIndex(0);
  }, [searchQuery]);

  const navigateToProduct = useCallback(
    (result: SearchEntry) => {
      router.push(`/products/${result.slug}`);
      setSearchQuery("");
      setIsFocused(false);
    },
    [router],
  );

  return {
    searchQuery,
    setSearchQuery,
    searchResults,
    navigateToProduct,
    isFocused,
    setIsFocused,
    activeIndex,
    setActiveIndex,
  };
}

export type StorefrontProductSearchState = ReturnType<typeof useStorefrontProductSearch>;

export function StorefrontProductSearchView({
  searchQuery,
  setSearchQuery,
  searchResults,
  navigateToProduct,
  isFocused,
  setIsFocused,
  activeIndex,
  setActiveIndex,
}: StorefrontProductSearchState) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const showDropdown = isFocused && searchQuery.trim().length > 0;

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [setIsFocused]);

  const onKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown && e.key !== "Escape") return;
    const len = searchResults.length;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (len === 0) return;
      setActiveIndex((i) => Math.min(i + 1, len - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (len === 0) return;
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      if (len > 0) {
        e.preventDefault();
        const r = searchResults[activeIndex] ?? searchResults[0];
        if (r) navigateToProduct(r);
      }
    } else if (e.key === "Escape") {
      setIsFocused(false);
    }
  };

  return (
    <div className="search-section" ref={wrapRef}>
      <div className={`search-bar ${isFocused ? "focused" : ""}`}>
        <svg className="search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
          <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
          <path d="m20 20-3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        <input
          type="search"
          className="search-input"
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          aria-autocomplete="list"
          aria-expanded={showDropdown}
          aria-controls="storefront-search-results"
        />
        {searchQuery.trim() ? (
          <button
            type="button"
            className="search-clear-btn"
            aria-label="Clear search"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              setSearchQuery("");
              setActiveIndex(0);
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M18 6 6 18M6 6l12 12" />
            </svg>
          </button>
        ) : null}
      </div>

      {showDropdown ? (
        <div className="search-dropdown" id="storefront-search-results" role="listbox">
          {searchResults.length > 0 ? (
            <>
              <div className="search-dropdown-header">Products</div>
              <ul className="search-results-list" role="presentation">
                {searchResults.map((result, i) => (
                  <li key={`${result.slug}-${i}`} role="option" aria-selected={i === activeIndex}>
                    <button
                      type="button"
                      className={`search-result-item ${i === activeIndex ? "active" : ""}`}
                      onMouseDown={(e) => e.preventDefault()}
                      onMouseEnter={() => setActiveIndex(i)}
                      onClick={() => navigateToProduct(result)}
                    >
                      <svg className="result-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path
                          d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z"
                          stroke="currentColor"
                          strokeWidth="1.5"
                        />
                      </svg>
                      <div className="result-text">
                        <span className="result-name">{highlightMatch(result.name, searchQuery)}</span>
                        <span className="result-category">
                          {result.category} · {result.brand}
                        </span>
                      </div>
                      <svg className="result-arrow" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
                        <path d="m9 18 6-6-6-6" stroke="currentColor" strokeWidth="2" />
                      </svg>
                    </button>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <div className="search-no-results">
              <p>No products found</p>
              <span>Try a different name or category</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
