import Image from 'next/image';
import Link from 'next/link';
import styles from './HomeCategoryGrid.module.css';
import { categories } from '../../data/categories';
import { products } from '../../data/products';

export default function HomeCategoryGrid() {
  return (
    <section className={styles.section}>
      <div className={styles.container}>
        <div className={styles.header}>
          <h2 className={styles.title}>Shop by Category</h2>
          <p className={styles.subtitle}>Browse our complete range of quality products</p>
        </div>

        <div className={styles.grid}>
          {categories.map(cat => {
            const count = products.filter(p => p.category === cat.id).length;
            return (
              <Link key={cat.id} href={`/category/${cat.slug}`} className={styles.card}>
                <div className={styles.imageArea} style={{ background: cat.bgColor }}>
                  <div className={styles.imageWrap}>
                    <Image
                      src={cat.image}
                      alt={cat.name}
                      fill
                      sizes="(max-width: 640px) 50vw, (max-width: 1280px) 33vw, 20vw"
                      style={{ objectFit: 'contain', padding: '1.25rem' }}
                    />
                  </div>
                </div>
                <div className={styles.info}>
                  <div className={styles.text}>
                    <h3 className={styles.name}>{cat.name}</h3>
                    <p className={styles.count}>{count} items</p>
                  </div>
                  <div className={styles.arrowBtn} aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="m9 18 6-6-6-6" />
                    </svg>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </section>
  );
}
