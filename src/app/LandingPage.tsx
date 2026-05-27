"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/context/AuthContext";
import GlobeCanvas from "@/components/landing/GlobeCanvas";
import styles from "./landing.module.css";
import { LANDING_FAQ as FAQ } from "./landing-faq";

/* ── Pricing tiers (preserve Stripe wiring) ──────────────────────── */

interface PricingTier {
  id: string;
  name: string;
  price: number;
  credits: string;
  priceId: string;
  popular?: boolean;
  cta: string;
  features: string[];
}

const TIERS: PricingTier[] = [
  {
    id: "essential",
    name: "Essential",
    price: 10,
    credits: "10 scan credits · $1.00 / scan",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL || "",
    cta: "Get started",
    features: [
      "10 × Nmap, Nuclei, or ZAP scans",
      "Hosted infrastructure",
      "PDF report export",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 50,
    credits: "100 scan credits · $0.50 / scan",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "",
    popular: true,
    cta: "Get Pro",
    features: [
      "100 × Nmap, Nuclei, or ZAP scans",
      "Hosted infrastructure",
      "PDF report export",
      "Priority email support",
      "Mix scanner types freely",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    price: 200,
    credits: "1,000 scan credits · $0.20 / scan",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE || "",
    cta: "Get Scale",
    features: [
      "1,000 × Nmap, Nuclei, or ZAP scans",
      "Hosted infrastructure",
      "PDF report export",
      "Dedicated support",
      "Best value per scan",
    ],
  },
];

/* ── Scanners + FAQ ──────────────────────────────────────────────── */

const SCANNERS = [
  {
    slug: "nmap",
    name: "Nmap",
    logo: "/scanners/nmap.png",
    tag: "Network",
    summary:
      "Fast external port & service visibility for attack-surface mapping and forgotten-endpoint discovery.",
  },
  {
    slug: "nuclei",
    name: "Nuclei",
    logo: "/scanners/nuclei.png",
    tag: "CVE",
    summary:
      "Template-based vulnerability detection mapped to current CVE intelligence and refreshed daily.",
  },
  {
    slug: "zap",
    name: "OWASP ZAP",
    logo: "/scanners/zap.png",
    tag: "Web",
    summary:
      "Automated web-layer security baseline — crawler, passive analysis, handoff-ready reports.",
  },
] as const;

/* ── Small inline icons ──────────────────────────────────────────── */

function ArrowIcon() {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 12 12"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M2 6h8M7 3l3 3-3 3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      className={styles.checkIcon}
      aria-hidden="true"
    >
      <path
        d="M3 7.5L6 10l5-5.5"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Page ─────────────────────────────────────────────────────────── */
/*
 * Navbar / Footer / logo are rendered by layout.tsx via ConditionalNav
 * — they are intentionally not included here.
 */
export default function LandingPage() {
  const { currentUser } = useAuth();
  const [loadingTier, setLoadingTier] = useState<string | null>(null);

  const handleCheckout = async (tier: PricingTier) => {
    if (!currentUser) {
      window.location.href = `/login?returnUrl=${encodeURIComponent("/#pricing")}`;
      return;
    }
    if (!tier.priceId) {
      toast.error("Pricing not configured — please contact support.");
      return;
    }

    setLoadingTier(tier.id);
    try {
      const token = await currentUser.getIdToken();
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          priceId: tier.priceId,
          email: currentUser.email,
          quantity: 1,
          metadata: { tier: tier.id },
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create checkout session");
      if (data.url) window.location.href = data.url;
    } catch (err) {
      const msg =
        err instanceof Error ? err.message : "Failed to start checkout";
      console.error("Checkout error:", err);
      toast.error(msg);
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <div className={styles.lpRoot}>
      {/* ── Hero ────────────────────────────────────────────────── */}
      <section className={styles.hero}>
        <div className={styles.heroGrid} aria-hidden="true" />
        <div className={`${styles.container} ${styles.heroInner}`}>
          <div>
            <span className={styles.eyebrow}>
              <span className={styles.eyebrowPulse} />
              Login in and start scanning.
            </span>
            <h1 className={styles.heroH1}>
              Hosted scans.
              <br />
              Deliverable reports.
            </h1>
            <p className={styles.lede}>
              Nmap · Nuclei · OWASP ZAP — one console, zero install.
            </p>
            <div className={styles.heroCtas}>
              <Link
                href="/login"
                className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
              >
                Start scanning <ArrowIcon />
              </Link>
              <Link
                href="#scanners"
                className={`${styles.btn} ${styles.btnGhost} ${styles.btnLg}`}
              >
                See scanners
              </Link>
            </div>
          </div>

          <div className={styles.globeStage}>
            <GlobeCanvas
              wrapClassName={styles.globeWrap}
              canvasClassName={styles.globeCanvas}
              tickerClassName={styles.globeTicker}
              dotClassName={styles.globeTickerDot}
            />
          </div>
        </div>
      </section>

      {/* ── Logo bar ────────────────────────────────────────────── */}
      <div className={styles.logobar}>
        <div className={`${styles.container} ${styles.logobarInner}`}>
          <span className={styles.logobarLabel}>
            Runs the scanners you already trust
          </span>
          <div className={styles.logobarItems}>
            {(
              [
                "Nmap",
                "Nuclei",
                "OWASP ZAP",
                "SBOM checks",
                "CVE feeds",
              ] as const
            ).map((name) => (
              <span key={name} className={styles.logobarItem}>
                <span className={styles.logobarDot} />
                {name}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* ── Scanner cards ───────────────────────────────────────── */}
      <section className={styles.block} id="scanners">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Scanners</p>
            <h2 className={styles.sectionTitle}>
              Three scanners. One hosted workflow.
            </h2>
            <p className={styles.sectionSub}>
              Each engine is tuned, patched, and continuously updated on our
              side. You pick the target, we handle the rest.
            </p>
          </div>
          <div className={styles.scannersGrid}>
            {SCANNERS.map((s) => (
              <article key={s.slug} className={styles.scannerCard}>
                <div className={styles.scannerLogoWrap}>
                  <Image
                    src={s.logo}
                    alt={`${s.name} logo`}
                    width={120}
                    height={56}
                    className={styles.scannerLogoImg}
                  />
                </div>
                <div className={styles.scannerHead}>
                  <span className={styles.scannerName}>{s.name}</span>
                  <span className={styles.scannerTag}>{s.tag}</span>
                </div>
                <p className={styles.scannerSummary}>{s.summary}</p>
                <div className={styles.scannerFoot}>
                  <span>1 credit per scan</span>
                  <Link
                    href={`/scanners/${s.slug}`}
                    className={styles.scannerMore}
                  >
                    Learn more →
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ── Pricing (Stripe checkout) ───────────────────────────── */}
      <section className={styles.block} id="pricing">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Pricing</p>
            <h2 className={styles.sectionTitle}>Credits, not subscriptions.</h2>
            <p className={styles.sectionSub}>
              Buy a pack, run any scanner against any approved target. Credits
              don&apos;t expire for 12 months. No seats, no overages.
            </p>
          </div>
          <div className={styles.pricingGrid}>
            {TIERS.map((t) => (
              <div
                key={t.id}
                className={`${styles.priceCard}${t.popular ? ` ${styles.priceCardPopular}` : ""}`}
              >
                <div className={styles.priceLabel}>
                  <span className={styles.priceLabelName}>{t.name}</span>
                  {t.popular && (
                    <span className={styles.priceLabelPop}>Most popular</span>
                  )}
                </div>
                <div className={styles.priceAmount}>
                  <span className={styles.priceAmountBig}>${t.price}</span>
                  <span className={styles.priceAmountSub}>/ one-time</span>
                </div>
                <div className={styles.priceCredits}>{t.credits}</div>
                <ul className={styles.priceFeatures}>
                  {t.features.map((f) => (
                    <li key={f}>
                      <CheckIcon />
                      {f}
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => handleCheckout(t)}
                  disabled={loadingTier === t.id}
                  className={`${styles.btn} ${t.popular ? styles.btnPrimary : styles.btnGhost} ${styles.priceCta}`}
                >
                  {loadingTier === t.id ? "Loading…" : t.cta}
                </button>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ─────────────────────────────────────────────────── */}
      <section className={`${styles.block} ${styles.blockNoPb}`} id="faq">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>FAQ</p>
            <h2 className={styles.sectionTitle}>Common questions</h2>
          </div>
          <div className={styles.faq}>
            {FAQ.map((item, i) => (
              <div
                key={i}
                className={`${styles.faqItem}${i === FAQ.length - 1 ? ` ${styles.faqItemLast}` : ""}`}
              >
                <h3 className={styles.faqQ}>
                  <span className={styles.faqNum}>
                    {String(i + 1).padStart(2, "0")}
                  </span>
                  {item.q}
                </h3>
                <p className={styles.faqA}>{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Final CTA ───────────────────────────────────────────── */}
      <section className={styles.final}>
        <div className={`${styles.container} ${styles.finalInner}`}>
          <h2 className={styles.finalH2}>
            Start delivering better security reports.
          </h2>
          <p className={styles.finalP}>
            Unified web app. Three scanners. Evidence-backed output your team
            can triage, fix, and verify.
          </p>
          <div className={styles.finalCtas}>
            <Link
              href="/login"
              className={`${styles.btn} ${styles.btnPrimary} ${styles.btnLg}`}
            >
              Create account
            </Link>
            <Link
              href="/app/scans"
              className={`${styles.btn} ${styles.btnGhost}   ${styles.btnLg}`}
            >
              Open the console
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
