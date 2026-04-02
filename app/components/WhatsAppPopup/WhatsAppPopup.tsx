"use client";

import React, { useState, useRef, useEffect } from "react";
import styles from "./WhatsAppPopup.module.css";

interface WhatsAppPopupProps {
  isOpen: boolean;
  onClose: () => void;
  productName?: string;
}

export default function WhatsAppPopup({ isOpen, onClose, productName }: WhatsAppPopupProps) {
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      setPhone("");
      setError("");
      setSubmitted(false);
      setTimeout(() => inputRef.current?.focus(), 150);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleOverlayClick = (e: React.MouseEvent) => {
    if (e.target === overlayRef.current) onClose();
  };

  const validatePhone = (value: string) => {
    const digits = value.replace(/\D/g, "");
    return digits.length === 10;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const digits = phone.replace(/\D/g, "");

    if (!digits) {
      setError("Please enter your WhatsApp number");
      return;
    }
    if (!validatePhone(phone)) {
      setError("Please enter a valid 10-digit mobile number");
      return;
    }

    setSubmitted(true);

    setTimeout(() => {
      onClose();
    }, 2000);
  };

  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, "").slice(0, 10);
    setPhone(val);
    if (error) setError("");
  };

  if (!isOpen) return null;

  return (
    <div className={styles.overlay} ref={overlayRef} onClick={handleOverlayClick}>
      <div className={styles.popup}>
        {/* Close button */}
        <button className={styles.closeBtn} onClick={onClose} aria-label="Close">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        

        {!submitted ? (
          <>
          
            <p className={styles.desc}>
              Enter your WhatsApp number and we&apos;ll connect you with our team for quick order assistance.
            </p>

           

            <form onSubmit={handleSubmit} className={styles.form}>
              <div className={styles.inputGroup}>
                <span className={styles.prefix}>+91</span>
                <input
                  ref={inputRef}
                  type="tel"
                  inputMode="numeric"
                  placeholder="Enter 10-digit number"
                  value={phone}
                  onChange={handlePhoneChange}
                  className={`${styles.input} ${error ? styles.inputError : ""}`}
                  autoComplete="tel"
                />
              </div>
              {error && <p className={styles.error}>{error}</p>}

              <button type="submit" className={styles.submitBtn}>
                
                Submit
              </button>
            </form>

            
          </>
        ) : (
          <div className={styles.success}>
            <div className={styles.successIcon}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 7 9 18l-5-5" />
              </svg>
            </div>
            <h2 className={styles.title}>Added to Cart!</h2>
            {/* <p className={styles.desc}>{productName ? <><strong>{productName}</strong> has been added.</> : <>Product has been added.</>} Our team will contact you shortly.</p> */}
          </div>
        )}
      </div>
    </div>
  );
}
