import Image from "next/image";
import styles from "./HeroBanner.module.css";

export default function HeroBanner() {
  return (
    <section className={styles.hero}>
      <div className={styles.banner}>
        <Image
          src="/est.png"
          alt="Complete Electrical & Hardware Solutions"
          fill
          className={styles.bannerImage}
          priority
        />
      </div>
    </section>
  );
}