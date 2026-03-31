"use client";

import React, { useState } from 'react';
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

const Header = () => {
  const [isMegaMenuOpen, setIsMegaMenuOpen] = useState(false);

  return (
    <header className="main-header">
      <div className="header-container">
        {/* Logo Section */}
        <div className="logo-section">
          <div className="logo-container">
            {/* Logo will be inserted here later */}
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
        <div className="search-section">
          <div className="search-bar">
            <svg className="search-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" />
            </svg>
            <input
              type="text"
              placeholder="Search for products, categories..."
              className="search-input"
            />
          </div>
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
