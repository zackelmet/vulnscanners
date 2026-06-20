"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import toast from "react-hot-toast";
import { useAuth } from "@/lib/context/AuthContext";
import SampleReportForm from "@/components/landing/SampleReportForm";
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

function XIcon() {
  return (
    <svg
      width="13"
      height="13"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M3.5 3.5l7 7M10.5 3.5l-7 7"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 4h7l9 9-7 7-9-9V4Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <circle cx="8" cy="8" r="1.4" fill="currentColor" />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="6" cy="12" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18" cy="6" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="18" cy="18" r="2.4" stroke="currentColor" strokeWidth="1.4" />
      <path
        d="M8.1 10.9l7.8-3.8M8.1 13.1l7.8 3.8"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function GrowthIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 19h16M5 16l4-5 3.5 3L19 7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M15 7h4v4"
        stroke="currentColor"
        strokeWidth="1.4"
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

function DocIcon() {
  return (
    <svg
      width="22"
      height="22"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M6 3h7l5 5v13H6V3Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M13 3v5h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
      />
      <path
        d="M9 13h6M9 16.5h6"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Platform value cards — framed for the MSP/MSSP ICP (resell scans + reports to
// SMB clients). Operational angle (what you get day to day); the growth/branding
// angle lives in the "For managed providers" section, compliance in its own.
const CAPABILITIES = [
  {
    icon: DocIcon,
    badge: "Deliverables",
    title: "Client-ready reports, not raw output",
    sub: "Branded, severity-ranked PDFs",
    desc: "Every scan becomes a report your client can actually read — findings ranked by severity with plain-English remediation. White-label it and forward it.",
  },
  {
    icon: CoinsIcon,
    badge: "Per-scan pricing",
    title: "A fraction of enterprise tooling",
    sub: "Pay per scan, no annual contract",
    desc: "Cover every client target for cents a scan — no $4k/yr Nessus seat or Qualys contract to spread across your book.",
  },
  {
    icon: ServerIcon,
    badge: "Fully hosted",
    title: "Nothing to install or maintain",
    sub: "We run the scanners, you pick targets",
    desc: "Hosted on tuned, continuously-updated servers. No appliances, no patching, no VM to babysit between engagements.",
  },
  {
    icon: NetworkIcon,
    badge: "Built for your book",
    title: "Run it across every client",
    sub: "One console, many targets",
    desc: "Scan and report for all your clients from one place. Onboard a new account in minutes instead of provisioning another tool.",
  },
  {
    icon: BugIcon,
    badge: "Full coverage",
    title: "Web, network, and CVE in one",
    sub: "Nmap + Nuclei + OWASP ZAP",
    desc: "Three battle-tested engines security pros trust — open ports and services, template-based CVE detection, and web-app DAST — across one workflow.",
  },
  {
    icon: BoltIcon,
    badge: "Fast turnaround",
    title: "Scan to report in minutes",
    sub: "Not a day in a console",
    desc: "Kick off a scan and get a finished, deliverable report back in minutes — fast enough to run during the client call.",
  },
];

// Key-features showcase items (bullets shown beside the product screenshots).
const KEY_FEATURES = [
  {
    title: "Attack Surface Discovery",
    desc: "Identify forgotten assets and poorly maintained endpoints. Complete network visibility for both Red and Blue Teams.",
  },
  {
    title: "Zero Installation",
    desc: "Fully hosted service with nothing to install or maintain. Launch scans whenever you need, from anywhere.",
  },
  {
    title: "Continuous Vulnerability Management",
    desc: "Nuclei and Nmap scans for ongoing vulnerability detection and firewall monitoring.",
  },
  {
    title: "Intuitive Interface",
    desc: "Launch comprehensive vulnerability scans with a simple form. Select your options and receive detailed results.",
  },
  {
    title: "Deliverable Reports",
    desc: "Every scan generates a branded, client-ready PDF report — share findings with clients, auditors, and stakeholders without extra work.",
  },
];

// Direct quotes from the compliance frameworks that mandate continuous
// vulnerability scanning — the thing VulnScanners automates.
const COMPLIANCE_QUOTES = [
  {
    id: "cis",
    text: "Continuously acquire, assess, and take action on new information in order to identify vulnerabilities, remediate, and minimize the window of opportunity for attackers.",
    source: "Center for Internet Security",
    detail: "Control 4: Continuous Vulnerability Assessment & Remediation",
    logo: "/images/compliance/cis.svg",
  },
  {
    id: "pci",
    text: "Run internal and external network vulnerability scans at least quarterly and after any significant change in the network.",
    source: "PCI DSS",
    detail: "Requirement 11.2",
    logo: "/images/compliance/pci.svg",
  },
  {
    id: "nist",
    text: "Monitor and scan for vulnerabilities in the system and hosted applications, and when new vulnerabilities potentially affecting the system are identified and reported.",
    source: "NIST SP 800-53",
    detail: "RA-5: Vulnerability Monitoring & Scanning",
    logo: "/images/compliance/nist.svg",
  },
  {
    id: "sans",
    text: "Organizations that do not scan for vulnerabilities and address discovered flaws pro-actively face a significant likelihood of having their computer systems compromised.",
    source: "SANS",
    detail: "Critical Security Control 4",
    logo: "/images/compliance/sans.svg",
  },
];

// "As featured in" press/credibility logos (ported from the prior site). Each
// logo gracefully hides if its file is missing.
const FEATURED_IN = [
  {
    name: "Hacker News",
    href: "https://news.ycombinator.com/item?id=46836846",
    logo: "/images/featured/hacker-news.png",
  },
  {
    name: "Product Hunt",
    href: "https://www.producthunt.com",
    logo: "/images/featured/product-hunt.png",
  },
  {
    name: "X",
    href: "https://x.com/vuln_scanners",
    logo: "/images/featured/x.png",
  },
  {
    name: "G2",
    href: "https://www.g2.com/products/hosted-security-scanners/reviews",
    logo: "/images/featured/g2.png",
  },
  {
    name: "Enterprise Cybersecurity Expo",
    href: "https://www.enterprisecybersecurityexpo.com/",
    logo: "/images/featured/enterprise-cybersecurity-expo.webp",
  },
];

const PAINS = [
  {
    icon: CoinsIcon,
    title: "High Hidden Costs",
    desc: "Licenses, servers, power, cooling and the engineer stuck babysitting scanner uptime — all add invisible, recurring costs.",
  },
  {
    icon: BugIcon,
    title: "Outdated Threat Coverage",
    desc: "Missed patches and stale feeds mean critical vulnerabilities go undetected until it's too late.",
  },
  {
    icon: HourglassIcon,
    title: "Wasted Time & Focus",
    desc: "Security teams get pulled into infrastructure firefights instead of triaging and fixing real vulnerabilities.",
  },
];

/* ── Comparison table ────────────────────────────────────────────── */
// Cell values: true = ✓, false = ✗, string = literal text (shown muted unless
// it's our column). Competitor rows describe their model, not exact pricing, to
// stay accurate as their plans change.
type Cell = boolean | string;
const COMPARE_COLS = ["VulnScanners", "Nessus", "Qualys", "Intruder"] as const;
const COMPARE_ROWS: { label: string; cells: Cell[] }[] = [
  {
    label: "Fully hosted — nothing to install",
    cells: [true, false, "Agent / appliance", true],
  },
  {
    label: "Nmap + Nuclei + OWASP ZAP in one console",
    cells: [true, false, false, false],
  },
  {
    label: "Client-ready, branded PDF reports",
    cells: [true, "Raw export", "Raw export", true],
  },
  {
    label: "Pay per scan — no annual contract",
    cells: [true, false, false, false],
  },
  {
    label: "Billing model",
    cells: [
      "Credits from $10",
      "Annual license",
      "Enterprise quote",
      "Monthly subscription",
    ],
  },
  {
    label: "Time to first report",
    cells: ["~4 minutes", "Hours", "Days", "~Minutes"],
  },
  {
    label: "Built for MSP multi-client work",
    cells: [true, "Limited", "Limited", "Limited"],
  },
];

/* ── MSP value props (under pricing) ─────────────────────────────── */
const MSP_VALUE = [
  {
    icon: TagIcon,
    title: "White-label every report",
    desc: "Put your own logo on the PDF. Your client sees your brand — a quiet “Powered by VulnScanners” is the only thing that points back to us.",
    cta: { label: "Ask about white-label", href: "/mssp" },
  },
  {
    icon: ShareIcon,
    title: "Partner & referral program",
    desc: "Refer another provider and earn scan credits or reseller margin. Your network becomes a channel.",
    cta: { label: "Join the partner program", href: "/mssp" },
  },
  {
    icon: ShieldIcon,
    title: "Pass the audits you already face",
    desc: "Cyber-insurance, CMMC, SOC 2 and vendor questionnaires all expect continuous scanning. Hand auditors the evidence in one file.",
    cta: { label: "See compliance coverage", href: "#compliance" },
  },
  {
    icon: GrowthIcon,
    title: "Start with one client, scale to your book",
    desc: "Begin on a $10 pack for a single client, then roll the same console across every account you manage.",
    cta: { label: "See pricing", href: "#pricing" },
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

  // ROI calculator — hours/dollars saved vs. running and formatting scans by hand.
  // Conservative defaults so the headline number is believable, not aspirational.
  const [roiReports, setRoiReports] = useState(3); // client reports / month
  const [roiRate, setRoiRate] = useState(100); // your billable rate ($/hr)
  const HOURS_SAVED_PER_REPORT = 3; // manual scan + cleanup + formatting
  const COST_PER_REPORT = 0.51; // ~3 scans (nmap+nuclei+zap) at Pro pricing
  const roiHours = roiReports * HOURS_SAVED_PER_REPORT;
  const roiValue = roiHours * roiRate;
  const roiCost = Math.round(roiReports * COST_PER_REPORT);
  const roiNet = Math.max(0, roiValue - roiCost);
  const fmt = (n: number) => n.toLocaleString("en-US");

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
              Log in and start scanning.
            </span>
            <h1 className={styles.heroH1}>
              Hand your client a security report.
              <br />
              <span className={styles.heroH1Accent}>Built in 4 minutes.</span>
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
              <Link href="#scanners" className={styles.heroCtaSub}>
                or see the scanners
              </Link>
            </div>
          </div>

          <div className={styles.reportViewer}>
            <div className={styles.rvBar}>
              <span className={styles.rvDots} aria-hidden="true">
                <i />
                <i />
                <i />
              </span>
              <span className={styles.rvTitle}>
                juice-shop.demo-labs.net — Vulnerability Assessment.pdf
              </span>
              <span className={styles.rvPages}>scroll ↓</span>
            </div>
            <div className={styles.rvScroll}>
              {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={n}
                  className={styles.rvPage}
                  src={`/sample-report/pg-0${n}.png`}
                  alt={`Sample VulnScanners report — page ${n}`}
                  loading={n <= 2 ? "eager" : "lazy"}
                />
              ))}
            </div>
            <div className={styles.rvFade} aria-hidden="true" />
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

      {/* ── As featured in ──────────────────────────────────────── */}
      <section className={styles.featured}>
        <div className={styles.container}>
          <p className={styles.featuredLabel}>As featured in</p>
          <div className={styles.featuredRow}>
            {FEATURED_IN.map((f) => (
              <a
                key={f.name}
                href={f.href}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.featuredItem}
                aria-label={f.name}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={f.logo}
                  alt={f.name}
                  className={styles.featuredLogo}
                  onError={(e) => {
                    (
                      e.currentTarget.parentElement as HTMLElement
                    ).style.display = "none";
                  }}
                />
              </a>
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
              One platform to scan every client — and ship the report.
            </h2>
            <p className={styles.sectionSub}>
              Hosted Nmap, Nuclei, and OWASP ZAP. Pick a client target and hand
              them a branded, deliverable report in minutes.
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

      {/* ── Key features (screenshot showcase) ──────────────────── */}
      <section className={styles.block} id="features">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Key features</p>
            <h2 className={styles.sectionTitle}>
              Everything you need to scan and report.
            </h2>
          </div>
          <div className={styles.kfGrid}>
            <ul className={styles.kfList}>
              {KEY_FEATURES.map((f) => (
                <li key={f.title} className={styles.kfItem}>
                  <CheckIcon />
                  <div>
                    <h3 className={styles.kfItemTitle}>{f.title}</h3>
                    <p className={styles.kfItemDesc}>{f.desc}</p>
                  </div>
                </li>
              ))}
            </ul>
            {/* Placeholder product screenshots — swap for current VS captures. */}
            <div className={styles.kfMedia}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                className={styles.kfImgMain}
                src="/images/screenshots/dashboard.png"
                alt="VulnScanners console — dashboard overview"
                loading="lazy"
              />
              <div className={styles.kfImgRow}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.kfImgSmall}
                  src="/images/screenshots/targets-newscan.png"
                  alt="VulnScanners — configuring a new scan"
                  loading="lazy"
                />
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className={styles.kfImgSmall}
                  src="/images/screenshots/targets-scanhistory.png"
                  alt="VulnScanners — scan history"
                  loading="lazy"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Compliance mandate (framework quotes) ───────────────── */}
      <section className={styles.block} id="compliance">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>Compliance</p>
            <h2 className={styles.sectionTitle}>
              Continuous scanning isn&apos;t optional.
            </h2>
            <p className={styles.sectionSub}>
              The frameworks your customers and auditors hold you to already
              require exactly what VulnScanners automates.
            </p>
          </div>
          <div className={styles.quoteGrid}>
            {COMPLIANCE_QUOTES.map((q) => (
              <figure key={q.id} className={styles.quoteCard}>
                {q.logo && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={q.logo}
                    alt={`${q.source} logo`}
                    className={styles.quoteLogo}
                    onError={(e) => {
                      (e.currentTarget as HTMLImageElement).style.display =
                        "none";
                    }}
                  />
                )}
                <blockquote className={styles.quoteText}>
                  &ldquo;{q.text}&rdquo;
                </blockquote>
                <figcaption className={styles.quoteCite}>
                  <span className={styles.quoteCiteSrc}>{q.source}</span>
                  {` — ${q.detail}`}
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ── Comparison table ────────────────────────────────────── */}
      <section className={styles.block} id="compare">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>How we compare</p>
            <h2 className={styles.sectionTitle}>
              Why teams switch to VulnScanners.
            </h2>
            <p className={styles.sectionSub}>
              The legacy scanners were built for enterprise security teams with
              servers to spare — not for delivering a clean report to a client
              today.
            </p>
          </div>

          <div className={styles.cmpWrap}>
            <table className={styles.cmpTable}>
              <thead>
                <tr>
                  <th className={styles.cmpRowHead} aria-hidden="true" />
                  {COMPARE_COLS.map((col, i) => (
                    <th
                      key={col}
                      className={`${styles.cmpColHead}${i === 0 ? ` ${styles.cmpColUs}` : ""}`}
                    >
                      {col}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label}>
                    <th scope="row" className={styles.cmpRowHead}>
                      {row.label}
                    </th>
                    {row.cells.map((cell, i) => (
                      <td
                        key={i}
                        className={`${styles.cmpCell}${i === 0 ? ` ${styles.cmpColUs}` : ""}`}
                      >
                        {cell === true ? (
                          <span className={styles.cmpYes}>
                            <CheckIcon />
                          </span>
                        ) : cell === false ? (
                          <span className={styles.cmpNo}>
                            <XIcon />
                          </span>
                        ) : (
                          <span
                            className={
                              i === 0 ? styles.cmpTextUs : styles.cmpText
                            }
                          >
                            {cell}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
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
              against an approved target. Credits never expire. No seats, no
              overages.
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

          <div className={styles.msspNote}>
            <p className={styles.msspNoteText}>
              <strong>MSP or MSSP?</strong> We offer volume pricing for managed
              providers running our hosted scanners across multiple clients.
            </p>
            <Link href="/mssp" className={styles.msspNoteLink}>
              Request a meeting <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>

      {/* ── For MSPs (white-label, referral, compliance, ROI, expand) ── */}
      <section className={styles.block} id="for-msps">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>For managed providers</p>
            <h2 className={styles.sectionTitle}>
              Built to grow with your client book.
            </h2>
            <p className={styles.sectionSub}>
              Every report you ship is branded as yours, every audit gets its
              evidence, and every client you add costs you minutes — not another
              server to babysit.
            </p>
          </div>

          {/* ROI calculator */}
          <div className={styles.roiPanel}>
            <div className={styles.roiControls}>
              <p className={styles.roiKicker}>ROI calculator</p>
              <h3 className={styles.roiTitle}>
                Do the math on your own client load.
              </h3>
              <label className={styles.roiField}>
                <span className={styles.roiLabelRow}>
                  <span className={styles.roiLabel}>
                    Client reports / month
                  </span>
                  <span className={styles.roiValueTag}>{roiReports}</span>
                </span>
                <input
                  type="range"
                  min={1}
                  max={200}
                  value={roiReports}
                  onChange={(e) => setRoiReports(Number(e.target.value))}
                  className={styles.roiRange}
                  aria-label="Client reports per month"
                />
              </label>
              <label className={styles.roiField}>
                <span className={styles.roiLabelRow}>
                  <span className={styles.roiLabel}>Your billable rate</span>
                  <span className={styles.roiValueTag}>${roiRate}/hr</span>
                </span>
                <input
                  type="range"
                  min={50}
                  max={400}
                  step={10}
                  value={roiRate}
                  onChange={(e) => setRoiRate(Number(e.target.value))}
                  className={styles.roiRange}
                  aria-label="Your billable hourly rate"
                />
              </label>
            </div>
            <div className={styles.roiResult}>
              <p className={styles.roiBigLabel}>Value recovered every month</p>
              <p className={styles.roiBig}>${fmt(roiNet)}</p>
              <ul className={styles.roiBreak}>
                <li>
                  <strong>{fmt(roiHours)} hrs</strong> of manual scanning &amp;
                  formatting saved
                </li>
                <li>
                  <strong>${fmt(roiCost)}</strong> in scan credits to deliver
                  them
                </li>
              </ul>
              <p className={styles.roiFine}>
                Assumes ~3 hours saved per report. Slide to your real numbers.
              </p>
            </div>
          </div>

          {/* Value cards */}
          <div className={styles.msvGrid}>
            {MSP_VALUE.map((v) => {
              const Icon = v.icon;
              return (
                <article key={v.title} className={styles.msvCard}>
                  <div className={styles.msvIcon} aria-hidden="true">
                    <Icon />
                  </div>
                  <h3 className={styles.msvTitle}>{v.title}</h3>
                  <p className={styles.msvDesc}>{v.desc}</p>
                  <Link href={v.cta.href} className={styles.msvLink}>
                    {v.cta.label} <ArrowIcon />
                  </Link>
                </article>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── Sample report lead magnet ───────────────────────────── */}
      <section className={styles.block} id="sample-report">
        <div className={styles.container}>
          <div className={styles.sectionHead}>
            <p className={styles.sectionKicker}>See the deliverable</p>
            <h2 className={styles.sectionTitle}>
              See a real report before you sign up.
            </h2>
            <p className={styles.sectionSub}>
              A combined Nmap, Nuclei &amp; OWASP ZAP assessment — executive
              summary, severity breakdown, and detailed findings with business
              impact, remediation, and copy-paste verification steps. Enter your
              work email and we&apos;ll send the full PDF to your inbox.
            </p>
          </div>

          <div className={styles.sampleShowcase}>
            <div className={styles.samplePreview} aria-hidden="true">
              {[
                {
                  src: "/images/sample-report/page-1.webp",
                  alt: "Sample report cover",
                },
                {
                  src: "/images/sample-report/page-2.webp",
                  alt: "Sample report executive summary",
                },
                {
                  src: "/images/sample-report/page-3.webp",
                  alt: "Sample report findings by target",
                },
                {
                  src: "/images/sample-report/page-4.webp",
                  alt: "Sample report finding detail",
                },
              ].map((p) => (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  key={p.src}
                  src={p.src}
                  alt={p.alt}
                  className={styles.samplePage}
                  loading="lazy"
                />
              ))}
            </div>
            <div className={styles.sampleGate}>
              <SampleReportForm />
            </div>
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
              Start scanning <ArrowIcon />
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
