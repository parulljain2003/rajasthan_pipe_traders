"use client";

import React, { useCallback, useEffect, useId, useState } from "react";
import { createPortal } from "react-dom";
import styles from "./QuotationDetailsModal.module.css";
import {
  generateQuotationPDF,
  type QuotationPdfOrderData,
} from "@/lib/utils/generateQuotationPDF";

const PHONE_OK = /^\d{10}$/;

function digitsOnly(s: string, max: number) {
  return s.replace(/\D/g, "").slice(0, max);
}

export interface QuotationFormValues {
  fullName: string;
  phone: string;
  email: string;
}

interface QuotationDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * POST the order; must resolve with the same payload the PDF generator expects
   * (as returned from POST /api/quotation-request).
   */
  submitQuotation: (data: QuotationFormValues) => Promise<QuotationPdfOrderData>;
  /** After API + PDF; parent opens success, closes dialog. */
  onQuotationSuccess: () => void;
}

type LoadPhase = "idle" | "saving" | "generating";

export default function QuotationDetailsModal({
  isOpen,
  onClose,
  submitQuotation,
  onQuotationSuccess,
}: QuotationDetailsModalProps) {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phase, setPhase] = useState<LoadPhase>("idle");
  const [submitError, setSubmitError] = useState<string | null>(null);
  const isBusy = phase !== "idle";
  const labelId = useId();
  const descId = useId();

  useEffect(() => {
    if (isOpen) {
      const prev = document.body.style.overflow;
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = prev;
      };
    }
    return undefined;
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setFullName("");
      setPhone("");
      setEmail("");
      setPhoneTouched(false);
      setPhase("idle");
      setSubmitError(null);
    }
  }, [isOpen]);

  const phoneValid = PHONE_OK.test(phone);
  const phoneShowError = phoneTouched && phone.length > 0 && !phoneValid;
  const canSubmit = phoneValid && !isBusy;

  const onPhoneChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setPhone(digitsOnly(e.target.value, 10));
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setPhase("saving");
    setSubmitError(null);
    const form: QuotationFormValues = { fullName: fullName.trim(), phone, email: email.trim() };
    try {
      const orderData = await submitQuotation(form);
      setPhase("generating");
      // PDF uses only this API payload (orderSummary + totalPrice + cart lines) so totals match the cart.
      await generateQuotationPDF(orderData);
      onQuotationSuccess();
    } catch (e) {
      const message = e instanceof Error ? e.message : "Could not complete your request.";
      setSubmitError(message);
    } finally {
      setPhase("idle");
    }
  }, [canSubmit, submitQuotation, fullName, phone, email, onQuotationSuccess]);

  if (!isOpen) return null;

  const content = (
    <div
      className={styles.overlay}
      role="presentation"
      onClick={isBusy ? undefined : onClose}
    >
      <div
        className={styles.modal}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelId}
        aria-describedby={descId}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => {
          if (e.key === "Escape" && !isBusy) onClose();
        }}
      >
        <button
          type="button"
          className={styles.closeBtn}
          onClick={onClose}
          disabled={isBusy}
          aria-label="Close"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M18 6 6 18M6 6l12 12" />
          </svg>
        </button>

        <div className={styles.header}>
          <h2 className={styles.title} id={labelId}>
            Confirm Your Details
          </h2>
          <p className={styles.subtitle} id={descId}>
            A professional quotation will be generated based on this info.
          </p>
        </div>

        <div className={styles.fields}>
          <div>
            <label className={styles.label} htmlFor="quotation-fullname">
              Full Name
            </label>
            <input
              id="quotation-fullname"
              className={styles.input}
              type="text"
              name="fullName"
              autoComplete="name"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              disabled={isBusy}
              placeholder="Your name"
            />
          </div>

          <div>
            <label className={styles.label} htmlFor="quotation-phone">
              Phone Number<span className={styles.requiredAsterisk} aria-hidden="true"> *</span>
            </label>
            <input
              id="quotation-phone"
              className={`${styles.input} ${phoneShowError ? styles.inputError : ""}`}
              type="tel"
              name="phone"
              inputMode="numeric"
              autoComplete="tel"
              value={phone}
              onChange={onPhoneChange}
              onBlur={() => setPhoneTouched(true)}
              disabled={isBusy}
              placeholder="10-digit mobile number"
              aria-required
              aria-invalid={phoneShowError}
              aria-describedby="quotation-phone-err"
            />
            <p className={styles.fieldError} id="quotation-phone-err">
              {phoneShowError ? "Enter exactly 10 digits" : ""}
            </p>
          </div>

          <div>
            <label className={styles.label} htmlFor="quotation-email">
              Email
            </label>
            <input
              id="quotation-email"
              className={styles.input}
              type="email"
              name="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={isBusy}
              placeholder="you@example.com"
            />
          </div>
        </div>

        {submitError ? <p className={styles.apiError}>{submitError}</p> : null}

        <div className={styles.actions}>
          <button type="button" className={styles.btnCancel} onClick={onClose} disabled={isBusy}>
            Cancel
          </button>
          <button
            type="button"
            className={styles.btnPrimary}
            onClick={() => void handleSubmit()}
            disabled={!canSubmit}
            aria-busy={isBusy}
          >
            {phase === "saving"
              ? "Saving your order..."
              : phase === "generating"
                ? "Generating your quotation..."
                : "Confirm to Place Order"}
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== "undefined" ? createPortal(content, document.body) : null;
}
