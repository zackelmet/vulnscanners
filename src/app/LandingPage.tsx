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
    credits: "30 scans · $0.33 / scan",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL || "",
    cta: "Get started",
    features: [
      "10 of each scanner type",
      "Hosted infrastructure",
      "PDF report export",
      "Email support",
    ],
  },
  {
    id: "pro",
    name: "Pro",
    price: 50,
    credits: "300 scans · $0.17 / scan",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "",
    popular: true,
    cta: "Get Pro",
    features: [
      "100 of each scanner type",
      "Hosted infrastructure",
      "PDF report export",
      "Priority email support",
    ],
  },
  {
    id: "scale",
    name: "Scale",
    price: 200,
    credits: "3,000 scans · $0.07 / scan",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE || "",
    cta: "Get Scale",
    features: [
      "1,000 of each scanner type",
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

function ServerIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="4"
        width="17"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <rect
        x="3.5"
        y="14"
        width="17"
        height="6"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle cx="7" cy="7" r="0.9" fill="currentColor" />
      <circle cx="7" cy="17" r="0.9" fill="currentColor" />
      <path
        d="M11 7h6M11 17h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
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

/* ── Icons for ported sections (inline SVG — no FA dependency) ───── */

function ShieldIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 3.5l7 2.4v4.9c0 4.3-2.9 7.4-7 9-4.1-1.6-7-4.7-7-9V5.9l7-2.4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M12 3.7V20"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.45"
      />
    </svg>
  );
}
function NetworkIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="5" r="2.3" stroke="currentColor" strokeWidth="1.4" />
      <circle
        cx="5.5"
        cy="19"
        r="2.3"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <circle
        cx="18.5"
        cy="19"
        r="2.3"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.6 6.8 6.8 16.9M13.4 6.8 17.2 16.9"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function BoltIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 3 6 13h4.5L10 21l8-11h-5l0-7Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function RefreshIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5.5 9a7 7 0 0 1 11.4-2.7L19 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M19 4.5V8.2h-3.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M18.5 15a7 7 0 0 1-11.4 2.7L5 16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 19.5V15.8h3.7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function ClockIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 7.5V12l3 1.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function RocketIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M5 19c0-3 1-6 3.5-8.5C11 8 14.5 6.6 18.5 6c-.6 4-2 7.5-4.5 10C11.5 18.5 8 19 5 19Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle
        cx="13.7"
        cy="10.4"
        r="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5 19l2.6-.9M5 19l.9-2.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="6.5" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M12 2.5v3M12 18.5v3M2.5 12h3M18.5 12h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function ChartIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 4v16h16"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7 15l3.5-4 3 2.5L19 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
function DesktopIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3.5"
        y="4.5"
        width="17"
        height="11"
        rx="1.5"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M9 19h6M12 15.5V19"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function CoinsIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <ellipse
        cx="12"
        cy="7"
        rx="6.5"
        ry="2.7"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M5.5 7v6c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7V7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M5.5 10.2c0 1.5 2.9 2.7 6.5 2.7s6.5-1.2 6.5-2.7"
        stroke="currentColor"
        strokeWidth="1.2"
        opacity="0.55"
      />
    </svg>
  );
}
function BugIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="8"
        y="8"
        width="8"
        height="9"
        rx="4"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M12 8V6M9.6 6.6 8.6 5M14.4 6.6 15.4 5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M8 11H4.6M16 11h3.4M8 14H5.2M16 14h2.8M8.4 16.6 6.2 18.6M15.6 16.6 17.8 18.6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}
function HourglassIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M7 4h10M7 20h10"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
      <path
        d="M7.5 4c0 4 4.5 5 4.5 8s-4.5 4-4.5 8M16.5 4c0 4-4.5 5-4.5 8s4.5 4 4.5 8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Ported section data (copy from the prior landing) ───────────── */

const CAPABILITIES = [
  {
    icon: ShieldIcon,
    badge: "Network security perspective",
    title: "Internet-facing vulnerability scanners",
    sub: "Attacker's-perspective testing",
    desc: "Proactively hunt for security weaknesses by simulating real-world security events and assessing vulnerabilities from the attacker's viewpoint.",
  },
  {
    icon: ServerIcon,
    badge: "Trusted security tools",
    title: "Security-professional standard",
    sub: "Trusted industry tools",
    desc: "Find security holes using trusted open-source tools — the same powerful scanners used by penetration testers and security professionals around the world.",
  },
  {
    icon: NetworkIcon,
    badge: "Network discovery",
    title: "Full network visibility",
    sub: "Complete attack-surface discovery",
    desc: "Discover and map your entire attack surface using a combination of scanning tools and open-source intelligence for improved visibility into your network footprint.",
  },
  {
    icon: BoltIcon,
    badge: "High-performance servers",
    title: "Fast & hassle-free",
    sub: "Zero maintenance, optimized performance",
    desc: "Leverage fast servers optimized for vulnerability scanning across the Internet — zero software installation, setup, or maintenance on your end.",
  },
  {
    icon: RefreshIcon,
    badge: "Security workflow cycle",
    title: "Continuous security improvement",
    sub: "Identify, remediate, re-test",
    desc: "Fixing security issues is a process: quickly identify the issue, remediate the risk using actionable data, and test again to be completely sure.",
  },
  {
    icon: ClockIcon,
    badge: "Proven technology",
    title: "Proven since 1997",
    sub: "Deep experience, refined tooling",
    desc: "Your security relies on decades of refinement. The underlying open-source technology, such as Nmap, has been trusted by the security community since the late 1990s.",
  },
];

const KEY_FEATURES = [
  {
    icon: RocketIcon,
    badge: "Effortless deployment",
    title: "Effortless deployment & maintenance",
    desc: "As a fully hosted service, there's nothing to install or maintain. Launch comprehensive security scans instantly from anywhere, whenever your operations demand it.",
  },
  {
    icon: TargetIcon,
    badge: "Attack-surface discovery",
    title: "Complete attack-surface discovery",
    desc: "Eliminate blind spots. Find forgotten assets and expose poorly maintained endpoints for full network visibility — actionable intelligence for both Red Team testing and Blue Team defense.",
  },
  {
    icon: ChartIcon,
    badge: "Vulnerability management",
    title: "Advanced vulnerability management",
    desc: "Gain continuous oversight of your security posture. Easily schedule industry-leading tools like Nuclei and Nmap for ongoing vulnerability detection and proactive monitoring.",
  },
  {
    icon: DesktopIcon,
    badge: "Simple interface",
    title: "Intuitive, simple interface",
    desc: "Security testing shouldn't be complicated. Launch powerful scans via a simple, configuration-driven form and get results quickly, without the hassle.",
  },
];

const PAINS = [
  {
    icon: CoinsIcon,
    title: "High hidden costs",
    desc: "Licenses, servers, power, cooling, and the engineer stuck babysitting scanner uptime — all add invisible, recurring costs.",
  },
  {
    icon: BugIcon,
    title: "Outdated threat coverage",
    desc: "Missed patches and stale feeds mean critical vulnerabilities go undetected until it's too late.",
  },
  {
    icon: HourglassIcon,
    title: "Wasted time & focus",
    desc: "Security teams get pulled into infrastructure firefights instead of triaging and fixing real vulnerabilities.",
  },
];

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

      {/* ── Capabilities (internet-facing scanners) ─────────────── */}
      <section className={styles.block} id="capabilities">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Platform</p>
            <h2 className={styles.sectionTitle}>
              A complete security assessment platform
            </h2>
            <p className={styles.sectionSub}>
              Proactive vulnerability detection with industry-leading tools.
            </p>
          </div>
          <div className={styles.painsGrid}>
            {CAPABILITIES.map((c) => {
              const Icon = c.icon;
              return (
                <article key={c.title} className={styles.painCard}>
                  <div className={styles.painIcon} aria-hidden="true">
                    <Icon />
                  </div>
                  <div className={styles.featBody}>
                    <span className={styles.featBadge}>{c.badge}</span>
                    <h3 className={styles.painH3}>{c.title}</h3>
                    <p className={styles.featSub}>{c.sub}</p>
                    <p className={styles.painP}>{c.desc}</p>
                  </div>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Pain points ─────────────────────────────────────────── */}
      <section className={styles.block} id="why" aria-labelledby="why-title">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>The problem</p>
            <h2 id="why-title" className={styles.sectionTitle}>
              Stop fighting self-hosted scanners
            </h2>
            <p className={styles.sectionSub}>
              Stop relying on clunky, self-hosted security software that demands
              dedicated servers, endless patching, and constant manual upkeep.
            </p>
          </div>
          <div className={styles.painsGrid}>
            {PAINS.map((p) => {
              const Icon = p.icon;
              return (
                <article key={p.title} className={styles.painCard}>
                  <div className={styles.painIcon} aria-hidden="true">
                    <Icon />
                  </div>
                  <h3 className={styles.painH3}>{p.title}</h3>
                  <p className={styles.painP}>{p.desc}</p>
                </article>
              );
            })}
          </div>
          <div className={styles.painsFoot}>
            <Link href="#pricing" className={styles.painsFootLink}>
              Skip the setup — see pricing <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Key features ────────────────────────────────────────── */}
      <section className={styles.block} id="features">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Key features</p>
            <h2 className={styles.sectionTitle}>
              Key features driving annual renewals
            </h2>
            <p className={styles.sectionSub}>
              The capabilities that lead security teams, agencies, and IT
              professionals to renew year after year.
            </p>
          </div>
          <div className={styles.featGrid2}>
            {KEY_FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <article key={f.title} className={styles.painCard}>
                  <div className={styles.painIcon} aria-hidden="true">
                    <Icon />
                  </div>
                  <div className={styles.featBody}>
                    <span className={styles.featBadge}>{f.badge}</span>
                    <h3 className={styles.painH3}>{f.title}</h3>
                    <p className={styles.painP}>{f.desc}</p>
                  </div>
                </article>
              );
            })}
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
              Every credit covers one Nmap, one Nuclei, and one OWASP ZAP scan
              against an approved target. Credits don&apos;t expire for 12
              months. No seats, no overages.
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
