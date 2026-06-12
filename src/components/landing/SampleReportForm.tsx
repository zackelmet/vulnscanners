"use client";

import { useState } from "react";
import styles from "@/app/landing.module.css";

type Status = "idle" | "loading" | "success" | "error";

export default function SampleReportForm() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<Status>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (status === "loading") return;
    setStatus("loading");
    setMessage(null);
    try {
      const res = await fetch("/api/sample-report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setStatus("error");
        setMessage(data?.error || "Something went wrong. Please try again.");
        return;
      }
      setStatus("success");
      setMessage(null);
    } catch {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  if (status === "success") {
    return (
      <div className={styles.sampleSuccess} role="status">
        <p className={styles.sampleSuccessTitle}>Check your inbox ✓</p>
        <p className={styles.sampleSuccessText}>
          We just emailed the sample report to <strong>{email}</strong>. If it
          doesn&apos;t arrive within a minute, check spam.
        </p>
      </div>
    );
  }

  return (
    <form className={styles.sampleForm} onSubmit={handleSubmit} noValidate>
      <div className={styles.sampleFormRow}>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (status === "error") setStatus("idle");
          }}
          placeholder="you@company.com"
          aria-label="Work email"
          className={styles.sampleInput}
          autoComplete="email"
        />
        <button
          type="submit"
          className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
          disabled={status === "loading"}
        >
          {status === "loading" ? "Sending…" : "Email me the report"}
        </button>
      </div>
      <p
        className={status === "error" ? styles.sampleError : styles.sampleHint}
      >
        {status === "error"
          ? message
          : "Work email only. We'll send the PDF straight to your inbox — no account needed."}
      </p>
    </form>
  );
}
