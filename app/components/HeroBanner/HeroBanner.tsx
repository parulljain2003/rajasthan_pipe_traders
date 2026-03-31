"use client";

import { useState, useEffect } from "react";
import Image from "next/image";
import styles from "./HeroBanner.module.css";

const slides = [
  {
    id: 1,
    img: "/banner.png",
    title: "Premium Industrial Pipes",
    subtitle: "Built for durability and extreme pressure",
  },
  {
    id: 2,
    img: "/banner_2.png",
    title: "Advanced Fittings",
    subtitle: "Precision engineered for leak-proof systems",
  },
  {
    id: 3,
    img: "/banner.png",
    title: "Heavy Duty Hardware",
    subtitle: "Reliable tools for industrial scaling",
  },
];

export default function HeroBanner() {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);

    return () => clearInterval(timer);
  }, []);

  const nextSlide = () =>
    setCurrentSlide((prev) => (prev + 1) % slides.length);

  const prevSlide = () =>
    setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);

  return (
    <section className={styles.hero}>
      <div className={styles.wrapper}>

        {/* LEFT STRIP */}
        <div className={styles.promo}>
          <Image
            src="/strip.png"
            alt="Promo"
            fill
            className={styles.image}
          />
          <div className={styles.badge}>Special Offer</div>
        </div>

        {/* RIGHT CAROUSEL */}
        <div className={styles.carousel}>
          <div
            className={styles.track}
            style={{ transform: `translateX(-${currentSlide * 100}%)` }}
          >
            {slides.map((slide, index) => (
              <div key={slide.id} className={styles.slide}>
                <Image
                  src={slide.img}
                  alt={slide.title}
                  fill
                  className={styles.image}
                  priority={index === 0}
                />

                <div className={styles.overlay} />

                <div className={styles.content}>
                  <h2>{slide.title}</h2>
                  <p>{slide.subtitle}</p>
                  <button>Explore Collection</button>
                </div>
              </div>
            ))}
          </div>

          {/* CONTROLS */}
          <div className={styles.controls}>
            <button onClick={prevSlide}>‹</button>

            <div className={styles.dots}>
              {slides.map((_, i) => (
                <span
                  key={i}
                  className={i === currentSlide ? styles.active : ""}
                  onClick={() => setCurrentSlide(i)}
                />
              ))}
            </div>

            <button onClick={nextSlide}>›</button>
          </div>
        </div>

      </div>
    </section>
  );
}