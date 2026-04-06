"use client";

import React, { useState } from "react";
import styles from "./SpecsTable.module.css";
import type { Product } from "../../../data/products";

interface SpecsTableProps {
  product: Product;
}

type TabKey = "specs" | "terms";

const tabs: { key: TabKey; label: string }[] = [
  { key: "specs", label: "Size & Price List" },
  { key: "terms", label: "Terms & Conditions" },
];

export default function SpecsTable({ product }: SpecsTableProps) {
  const [activeTab, setActiveTab] = useState<TabKey>("specs");

  return (
    <div className={styles.container}>
      {/* Tab Bar */}
      <div className={styles.tabBar}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`${styles.tab} ${activeTab === tab.key ? styles.tabActive : ""}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ── Tab: Size & Price List ── */}
      {activeTab === "specs" && (
        <div className={styles.tabContent}>
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Size / Variant</th>
                  <th>Basic Price</th>
                  <th>Price with GST</th>
                  <th>Pkts / Master Bag</th>
                  <th>Pcs / Packet</th>
                </tr>
              </thead>
              <tbody>
                {product.sizes.map((s, i) => (
                  <tr key={i} className={i % 2 === 0 ? styles.rowEven : styles.rowOdd}>
                    <td className={styles.sizeCell}>{s.size}</td>
                    <td className={styles.basicPriceCell}>₹{s.basicPrice.toFixed(2)}</td>
                    <td className={styles.gstPriceCell}>₹{s.withGST.toFixed(2)}</td>
                    <td className={styles.centerCell}>{s.qtyPerBag}</td>
                    <td className={styles.centerCell}>{s.pcsPerPacket}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className={styles.tableNote}>
            * All prices are per packet (excluding transport). Prices effective 01-04-2026.
          </p>
        </div>
      )}


      {/* ── Tab: Terms & Conditions ── */}
      {activeTab === "terms" && (
        <div className={styles.tabContent}>
          <div className={styles.termsList}>
            {[
              {
                icon: "💳",
                title: "100% Advance Payment",
                desc: "Full payment must be made in advance before dispatch of goods.",
              },
              {
                icon: "🚚",
                title: "TO PAY Transport Booking",
                desc: "Freight charges are to be borne by the buyer — all goods dispatched on TO PAY basis.",
              },
              {
                icon: "⚖️",
                title: "Subject to Ahmedabad Jurisdiction",
                desc: "All disputes are subject to the exclusive jurisdiction of courts in Ahmedabad.",
              },
              {
                icon: "🔒",
                title: "Goods Once Sold Cannot be Returned",
                desc: "No returns or exchanges once goods have been dispatched or delivered.",
              },
              {
                icon: "📋",
                title: "Price May Change Without Prior Notice",
                desc: "Prices are subject to change without any prior notice. Please confirm before ordering.",
              },
              {
                icon: "❌",
                title: "Order Cancellation",
                desc: "All existing orders will be automatically cancelled if there is any change in price. Advance payments received against such orders will be refunded accordingly.",
              },
              {
                icon: "📦",
                title: "Minimum Order Value",
                desc: `Minimum order value is ${product.minOrder} on the complete price list.`,
              },
              {
                icon: "🏷️",
                title: "Discount Policy",
                desc: "Discounts of 7%–12% are available on 15–85 cartons/bags on mix items. Only 2% discount on electric tapes, Ronela accessories, wires, and N-Star bibcock/ball valve range.",
              },
            ].map((term, i) => (
              <div key={i} className={styles.termItem}>
                <span className={styles.termIcon}>{term.icon}</span>
                <div>
                  <p className={styles.termTitle}>{term.title}</p>
                  <p className={styles.termDesc}>{term.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
