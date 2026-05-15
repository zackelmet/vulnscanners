"use client";

export const dynamic = "force-dynamic";

import { useMemo, useState, useEffect, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faRocket,
  faSatelliteDish,
  faSpider,
  faPlus,
  faXmark,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import Link from "next/link";
import { useUserData } from "@/lib/hooks/useUserData";
import { useUserScans } from "@/lib/hooks/useUserScans";
import { useAuth } from "@/lib/context/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import toast from "react-hot-toast";

/* ─── Credit pack definitions ────────────────────────────── */

interface CreditPack {
  id: string;
  name: string;
  price: number;
  credits: number;
  priceId: string;
}

const CREDIT_PACKS: CreditPack[] = [
  {
    id: "essential",
    name: "Essential",
    price: 10,
    credits: 10,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL || "",
  },
  {
    id: "pro",
    name: "Pro",
    price: 50,
    credits: 100,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO || "",
  },
  {
    id: "scale",
    name: "Scale",
    price: 200,
    credits: 1000,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_SCALE || "",
  },
];

/* ─── Per-scanner card config ────────────────────────────── */

const SCANNERS = [
  {
    key: "nmap" as const,
    label: "Nmap",
    description: "Port scanning & service detection",
    logo: "/scanners/nmap.png",
    logoW: 80,
    logoH: 32,
  },
  {
    key: "nuclei" as const,
    label: "Nuclei",
    description: "CVE detection & vulnerability assessment",
    logo: "/scanners/nuclei.png",
    logoW: 32,
    logoH: 32,
  },
  {
    key: "zap" as const,
    label: "OWASP ZAP",
    description: "Web app security & OWASP Top 10",
    logo: "/scanners/zap.png",
    logoW: 32,
    logoH: 32,
  },
];

/* ─── Page ───────────────────────────────────────────────── */

export default function DashboardPage() {
  const { userData, loading } = useUserData();
  const { currentUser } = useAuth();
  const { scans: userScans = [] } = useUserScans(currentUser?.uid ?? null);

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

  const used = useMemo(
    () => ({
      nmap: userData?.scansUsed?.nmap ?? 0,
      nuclei: userData?.scansUsed?.nuclei ?? 0,
      zap: userData?.scansUsed?.zap ?? 0,
    }),
    [userData],
  );

  const hasCredits = credits.nmap > 0 || credits.nuclei > 0 || credits.zap > 0;
  const recentScans = useMemo(() => userScans.slice(0, 5), [userScans]);

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
      const res = await fetch("/api/stripe/create-checkout-session", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          priceId: selectedPack.priceId,
          userId: currentUser.uid,
          email: currentUser.email,
          quantity: 1,
          metadata: { tier: selectedPack.id },
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to create session");
      if (data.url) window.location.href = data.url;
    } catch (err: any) {
      toast.error(err.message || "Failed to start checkout");
    } finally {
      setLoadingCheckout(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-screen bg-[#07090d]">
          <div className="text-[#9aa5b6]">Loading...</div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <Suspense fallback={null}>
        <PurchaseParamHandler openModal={() => openModal()} />
      </Suspense>

      <div className="p-6 lg:p-8 space-y-8 max-w-7xl mx-auto bg-[#07090d] min-h-screen">
        {/* Page header */}
        <div>
          <h1 className="text-3xl font-light text-[#e6edf5] mb-1">Dashboard</h1>
          <p className="text-[#9aa5b6]">Manage your scans and credits</p>
        </div>

        {/* Top CTA */}
        <Link
          href="/app/scans"
          className="w-full block bg-[#0d1117] border border-[#161b24] rounded-xl p-6 shadow-lg hover:border-[#0366d6] transition-all text-center"
        >
          <div className="p-4 rounded-full bg-[#0366d6]/20 mb-3 inline-block">
            <FontAwesomeIcon
              icon={faRocket}
              className="text-4xl text-[#4493f8]"
            />
          </div>
          <p className="text-[#e6edf5] font-light text-xl mb-1">
            Launch New Scan
          </p>
          <p className="text-[#9aa5b6] text-sm">
            Pick a target, choose your scanner
          </p>
        </Link>

        {/* Per-scanner credit cards */}
        <div className="grid lg:grid-cols-3 gap-6">
          {SCANNERS.map((s) => (
            <div
              key={s.key}
              className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6 shadow-lg hover:border-[#0366d6]/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-5">
                <div className="h-8 flex items-center">
                  <Image
                    src={s.logo}
                    alt={s.label}
                    width={s.logoW}
                    height={s.logoH}
                    className="object-contain object-left max-h-7 w-auto"
                  />
                </div>
                <button
                  onClick={() => openModal()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0366d6]/10 hover:bg-[#0366d6]/25 border border-[#0366d6]/40 hover:border-[#0366d6] transition-colors text-sm font-medium text-[#4493f8]"
                >
                  Buy Credits
                  <FontAwesomeIcon icon={faPlus} className="text-xs" />
                </button>
              </div>
              <div>
                <p className="text-[#9aa5b6] text-sm mb-1">{s.description}</p>
                <p className="text-5xl font-bold text-[#e6edf5] mb-1">
                  {credits[s.key]}
                </p>
                <p className="text-xs text-[#697080]">
                  {used[s.key]} used · {credits[s.key]} remaining
                </p>
              </div>
            </div>
          ))}
        </div>

        {/* No credits banner */}
        {!hasCredits && (
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
            <div className="flex items-start gap-4">
              <div className="p-3 rounded-lg bg-[#0366d6]/20 border border-[#0366d6]/40">
                <FontAwesomeIcon
                  icon={faShieldHalved}
                  className="text-2xl text-[#4493f8]"
                />
              </div>
              <div className="flex-1">
                <h3 className="font-bold text-xl text-[#e6edf5] mb-2">
                  Purchase Credits to Start Scanning
                </h3>
                <p className="text-[#9aa5b6] mb-4">
                  Credits work across all three scanners — Nmap, Nuclei, and
                  OWASP ZAP. Starting at $10 for 10 scans.
                </p>
                <div className="flex flex-wrap gap-3">
                  {CREDIT_PACKS.map((pack) => (
                    <button
                      key={pack.id}
                      onClick={() => openModal(pack)}
                      className={`px-5 py-2.5 font-semibold rounded-lg transition-colors ${
                        pack.id === "pro"
                          ? "bg-[#0366d6] hover:bg-[#4493f8] text-white"
                          : "bg-[#11161f] hover:bg-[#161b24] text-[#e6edf5] border border-[#161b24]"
                      }`}
                    >
                      {pack.name} — {pack.credits.toLocaleString()} credits
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Recent scans */}
        {recentScans.length > 0 && (
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold text-[#e6edf5]">
                Recent Scans
              </h2>
              <Link
                href="/app/scans"
                className="text-[#4493f8] hover:text-[#0366d6] text-sm font-semibold transition-colors"
              >
                View All →
              </Link>
            </div>
            <div className="space-y-3">
              {recentScans.map((scan: any) => (
                <div
                  key={scan.scanId}
                  className="p-4 bg-[#11161f] hover:bg-[#161b24] rounded-lg border border-[#161b24] hover:border-[#0366d6]/50 transition-all flex items-center justify-between"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="px-3 py-1 bg-[#0366d6] text-white text-xs font-semibold rounded-full uppercase">
                        {scan.type}
                      </span>
                      <span className="font-semibold text-[#e6edf5]">
                        {scan.target}
                      </span>
                    </div>
                    <p className="text-sm text-[#9aa5b6]">
                      {scan.status === "completed"
                        ? "✓ Completed"
                        : scan.status === "in_progress"
                          ? "⏳ Running…"
                          : "⏸ Queued"}
                    </p>
                  </div>
                  <Link
                    href="/app/scans"
                    className="px-4 py-2 bg-[#0366d6]/20 hover:bg-[#0366d6]/30 text-[#4493f8] font-semibold rounded-lg border border-[#0366d6]/30 transition-colors text-sm"
                  >
                    View
                  </Link>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {recentScans.length === 0 && (
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-12 text-center">
            <div className="max-w-md mx-auto">
              <div className="p-4 rounded-full bg-[#11161f] inline-flex mb-4">
                <FontAwesomeIcon
                  icon={faShieldHalved}
                  className="text-5xl text-[#697080]"
                />
              </div>
              <h3 className="text-xl font-bold text-[#e6edf5] mb-2">
                No Scans Yet
              </h3>
              <p className="text-[#9aa5b6] mb-6">
                Launch your first scan to start identifying vulnerabilities
                across your infrastructure.
              </p>
              <Link
                href="/app/scans"
                className="inline-block px-8 py-3 bg-[#0366d6] hover:bg-[#4493f8] text-white font-semibold rounded-lg transition-colors"
              >
                Launch First Scan
              </Link>
            </div>
          </div>
        )}
      </div>

      {/* Purchase modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-8 max-w-lg w-full shadow-2xl">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-3xl font-bold text-[#e6edf5] mb-1">
                  Buy Credits
                </h2>
                <p className="text-[#9aa5b6]">
                  Works across Nmap, Nuclei, and ZAP
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className="p-2 hover:bg-[#11161f] rounded-lg transition-colors"
              >
                <FontAwesomeIcon
                  icon={faXmark}
                  className="text-[#9aa5b6] hover:text-[#e6edf5] text-xl"
                />
              </button>
            </div>

            {/* Pack selector */}
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
                      {pack.credits.toLocaleString()} scan credits
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-black text-[#e6edf5]">
                      ${pack.price}
                    </p>
                    <p className="text-xs text-[#697080]">
                      ${(pack.price / pack.credits).toFixed(2)}/scan
                    </p>
                  </div>
                </button>
              ))}
            </div>

            {/* What's included */}
            <div className="bg-[#11161f] border border-[#161b24] rounded-lg p-5 mb-6">
              <p className="text-xs text-[#9aa5b6] font-semibold uppercase mb-3">
                Included with every pack:
              </p>
              <ul className="space-y-2 text-sm text-[#9aa5b6]">
                {[
                  "Hosted Nmap, Nuclei & OWASP ZAP scanning",
                  "Mix scanner types freely",
                  "PDF report export",
                  "Credits never expire",
                ].map((f) => (
                  <li key={f} className="flex items-center gap-2">
                    <span className="text-[#4493f8]">✓</span>
                    {f}
                  </li>
                ))}
              </ul>
            </div>

            <button
              onClick={handleCheckout}
              disabled={loadingCheckout}
              className="w-full py-4 bg-[#0366d6] hover:bg-[#4493f8] text-white font-bold rounded-lg text-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg"
            >
              {loadingCheckout
                ? "Processing…"
                : `Proceed to Checkout — $${selectedPack.price}`}
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}

/* ─── URL param handler ──────────────────────────────────── */

function PurchaseParamHandler({ openModal }: { openModal: () => void }) {
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const success = searchParams.get("success");
    const canceled = searchParams.get("canceled");

    if (success === "true") {
      toast.success("Payment successful! Your credits will appear shortly.", {
        duration: 6000,
      });
      router.replace("/app/dashboard", { scroll: false });
    } else if (canceled === "true") {
      toast("Purchase canceled — no charge was made.", {
        icon: "ℹ️",
        duration: 5000,
      });
      router.replace("/app/dashboard", { scroll: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  return null;
}
