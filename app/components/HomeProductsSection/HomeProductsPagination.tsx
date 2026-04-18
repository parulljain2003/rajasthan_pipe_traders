import Link from "next/link";
import styles from "./HomeProductsSection.module.css";

type Props = {
  page: number;
  totalPages: number;
};

export default function HomeProductsPagination({ page, totalPages }: Props) {
  if (totalPages <= 1) return null;

  const prevHref = page <= 1 ? null : page === 2 ? "/" : `/?page=${page - 1}`;
  const nextHref = page >= totalPages ? null : `/?page=${page + 1}`;

  return (
    <nav className={styles.pagination} aria-label="Product list pagination">
      {prevHref ? (
        <Link href={prevHref} className={styles.paginationLink} prefetch>
          Previous
        </Link>
      ) : (
        <span className={styles.paginationDisabled}>Previous</span>
      )}
      <span className={styles.paginationStatus}>
        Page {page} of {totalPages}
      </span>
      {nextHref ? (
        <Link href={nextHref} className={styles.paginationLink} prefetch>
          Next
        </Link>
      ) : (
        <span className={styles.paginationDisabled}>Next</span>
      )}
    </nav>
  );
}
