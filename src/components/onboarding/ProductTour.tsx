"use client";

// First-run product tour. Self-contained (no deps): a dimmed spotlight overlay
// plus a tooltip card that walks a new user through the app once. Steps anchor
// to elements via [data-tour="<id>"]; mounted once in DashboardLayout. "Seen"
// state is persisted per-user in localStorage so it only shows on first login.

import { useCallback, useEffect, useState } from "react";
import { useAuth } from "@/lib/context/AuthContext";

interface TourStep {
  /** [data-tour] id to spotlight, or null for a centered card. */
  tour: string | null;
  title: string;
  body: string;
}

const STEPS: TourStep[] = [
  {
    tour: null,
    title: "Welcome to VulnScanners 👋",
    body: "Here’s a 30-second tour: scan a target and hand your client a report. You can skip anytime.",
  },
  {
    tour: "targets",
    title: "1. Add a target",
    body: "Add the domains or IPs you’re authorized to scan. Every scan runs against an approved target.",
  },
  {
    tour: "launch",
    title: "2. Launch a scan",
    body: "Run Nmap, Nuclei, or OWASP ZAP against a target — fully hosted, nothing to install.",
  },
  {
    tour: "history",
    title: "3. Track progress",
    body: "Watch running scans and browse completed ones in Scan History.",
  },
  {
    tour: "reports",
    title: "4. Download reports",
    body: "Export client-ready, branded PDF reports from every completed scan.",
  },
  {
    tour: "credits",
    title: "5. Credits",
    body: "Each credit covers one scan. Top up here whenever you need more.",
  },
  {
    tour: "dashboard",
    title: "You’re all set 🚀",
    body: "Start by adding your first target. Need a hand? The Help Center is in the sidebar.",
  },
];

const STORAGE_PREFIX = "vs_producttour_v1_";
const PAD = 6;
const CARD_W = 320;
const CARD_EST_H = 250;
const MARGIN = 16;

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

export default function ProductTour({ force = false }: { force?: boolean }) {
  const { currentUser } = useAuth();
  const [active, setActive] = useState(false);
  const [idx, setIdx] = useState(0);
  const [rect, setRect] = useState<Rect | null>(null);

  const storageKey = currentUser
    ? `${STORAGE_PREFIX}${currentUser.uid}`
    : force
      ? `${STORAGE_PREFIX}preview`
      : null;

  // Auto-start once per user on first login (when not previously seen). The
  // localStorage "seen" check also makes this safe to re-run (e.g. StrictMode's
  // double-invoke, or the user object loading in after mount).
  useEffect(() => {
    if (!storageKey) return;
    let seen = false;
    try {
      seen = force ? false : localStorage.getItem(storageKey) === "1";
    } catch {
      seen = false;
    }
    if (seen) return;
    // Let the dashboard layout settle before measuring.
    const t = setTimeout(() => {
      setIdx(0);
      setActive(true);
    }, 650);
    return () => clearTimeout(t);
  }, [storageKey, force]);

  const finish = useCallback(() => {
    setActive(false);
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, "1");
      } catch {
        /* ignore */
      }
    }
  }, [storageKey]);

  const step = STEPS[idx];
  const isLast = idx === STEPS.length - 1;
  const isDesktop = typeof window !== "undefined" && window.innerWidth >= 1024;

  // Measure the spotlighted element for the current step.
  const measure = useCallback(() => {
    if (!active) return;
    const target = step?.tour;
    if (!target || !isDesktop) {
      setRect(null);
      return;
    }
    const el = document.querySelector<HTMLElement>(`[data-tour="${target}"]`);
    if (!el) {
      setRect(null);
      return;
    }
    const r = el.getBoundingClientRect();
    if (r.width === 0 || r.height === 0) {
      setRect(null);
      return;
    }
    setRect({ top: r.top, left: r.left, width: r.width, height: r.height });
  }, [active, step, isDesktop]);

  useEffect(() => {
    if (!active) return;
    // rAF so the new step's target is laid out before measuring.
    const raf = requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [active, idx, measure]);

  // Keyboard: Esc skips, arrows navigate.
  useEffect(() => {
    if (!active) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") finish();
      else if (e.key === "ArrowRight")
        setIdx((i) => Math.min(i + 1, STEPS.length - 1));
      else if (e.key === "ArrowLeft") setIdx((i) => Math.max(i - 1, 0));
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, finish]);

  if (!active) return null;

  const vw = typeof window !== "undefined" ? window.innerWidth : 1280;
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;

  // Card placement: to the right of a spotlighted (sidebar) element, else centered.
  let cardStyle: React.CSSProperties;
  if (rect) {
    const left = Math.min(rect.left + rect.width + 16, vw - CARD_W - MARGIN);
    // Lower-half targets: grow the card upward so it never runs off the bottom.
    const rawTop =
      rect.top > vh / 2 ? rect.top + rect.height - CARD_EST_H : rect.top - 8;
    const top = Math.min(Math.max(rawTop, MARGIN), vh - CARD_EST_H - MARGIN);
    cardStyle = { position: "fixed", top, left, width: CARD_W };
  } else {
    cardStyle = {
      position: "fixed",
      top: "50%",
      left: "50%",
      width: CARD_W,
      transform: "translate(-50%, -50%)",
    };
  }

  return (
    <div className="fixed inset-0 z-[60]" aria-live="polite" role="dialog">
      {/* Click catcher / dimmer (used when there is no spotlight). */}
      <div
        className={`absolute inset-0 ${rect ? "" : "bg-black/65"}`}
        aria-hidden="true"
      />

      {/* Spotlight ring with a giant box-shadow that dims everything else. */}
      {rect && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-[10px]"
          style={{
            top: rect.top - PAD,
            left: rect.left - PAD,
            width: rect.width + PAD * 2,
            height: rect.height + PAD * 2,
            border: "2px solid #4493f8",
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.65)",
            transition:
              "top 200ms ease, left 200ms ease, width 200ms ease, height 200ms ease",
          }}
        />
      )}

      {/* Tooltip card */}
      <div
        style={cardStyle}
        className="z-[62] rounded-xl border border-[#1f2632] bg-[#0d1117] p-5 shadow-2xl"
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-mono text-[11px] tracking-wide text-[#697080]">
            {idx + 1} / {STEPS.length}
          </span>
          <button
            type="button"
            onClick={finish}
            className="text-xs text-[#697080] transition-colors hover:text-[#e6edf5]"
          >
            Skip tour
          </button>
        </div>

        <h3 className="mb-1.5 text-[15px] font-semibold text-[#e6edf5]">
          {step.title}
        </h3>
        <p className="mb-4 text-[13px] leading-relaxed text-[#9aa5b6]">
          {step.body}
        </p>

        {/* Progress dots */}
        <div className="mb-4 flex gap-1.5">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === idx ? "w-5 bg-[#4493f8]" : "w-1.5 bg-[#1f2632]"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => setIdx((i) => Math.max(i - 1, 0))}
            disabled={idx === 0}
            className="text-[13px] font-medium text-[#9aa5b6] transition-colors hover:text-[#e6edf5] disabled:cursor-not-allowed disabled:opacity-30"
          >
            Back
          </button>
          <button
            type="button"
            onClick={() => (isLast ? finish() : setIdx((i) => i + 1))}
            className="rounded-lg bg-[#0366d6] px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-[#034ea1]"
          >
            {isLast ? "Get started" : "Next"}
          </button>
        </div>
      </div>
    </div>
  );
}
