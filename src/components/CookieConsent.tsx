"use client";

import { useEffect, useState } from "react";
import styles from "./CookieConsent.module.css";

const STORAGE_KEY = "vs-cookie-consent";

export default function CookieConsent() {
  // Start hidden; reveal after mount only if consent hasn't been given, so the
  // server/client markup matches and we don't flash the banner for users who
  // already dismissed it.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (localStorage.getItem(STORAGE_KEY) !== "ok") setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  function accept() {
    try {
      localStorage.setItem(STORAGE_KEY, "ok");
    } catch {
      /* ignore storage failures (private mode, etc.) */
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <div className={styles.banner} role="region" aria-label="Cookie notice">
      <p className={styles.text}>
        We use cookies to operate and improve this site. By continuing to use
        this website, you consent to our use of cookies.
      </p>
      <button type="button" className={styles.button} onClick={accept}>
        Okay
      </button>
    </div>
  );
}
