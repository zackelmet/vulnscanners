"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/lib/context/AuthContext";
import toast from "react-hot-toast";

/* ─── Pricing data ───────────────────────────────────────── */

interface PricingTier {
  id: string;
  label: string;
  price: string;
  subtitle: string;
  priceId: string;
  features: string[];
  popular?: boolean;
  cta: string;
}

const PRICING_TIERS: PricingTier[] = [
  {
    id: "essential",
    label: "Essential",
    price: "$10",
    subtitle: "10 scan credits",
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
    label: "Pro",
    price: "$50",
    subtitle: "100 scan credits",
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
    label: "Scale",
    price: "$200",
    subtitle: "1,000 scan credits",
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE || "",
    cta: "Get Scale",
    features: [
      "1,000 × Nmap, Nuclei, or ZAP scans",
      "Hosted infrastructure",
      "PDF report export",
      "Dedicated support",
      "Mix scanner types freely",
      "Best value per scan",
    ],
  },
];

/* ─── Data ───────────────────────────────────────────────── */

const scanners = [
  {
    name: "Nmap",
    logo: "/scanners/nmap.png",
    summary:
      "Fast external port and service visibility for attack-surface mapping.",
    highlights: [
      "Internet-facing service inventory",
      "Open port verification",
      "Fast baseline checks",
    ],
  },
  {
    name: "Nuclei",
    logo: "/scanners/nuclei.png",
    summary:
      "Template-based vulnerability detection mapped to current CVE intelligence.",
    highlights: [
      "Continuously updated checks",
      "Actionable finding output",
      "Great for frequent re-testing",
    ],
  },
  {
    name: "OWASP ZAP",
    logo: "/scanners/zap.png",
    summary: "Automated web-layer security baseline for common app-level risk.",
    highlights: [
      "Automated web security baseline",
      "Crawler + passive analysis",
      "Easy report handoff",
    ],
  },
];

const workflow = [
  {
    step: "01",
    title: "Pick scanner + target",
    copy: "Choose Nmap, Nuclei, or ZAP and run against approved assets.",
  },
  {
    step: "02",
    title: "Run in hosted infrastructure",
    copy: "Scans execute in our hosted backend so your team skips scanner setup and maintenance.",
  },
  {
    step: "03",
    title: "Review results + re-test",
    copy: "Confirm findings quickly, fix issues, and rerun scans in minutes.",
  },
];

/* ─── Page ───────────────────────────────────────────────── */

export default function Home() {
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
      const response = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: tier.priceId,
          userId: currentUser.uid,
          email: currentUser.email,
          quantity: 1,
          metadata: { tier: tier.id },
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data.error || "Failed to create checkout session");

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (error: any) {
      console.error("Checkout error:", error);
      toast.error(error.message || "Failed to start checkout");
    } finally {
      setLoadingTier(null);
    }
  };

  return (
    <main className="min-h-screen w-full bg-[rgba(10,10,35,0.92)] text-[--text] relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute inset-8 neon-grid" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 py-16 lg:py-24 space-y-20 lg:space-y-28">
        {/* ── HERO ───────────────────────────────────────── */}
        <section className="relative text-center landing-fade-up pt-6">
          <div className="absolute -top-12 left-1/2 -translate-x-1/2 pointer-events-none opacity-70">
            {/* Symbolic geometric artwork (nodes + links) */}
            <svg
              width="680"
              height="220"
              viewBox="0 0 680 220"
              fill="none"
              aria-hidden
            >
              <defs>
                <linearGradient id="g1" x1="0" x2="1">
                  <stop offset="0" stopColor="var(--primary)" />
                  <stop offset="1" stopColor="var(--secondary)" />
                </linearGradient>
                <filter id="f1" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="6" result="b" />
                  <feMerge>
                    <feMergeNode in="b" />
                    <feMergeNode in="SourceGraphic" />
                  </feMerge>
                </filter>
              </defs>

              <g filter="url(#f1)">
                <line
                  x1="80"
                  y1="160"
                  x2="240"
                  y2="40"
                  stroke="url(#g1)"
                  strokeWidth="2.5"
                  strokeOpacity="0.18"
                />
                <line
                  x1="240"
                  y1="40"
                  x2="420"
                  y2="110"
                  stroke="url(#g1)"
                  strokeWidth="2.5"
                  strokeOpacity="0.18"
                />
                <line
                  x1="420"
                  y1="110"
                  x2="560"
                  y2="30"
                  stroke="url(#g1)"
                  strokeWidth="2.5"
                  strokeOpacity="0.18"
                />
              </g>

              {[
                { x: 80, y: 160 },
                { x: 240, y: 40 },
                { x: 420, y: 110 },
                { x: 560, y: 30 },
              ].map((p, i) => (
                <g key={i} transform={`translate(${p.x},${p.y})`}>
                  <circle
                    r="14"
                    fill="rgba(3,102,214,0.10)"
                    stroke="var(--border-strong)"
                    strokeWidth="1.5"
                  />
                  <circle r="6" fill="var(--primary)" />
                </g>
              ))}
            </svg>
          </div>

          <div className="relative max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-6">
            <div className="inline-flex items-center gap-3 mb-6">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center bg-[rgba(3,102,214,0.10)] border border-[var(--border-strong)]">
                <svg
                  className="w-5 h-5 text-[var(--primary)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <circle cx="12" cy="12" r="3" />
                  <path d="M12 3v2M12 19v2M3 12h2M19 12h2M4.2 4.2l1.4 1.4M18.4 18.4l1.4 1.4M4.2 19.8l1.4-1.4M18.4 5.6l1.4-1.4" />
                </svg>
              </div>
              <div className="badge badge-outline badge-lg gap-2 border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(3,102,214,0.06)]">
                Hosted vulnerability scanning
              </div>
            </div>

            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-tight tracking-tight">
              <span className="neon-hero-title block">
                Deliver security reports
              </span>
              <span className="block text-[var(--text)] text-2xl sm:text-3xl mt-2">
                Engineered for rapid triage and clear remediation
              </span>
            </h1>

            <p className="mt-5 text-base lg:text-lg neon-subtle max-w-2xl mx-auto leading-relaxed">
              Turn raw scanner output into prioritized, evidence-backed
              deliverables — without the maintenance overhead. Run Nmap, Nuclei,
              and ZAP in a single hosted workflow and ship clear reports your
              teams will act on.
            </p>

            <div className="flex items-center justify-center gap-3 mt-6 flex-col sm:flex-row">
              <Link
                href="/login"
                className="btn btn-lg neon-primary-btn border-0 gap-2 text-sm font-bold px-8 w-full sm:w-auto"
              >
                Generate My First Report
              </Link>
              <Link
                href="/app/scans"
                className="btn btn-lg btn-outline border-[var(--primary)] text-[var(--text)] hover:bg-[rgba(3,102,214,0.10)] gap-2 text-sm font-bold px-8 w-full sm:w-auto"
              >
                Open Scanner Console
              </Link>
            </div>

            <div className="flex items-center justify-center gap-2 flex-wrap pt-4">
              {["Nmap", "Nuclei", "OWASP ZAP"].map((n) => (
                <div
                  key={n}
                  className="badge badge-ghost bg-[rgba(255,255,255,0.02)] border-[var(--border)] text-[var(--text-muted)] text-xs"
                >
                  {n}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── SCANNERS ───────────────────────────────────── */}
        <section className="space-y-8 landing-fade-up" id="scanners">
          <div className="text-center space-y-3">
            <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(3,102,214,0.10)] uppercase tracking-widest text-[0.65rem]">
              Three scanners · One workflow
            </div>
            <h2 className="text-3xl lg:text-4xl font-medium neon-section-title">
              Built For Real Security Work
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scanners.map((scanner) => (
              <a
                key={scanner.name}
                href={`/scanners/${scanner.name.toLowerCase().replace("owasp ", "")}`}
                className="card border border-[var(--border-strong)] bg-[rgba(15,22,43,0.8)] shadow-xl landing-card group hover:border-[var(--primary)] transition-colors"
              >
                <div className="card-body p-6 space-y-4">
                  {/* Fixed-height logo zone — same for all cards */}
                  <div className="h-10 flex items-center">
                    <Image
                      src={scanner.logo}
                      alt={`${scanner.name} logo`}
                      width={120}
                      height={40}
                      className="object-contain object-left max-h-9 w-auto"
                    />
                  </div>
                  <h3 className="text-lg font-semibold tracking-tight text-[var(--text)]">
                    {scanner.name}
                  </h3>
                  <p className="text-sm neon-subtle leading-relaxed">
                    {scanner.summary}
                  </p>
                  <div className="divider my-0 before:bg-[var(--border)] after:bg-[var(--border)]" />
                  <ul className="space-y-2 text-sm">
                    {scanner.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-[var(--primary)] shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-[var(--text-muted)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                  <p className="text-xs text-[var(--primary)] mt-2">
                    Learn more →
                  </p>
                </div>
              </a>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────── */}
        <section className="space-y-8 landing-fade-up" id="how-it-works">
          <div className="text-center space-y-3">
            <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(3,102,214,0.10)] uppercase tracking-widest text-[0.65rem]">
              How it works
            </div>
            <h2 className="text-3xl lg:text-4xl font-medium neon-section-title">
              From Target To Deliverable Report In Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
            {workflow.map((item, idx) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center p-6 group"
              >
                {idx < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-gradient-to-r from-[var(--primary)] to-[var(--border)]" />
                )}
                <div className="w-14 h-14 rounded-full border-2 border-[var(--primary)] bg-[rgba(3,102,214,0.12)] flex items-center justify-center text-[var(--primary)] font-black text-lg mb-4 shadow-[0_0_20px_rgba(3,102,214,0.25)] group-hover:shadow-[0_0_30px_rgba(3,102,214,0.45)] transition-shadow">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2 text-[var(--text)]">
                  {item.title}
                </h3>
                <p className="text-sm neon-subtle leading-relaxed max-w-xs">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── PRICING ───────────────────────────────────── */}
        <section className="space-y-10 landing-fade-up" id="pricing">
          <div className="text-center space-y-3">
            <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(3,102,214,0.06)] uppercase tracking-widest text-[0.65rem]">
              Simple pricing
            </div>
            <h2 className="text-3xl lg:text-4xl font-medium neon-section-title">
              Pay Per Scan Credit
            </h2>
            <p className="max-w-xl mx-auto neon-subtle text-sm lg:text-base">
              Buy credits, run scans. No subscriptions, no hidden fees. One
              credit = one scan (Nmap, Nuclei, or ZAP).
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {PRICING_TIERS.map((tier) => (
              <div
                key={tier.id}
                className={`card shadow-xl landing-card relative ${
                  tier.popular
                    ? "border-2 border-[var(--primary)] bg-[rgba(3,102,214,0.08)] shadow-2xl"
                    : "border border-[var(--border-strong)] bg-[rgba(15,22,43,0.8)]"
                }`}
              >
                {tier.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <span className="bg-[#0366d6] text-white text-xs font-bold px-3 py-1 rounded-full">
                      Most popular
                    </span>
                  </div>
                )}
                <div className="card-body p-7 space-y-5">
                  <div>
                    <p
                      className={`text-xs uppercase tracking-widest mb-1 ${tier.popular ? "text-[var(--primary)]" : "text-[var(--text-muted)]"}`}
                    >
                      {tier.label}
                    </p>
                    <p className="text-4xl font-black text-[var(--text)]">
                      {tier.price}
                    </p>
                    <p className="text-sm neon-subtle mt-1">{tier.subtitle}</p>
                  </div>
                  <ul className="space-y-2 text-sm">
                    {tier.features.map((f) => (
                      <li key={f} className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-[var(--primary)] shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-[var(--text-muted)]">{f}</span>
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => handleCheckout(tier)}
                    disabled={loadingTier === tier.id}
                    className={`btn w-full disabled:opacity-60 disabled:cursor-not-allowed ${
                      tier.popular
                        ? "neon-primary-btn border-0"
                        : "btn-outline border-[var(--primary)] text-[var(--text)] hover:bg-[rgba(3,102,214,0.1)]"
                    }`}
                  >
                    {loadingTier === tier.id ? "Loading…" : tier.cta}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ─────────────────────────────────── */}
        <section
          className="landing-fade-up rounded-3xl border border-[var(--border-strong)] bg-gradient-to-br from-[rgba(3,102,214,0.06)] to-[rgba(37,99,235,0.06)] p-8 lg:p-14 text-center space-y-6 shadow-[0_0_60px_rgba(3,102,214,0.12)]"
          id="cta"
        >
          <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(3,102,214,0.10)] uppercase tracking-widest text-[0.65rem]">
            Ready to run your first scan?
          </div>
          <h2 className="text-3xl lg:text-4xl font-semibold tracking-tight neon-hero-title">
            Start Delivering Better Security Reports
          </h2>
          <p className="max-w-xl mx-auto neon-subtle text-sm lg:text-base leading-relaxed">
            Unified web app. Three scanners. Evidence-backed output your team
            can triage, fix, and verify.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
            <Link
              href="/login"
              className="btn btn-lg neon-primary-btn border-0 gap-2 text-sm font-bold px-8 w-full sm:w-auto"
            >
              Create Account
            </Link>
            <Link
              href="/app/scans"
              className="btn btn-lg btn-outline border-[var(--primary)] text-[var(--text)] hover:bg-[rgba(3,102,214,0.12)] hover:border-[var(--primary)] gap-2 text-sm font-bold px-8 w-full sm:w-auto"
            >
              Go To Scanner Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
