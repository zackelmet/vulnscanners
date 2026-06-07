"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faXmark,
  faSpinner,
  faCalendarCheck,
  faArrowRight,
  faFileLines,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";
import { useUserData } from "@/lib/hooks/useUserData";
import { useAuth } from "@/lib/context/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

/* ─── Credit packs ───────────────────────────────────────── */

interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  priceId: string;
}

const CREDIT_PACKS: CreditPack[] = [
  { id: "essential", name: "Essential", price: 10, credits: 10, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL || "" },
  { id: "pro", name: "Pro", price: 50, credits: 100, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "" },
  { id: "scale", name: "Scale", price: 200, credits: 1000, priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE || "" },
];

/* ─── Severity UI (dark theme) ───────────────────────────── */

type Sev = "critical" | "high" | "medium" | "low" | "info" | "accepted";

const SEV_UI: Record<
  Sev | "closed",
  { label: string; color: string; bg: string; border: string }
> = {
  critical: { label: "Critical", color: "#e879f9", bg: "rgba(192,38,211,0.12)", border: "rgba(192,38,211,0.35)" },
  high: { label: "High", color: "#f87171", bg: "rgba(239,68,68,0.12)", border: "rgba(239,68,68,0.35)" },
  medium: { label: "Medium", color: "#fbbf24", bg: "rgba(245,158,11,0.12)", border: "rgba(245,158,11,0.30)" },
  low: { label: "Low", color: "#eab308", bg: "rgba(234,179,8,0.10)", border: "rgba(234,179,8,0.28)" },
  info: { label: "Info", color: "#9ca3af", bg: "rgba(156,163,175,0.10)", border: "rgba(156,163,175,0.22)" },
  accepted: { label: "Accepted", color: "#34d399", bg: "rgba(34,197,94,0.12)", border: "rgba(34,197,94,0.30)" },
  closed: { label: "Closed", color: "#9aa5b6", bg: "rgba(154,165,182,0.06)", border: "#161b24" },
};

interface DashboardData {
  riskCounts: Record<Sev, number>;
  totalRisks: number;
  closed: number;
  healthScore: number;
  grade: string;
  inProgress: number;
  scheduled: number;
  recentScans: {
    scanId: string;
    label: string;
    target: string;
    status: string;
    completedAtMs: number | null;
  }[];
  recentRisks: { title: string; severity: Sev; scannerType: string; target: string }[];
  targets: { target: string; total: number }[];
  totalTargets: number;
}

function timeAgo(ms: number | null): string {
  if (!ms) return "—";
  const s = Math.max(1, Math.floor((Date.now() - ms) / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

/* ─── Health gauge (semicircular) ────────────────────────── */

function HealthGauge({ score, grade }: { score: number; grade: string }) {
  const cx = 110,
    cy = 110,
    r = 90;
  const polar = (frac: number) => {
    const angle = Math.PI * (1 - frac); // 0 → left (π), 1 → right (0)
    return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
  };
  const start = polar(0);
  const end = polar(score / 100);
  const full = polar(1);
  const gradeColor =
    score >= 75 ? "#34d399" : score >= 60 ? "#eab308" : score >= 40 ? "#f59e0b" : "#f87171";
  return (
    <svg viewBox="0 0 220 130" width="220" height="130">
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${full.x} ${full.y}`}
        fill="none"
        stroke="#1b2230"
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d={`M ${start.x} ${start.y} A ${r} ${r} 0 0 1 ${end.x} ${end.y}`}
        fill="none"
        stroke={gradeColor}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <text x={cx} y={cy - 14} textAnchor="middle" fontSize="40" fontWeight="700" fill={gradeColor}>
        {grade}
      </text>
      <text x={cx} y={cy + 6} textAnchor="middle" fontSize="11" fill="#9aa5b6">
        Health Score
      </text>
      <text x={20} y={128} fontSize="9" fill="#697080">
        0
      </text>
      <text x={196} y={128} fontSize="9" fill="#697080">
        100
      </text>
    </svg>
  );
}

/* ─── Page ───────────────────────────────────────────────── */

export default function DashboardPage() {
  const { userData } = useUserData();
  const { currentUser } = useAuth();

  const [data, setData] = useState<DashboardData | null>(null);
  const [loadingData, setLoadingData] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedPack, setSelectedPack] = useState<CreditPack>(CREDIT_PACKS[1]);
  const [loadingCheckout, setLoadingCheckout] = useState(false);

  const credits = useMemo(
    () => ({
      nmap: userData?.scanCredits?.nmap ?? 0,
      nuclei: userData?.scanCredits?.nuclei ?? 0,
      zap: userData?.scanCredits?.zap ?? 0,
    }),
    [userData],
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (!cancelled && res.ok) setData(json);
      } catch {
        /* leave data null → empty state */
      } finally {
        if (!cancelled) setLoadingData(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [currentUser]);

  const openModal = (pack: CreditPack = CREDIT_PACKS[1]) => {
    setSelectedPack(pack);
    setShowModal(true);
  };

  const handleCheckout = async () => {
    if (!currentUser) {
      window.location.href = "/login";
      return;
    }
    if (!selectedPack.priceId) {
      toast.error("Pricing not configured — contact support.");
      return;
    }
    setLoadingCheckout(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          priceId: selectedPack.priceId,
          email: currentUser.email,
          quantity: 1,
          metadata: { tier: selectedPack.id },
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to create session");
      if (json.url) window.location.href = json.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingCheckout(false);
    }
  };

  const riskCards: Sev[] = ["critical", "high", "medium", "low", "info"];

  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <PurchaseParamHandler openModal={() => openModal()} />
      </Suspense>

      <div className="p-6 lg:p-8 max-w-7xl mx-auto bg-[#07090d] min-h-screen">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 mb-8">
          <h1 className="text-3xl font-light text-[#e6edf5]">Dashboard</h1>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#161b24] text-sm text-[#9aa5b6]">
              <FontAwesomeIcon
                icon={faSpinner}
                className={`text-xs ${data?.inProgress ? "text-[#4493f8] animate-spin" : "text-[#697080]"}`}
              />
              {data?.inProgress ?? 0} scans in progress
            </span>
            <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#0d1117] border border-[#161b24] text-sm text-[#9aa5b6]">
              <FontAwesomeIcon icon={faCalendarCheck} className="text-xs text-[#697080]" />
              {data?.scheduled ?? 0} scans scheduled
            </span>
            <Link
              href="/app/scans"
              className="inline-flex items-center gap-2 px-4 py-1.5 rounded-lg bg-[#0366d6] hover:bg-[#4493f8] text-white text-sm font-medium transition-colors"
            >
              <FontAwesomeIcon icon={faPlus} className="text-xs" /> New Scan
            </Link>
          </div>
        </div>

        {/* Credits strip */}
        <div className="flex flex-wrap items-center gap-3 mb-8 px-4 py-3 rounded-xl bg-[#0d1117] border border-[#161b24]">
          <span className="text-sm text-[#697080] mr-1">Scan credits</span>
          {(["nmap", "nuclei", "zap"] as const).map((k) => (
            <span key={k} className="text-sm text-[#e6edf5]">
              <span className="uppercase text-[#697080] text-xs mr-1.5">{k}</span>
              {credits[k]}
            </span>
          ))}
          <button
            onClick={() => openModal()}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0366d6]/10 hover:bg-[#0366d6]/25 border border-[#0366d6]/40 text-sm font-medium text-[#4493f8] transition-colors"
          >
            Buy Credits <FontAwesomeIcon icon={faPlus} className="text-xs" />
          </button>
        </div>

        {/* Health + Risks */}
        <div className="grid lg:grid-cols-2 gap-6 mb-6">
          {/* Health score */}
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
            <h2 className="text-sm font-medium text-[#9aa5b6] mb-4">Health Score</h2>
            <div className="flex items-center gap-6">
              <HealthGauge score={data?.healthScore ?? 100} grade={data?.grade ?? "A"} />
              <div className="flex-1 min-w-0">
                <p className="text-[#e6edf5] font-medium mb-1">
                  {(data?.healthScore ?? 100) >= 75
                    ? "Good Health"
                    : (data?.healthScore ?? 100) >= 60
                      ? "Fair Health"
                      : "Needs Attention"}
                </p>
                <p className="text-sm text-[#697080] leading-relaxed">
                  Score is weighted by the severity of open findings across your
                  scanned targets. Resolve higher-severity risks first to raise
                  it.
                </p>
              </div>
            </div>
          </div>

          {/* Risks detected */}
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-[#9aa5b6]">Risks detected</h2>
              <span className="text-sm text-[#697080]">
                Total: <span className="text-[#e6edf5]">{data?.totalRisks ?? 0}</span>
              </span>
            </div>
            <div className="grid grid-cols-5 gap-2 mb-2.5">
              {riskCards.map((k) => {
                const ui = SEV_UI[k];
                return (
                  <div
                    key={k}
                    className="rounded-lg px-2 py-3 text-center border"
                    style={{ backgroundColor: ui.bg, borderColor: ui.border }}
                  >
                    <div className="text-[10px] text-[#9aa5b6] mb-1">{ui.label}</div>
                    <div className="text-2xl font-bold" style={{ color: ui.color }}>
                      {data?.riskCounts?.[k] ?? 0}
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(["accepted", "closed"] as const).map((k) => {
                const ui = SEV_UI[k];
                const val = k === "closed" ? (data?.closed ?? 0) : (data?.riskCounts?.accepted ?? 0);
                return (
                  <div
                    key={k}
                    className="flex items-center justify-between rounded-lg px-3 py-2 border"
                    style={{ backgroundColor: ui.bg, borderColor: ui.border }}
                  >
                    <span className="text-xs" style={{ color: ui.color }}>
                      {ui.label}
                    </span>
                    <span className="text-sm font-semibold text-[#e6edf5]">{val}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Recent activity */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Recent scans */}
          <Panel title="Recent Scans" href="/app/history" linkLabel="See all scans">
            {data?.recentScans?.length ? (
              data.recentScans.map((s) => (
                <Link
                  key={s.scanId}
                  href="/app/history"
                  className="block px-4 py-3 rounded-lg bg-[#11161f] hover:bg-[#161b24] border border-[#161b24] transition-colors"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm text-[#e6edf5] truncate">{s.label}</p>
                      <p className="text-xs text-[#9aa5b6] truncate">{s.target}</p>
                      <p className="text-xs text-[#697080] mt-0.5">{timeAgo(s.completedAtMs)}</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 text-xs text-[#4493f8] shrink-0">
                      <FontAwesomeIcon icon={faFileLines} className="text-[10px]" /> Report
                    </span>
                  </div>
                </Link>
              ))
            ) : (
              <Empty>No scans yet</Empty>
            )}
          </Panel>

          {/* Recent risks */}
          <Panel title="Recent Risks" href="/app/history" linkLabel="See all risks">
            {data?.recentRisks?.length ? (
              data.recentRisks.map((r, i) => (
                <div
                  key={i}
                  className="px-4 py-3 rounded-lg bg-[#11161f] border border-[#161b24]"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: SEV_UI[r.severity].color }}
                    />
                    <span className="text-[11px] uppercase tracking-wide text-[#697080]">
                      {SEV_UI[r.severity].label}
                    </span>
                  </div>
                  <p className="text-sm text-[#e6edf5] truncate">{r.title}</p>
                  <p className="text-xs text-[#9aa5b6] truncate">{r.target}</p>
                </div>
              ))
            ) : (
              <Empty>No risks detected</Empty>
            )}
          </Panel>

          {/* Discovered targets */}
          <Panel
            title="Discovered Targets"
            badge={data?.totalTargets}
            href="/app/targets"
            linkLabel="See all targets"
          >
            {data?.targets?.length ? (
              data.targets.map((t) => (
                <div
                  key={t.target}
                  className="flex items-center justify-between gap-3 px-4 py-3 rounded-lg bg-[#11161f] border border-[#161b24]"
                >
                  <p className="text-sm text-[#e6edf5] truncate">{t.target}</p>
                  <span className="text-xs text-[#9aa5b6] shrink-0">
                    {t.total} {t.total === 1 ? "risk" : "risks"}
                  </span>
                </div>
              ))
            ) : (
              <Empty>No targets scanned</Empty>
            )}
          </Panel>
        </div>

        {!loadingData && data === null && (
          <p className="text-center text-[#697080] text-sm mt-8">
            Couldn&apos;t load dashboard data. Try refreshing.
          </p>
        )}
      </div>

      {/* Buy credits modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-[#e6edf5] mb-1">Buy Credits</h2>
                <p className="text-[#9aa5b6]">Works across Nmap, Nuclei, and ZAP</p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[#11161f] rounded-lg transition-colors"
              >
                <FontAwesomeIcon icon={faXmark} className="text-[#9aa5b6] hover:text-[#e6edf5] text-xl" />
              </button>
            </div>
            <div className="space-y-3 mb-6">
              {CREDIT_PACKS.map((pack) => (
                <button
                  key={pack.id}
                  onClick={() => setSelectedPack(pack)}
                  className={`w-full flex items-center justify-between p-4 rounded-lg border transition-all ${
                    selectedPack.id === pack.id
                      ? "border-[#0366d6] bg-[#0366d6]/15"
                      : "border-[#161b24] bg-[#11161f] hover:bg-[#161b24]"
                  }`}
                >
                  <div className="text-left">
                    <p className="font-bold text-[#e6edf5]">{pack.name}</p>
                    <p className="text-sm text-[#9aa5b6]">
                      {(pack.credits * 3).toLocaleString()} scans · {pack.credits.toLocaleString()} per scanner
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#e6edf5]">${pack.price}</p>
                    <p className="text-xs text-[#697080]">
                      ${(pack.price / (pack.credits * 3)).toFixed(2)}/scan
                    </p>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={handleCheckout}
              disabled={loadingCheckout}
              className="w-full py-4 bg-[#0366d6] hover:bg-[#4493f8] text-white font-bold rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loadingCheckout ? "Processing…" : `Proceed to Checkout — $${selectedPack.price}`}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── Small components ───────────────────────────────────── */

function Panel({
  title,
  badge,
  href,
  linkLabel,
  children,
}: {
  title: string;
  badge?: number;
  href: string;
  linkLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-[#e6edf5]">
          {title}
          {typeof badge === "number" && (
            <span className="ml-2 px-1.5 py-0.5 rounded bg-[#0366d6]/15 text-[#4493f8] text-xs">
              {badge}
            </span>
          )}
        </h3>
        <Link
          href={href}
          className="inline-flex items-center gap-1 text-xs text-[#697080] hover:text-[#4493f8] transition-colors"
        >
          {linkLabel} <FontAwesomeIcon icon={faArrowRight} className="text-[9px]" />
        </Link>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return <p className="text-sm text-[#697080] py-6 text-center">{children}</p>;
}

/* ─── URL param handler ──────────────────────────────────── */

function PurchaseParamHandler({ openModal }: { openModal: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");
    if (success === "true") {
      toast.success("Payment successful! Your credits will appear shortly.", { duration: 6000 });
      router.replace("/app/dashboard", { scroll: false });
    } else if (canceled === "true") {
      toast("Purchase canceled — no charge was made.", { icon: "ℹ️", duration: 5000 });
      router.replace("/app/dashboard", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
