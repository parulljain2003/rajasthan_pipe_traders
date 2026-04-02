import React from 'react';
import Image from 'next/image';
import styles from './CategoryRow.module.css';
import { Product } from '../../../data/products';

interface Category {
  id: string;
  label: string;
  image: string;
  color: string;
  textColor: string;
}

interface CategoryRowProps {
  categories: Category[];
  activeCategory: string;
  onSelect: (id: string) => void;
  products: Product[];
}

export default function CategoryRow({ categories, activeCategory, onSelect, products }: CategoryRowProps) {
  const getCount = (id: string) =>
    id === 'All' ? products.length : products.filter(p => p.category === id).length;

  return (
    <div className={styles.wrapper}>
      <div className={styles.track}>
        {categories.map(cat => {
          const isActive = activeCategory === cat.id;
          const count = getCount(cat.id);
          return (
            <button
              key={cat.id}
              className={`${styles.item} ${isActive ? styles.itemActive : ''}`}
              onClick={() => onSelect(cat.id)}
              aria-pressed={isActive}
            >
              <div
                className={styles.iconBox}
                style={{
                  background: isActive ? cat.color : '#f8fafc',
                  borderColor: isActive ? cat.textColor + '44' : '#e2e8f0',
                }}
              >
                <Image
                  src={cat.image}
                  alt={cat.label}
                  width={58}
                  height={58}
                  style={{ objectFit: 'contain' }}
                />
              </div>
              <span
                className={styles.label}
                style={{ color: isActive ? cat.textColor : '#475569', fontWeight: isActive ? 700 : 600 }}
              >
                {cat.label}
              </span>
              <span
                className={styles.badge}
                style={isActive ? { background: cat.color, color: cat.textColor } : {}}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
