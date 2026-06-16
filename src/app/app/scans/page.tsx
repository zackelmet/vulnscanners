"use client";

import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faJetFighterUp,
  faServer,
  faBug,
  faGlobe,
  faBolt,
  faClock,
  faCheck,
  faBullseye,
} from "@fortawesome/free-solid-svg-icons";
import { useUserData } from "@/lib/hooks/useUserData";
import { useAuth } from "@/lib/context/AuthContext";
import { auth } from "@/lib/firebase/firebaseClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { Target } from "@/lib/types/target";
import Link from "next/link";

type ScannerId = "nmap" | "nuclei" | "zap";

const SCANNERS: {
  id: ScannerId;
  name: string;
  tag: string;
  icon: typeof faServer;
  blurb: string;
}[] = [
  {
    id: "nmap",
    name: "Nmap",
    tag: "Network",
    icon: faServer,
    blurb: "Open ports and running services across the host.",
  },
  {
    id: "nuclei",
    name: "Nuclei",
    tag: "CVE",
    icon: faBug,
    blurb: "Template-based CVE, misconfiguration & exposure detection.",
  },
  {
    id: "zap",
    name: "OWASP ZAP",
    tag: "Web",
    icon: faGlobe,
    blurb: "Full active scan — OWASP Top 10, headers, and injection.",
  },
];

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
type Frequency = "daily" | "weekly" | "monthly";

export default function ScansPage() {
  const [selectedScanners, setSelectedScanners] = useState<ScannerId[]>([
    "nmap",
  ]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const { userData } = useUserData();
  const { currentUser } = useAuth();

  const [savedTargets, setSavedTargets] = useState<Target[]>([]);
  const [targetInput, setTargetInput] = useState<string>("");

  // Scheduling
  const [runMode, setRunMode] = useState<"now" | "schedule">("now");
  const [frequency, setFrequency] = useState<Frequency>("weekly");
  const [hourUTC, setHourUTC] = useState(9);
  const [dayOfWeek, setDayOfWeek] = useState(1); // Mon
  const [dayOfMonth, setDayOfMonth] = useState(1);

  useEffect(() => {
    const loadTargets = async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/targets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.targets) setSavedTargets(data.targets);
      } catch (err) {
        console.error("Failed to load targets", err);
      }
    };
    loadTargets();
  }, [currentUser]);

  const toggleScanner = (scanner: ScannerId) => {
    setSelectedScanners((prev) =>
      prev.includes(scanner)
        ? prev.length === 1
          ? prev
          : prev.filter((s) => s !== scanner)
        : [...prev, scanner],
    );
  };

  const scannerRemaining = (scanner: ScannerId) =>
    userData?.scanCredits?.[scanner] ?? 0;

  const target = targetInput.trim();
  const selectedHaveCredits = selectedScanners.some(
    (s) => scannerRemaining(s) > 0,
  );

  const scheduleLabel = () => {
    const hh = String(hourUTC).padStart(2, "0");
    if (frequency === "daily") return `Daily at ${hh}:00 UTC`;
    if (frequency === "weekly")
      return `Weekly on ${WEEKDAYS[dayOfWeek]} at ${hh}:00 UTC`;
    return `Monthly on day ${dayOfMonth} at ${hh}:00 UTC`;
  };

  const launchDisabled =
    submitting ||
    !target ||
    selectedScanners.length === 0 ||
    (runMode === "now" && !selectedHaveCredits);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);

    if (!target) {
      setSubmitError(
        "Enter a target (domain, IP, or URL) — or pick a saved target.",
      );
      return;
    }
    if (selectedScanners.length === 0) {
      setSubmitError("Select at least one scanner.");
      return;
    }
    setSubmitting(true);

    try {
      if (runMode === "schedule") {
        const token = await currentUser!.getIdToken();
        const errors: string[] = [];
        let created = 0;
        for (const type of selectedScanners) {
          const body: Record<string, unknown> = {
            name: `${type.toUpperCase()} — ${target}`,
            type,
            target,
            frequency,
            hourUTC,
            minuteUTC: 0,
          };
          if (frequency === "weekly") body.dayOfWeek = dayOfWeek;
          if (frequency === "monthly") body.dayOfMonth = dayOfMonth;
          const res = await fetch("/api/scheduled-scans", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(body),
          });
          const data = await res.json();
          if (!res.ok) errors.push(`${type}: ${data?.error || "Failed"}`);
          else created++;
        }
        if (created === 0) setSubmitError(errors.join("; "));
        else
          setSubmitSuccess(
            `Scheduled ${created} recurring scan${created > 1 ? "s" : ""} — ${scheduleLabel()}.${
              errors.length ? ` (${errors.join("; ")})` : ""
            }`,
          );
        return;
      }

      // Run now
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");
      const token = await user.getIdToken(true);
      const nmapOptions = { topPorts: 1000 };
      const results: { scanner: string; scansCreated: number }[] = [];
      const errors: string[] = [];

      for (const scannerType of selectedScanners) {
        try {
          const res = await fetch("/api/scans", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
              type: scannerType,
              target,
              options: scannerType === "nmap" ? nmapOptions : {},
            }),
          });
          const data = await res.json();
          if (!res.ok)
            errors.push(`${scannerType}: ${data?.error || "Failed"}`);
          else
            results.push({
              scanner: scannerType,
              scansCreated: data.scansCreated || 1,
            });
        } catch (err: any) {
          errors.push(`${scannerType}: ${err.message}`);
        }
      }

      const totalCreated = results.reduce((s, r) => s + r.scansCreated, 0);
      if (results.length === 0) {
        setSubmitError(errors.join("; "));
      } else {
        setSubmitSuccess(
          `${totalCreated} scan${totalCreated > 1 ? "s" : ""} queued (${results
            .map((r) => r.scanner.toUpperCase())
            .join(
              ", ",
            )})${errors.length ? ` — some failed: ${errors.join("; ")}` : ""}`,
        );
      }
    } catch (err: any) {
      setSubmitError(err.message || "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  const fieldCls =
    "w-full px-3 py-2 border border-[#161b24] rounded-lg bg-[#11161f] text-[#e6edf5] focus:outline-none focus:ring-2 focus:ring-[#0366d6]";

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 max-w-6xl mx-auto bg-[#07090d] min-h-screen">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-light text-[#e6edf5]">Launch a scan</h1>
          <p className="text-[#9aa5b6] mt-1">
            Pick your scanners and target, then run now or schedule it.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="grid lg:grid-cols-3 gap-6 items-start"
        >
          {/* ── Config column ─────────────────────────────── */}
          <div className="lg:col-span-2 space-y-6">
            {/* 1. Scanners */}
            <section className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#9aa5b6] mb-4">
                1 · Scanners
                <span className="font-normal text-[#697080] ml-2">
                  select one or more
                </span>
              </h2>
              <div className="grid sm:grid-cols-3 gap-3">
                {SCANNERS.map((s) => {
                  const active = selectedScanners.includes(s.id);
                  const credits = scannerRemaining(s.id);
                  return (
                    <button
                      type="button"
                      key={s.id}
                      onClick={() => toggleScanner(s.id)}
                      className={`relative text-left rounded-xl border p-4 transition-colors ${
                        active
                          ? "border-[#0366d6] bg-[#0366d6]/10"
                          : "border-[#161b24] bg-[#11161f] hover:border-[#2a3242]"
                      }`}
                    >
                      {active && (
                        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#0366d6] text-white grid place-items-center text-[10px]">
                          <FontAwesomeIcon icon={faCheck} />
                        </span>
                      )}
                      <span
                        className={`w-9 h-9 rounded-lg grid place-items-center mb-3 ${
                          active
                            ? "bg-[#0366d6]/20 text-[#4493f8]"
                            : "bg-[#0d1117] text-[#9aa5b6]"
                        }`}
                      >
                        <FontAwesomeIcon icon={s.icon} />
                      </span>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[#e6edf5]">
                          {s.name}
                        </span>
                        <span className="text-[10px] uppercase tracking-wide text-[#697080] border border-[#161b24] rounded px-1.5 py-0.5">
                          {s.tag}
                        </span>
                      </div>
                      <p className="text-xs text-[#9aa5b6] mt-1.5 leading-relaxed">
                        {s.blurb}
                      </p>
                      <p className="text-xs text-[#4493f8] mt-2 font-medium">
                        {credits} credit{credits === 1 ? "" : "s"} left
                      </p>
                    </button>
                  );
                })}
              </div>
            </section>

            {/* 2. Target */}
            <section className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#9aa5b6] mb-4">
                2 · Target
              </h2>
              <div className="relative">
                <FontAwesomeIcon
                  icon={faBullseye}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-[#697080] text-sm"
                />
                <input
                  type="text"
                  placeholder="example.com, 192.168.1.1, or https://example.com"
                  value={targetInput}
                  onChange={(e) => setTargetInput(e.target.value)}
                  className={`${fieldCls} pl-9 font-mono text-sm`}
                />
              </div>
              <div className="flex flex-wrap items-center gap-2 pt-3">
                {savedTargets.length > 0 ? (
                  <>
                    <span className="text-xs text-[#697080]">Saved:</span>
                    {savedTargets.slice(0, 6).map((t) => (
                      <button
                        type="button"
                        key={t.id}
                        onClick={() => setTargetInput(t.value)}
                        className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                          targetInput === t.value
                            ? "border-[#0366d6] bg-[#0366d6]/10 text-[#4493f8]"
                            : "border-[#161b24] bg-[#11161f] text-[#9aa5b6] hover:border-[#2a3242]"
                        }`}
                        title={t.value}
                      >
                        {t.name}
                      </button>
                    ))}
                    <Link
                      href="/app/targets"
                      className="text-xs text-[#4493f8] hover:underline ml-auto"
                    >
                      Manage targets
                    </Link>
                  </>
                ) : (
                  <p className="text-xs text-[#5b6675]">
                    Tip:{" "}
                    <Link
                      href="/app/targets"
                      className="text-[#4493f8] hover:underline"
                    >
                      save targets
                    </Link>{" "}
                    to reuse them across scans.
                  </p>
                )}
              </div>
            </section>

            {/* 3. When */}
            <section className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
              <h2 className="text-sm font-semibold text-[#9aa5b6] mb-4">
                3 · When
              </h2>
              <div className="grid grid-cols-2 gap-3">
                {(
                  [
                    { id: "now", label: "Run now", icon: faBolt },
                    { id: "schedule", label: "Schedule", icon: faClock },
                  ] as const
                ).map((m) => (
                  <button
                    type="button"
                    key={m.id}
                    onClick={() => setRunMode(m.id)}
                    className={`flex items-center gap-2 justify-center rounded-lg border py-2.5 text-sm font-medium transition-colors ${
                      runMode === m.id
                        ? "border-[#0366d6] bg-[#0366d6]/10 text-[#4493f8]"
                        : "border-[#161b24] bg-[#11161f] text-[#9aa5b6] hover:border-[#2a3242]"
                    }`}
                  >
                    <FontAwesomeIcon icon={m.icon} /> {m.label}
                  </button>
                ))}
              </div>

              {runMode === "schedule" && (
                <div className="grid sm:grid-cols-3 gap-3 mt-4">
                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[#697080]">Frequency</span>
                    <select
                      value={frequency}
                      onChange={(e) =>
                        setFrequency(e.target.value as Frequency)
                      }
                      className={fieldCls}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </label>

                  {frequency === "weekly" && (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-[#697080]">Day</span>
                      <select
                        value={dayOfWeek}
                        onChange={(e) => setDayOfWeek(Number(e.target.value))}
                        className={fieldCls}
                      >
                        {WEEKDAYS.map((d, i) => (
                          <option key={d} value={i}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}
                  {frequency === "monthly" && (
                    <label className="flex flex-col gap-1">
                      <span className="text-xs text-[#697080]">
                        Day of month
                      </span>
                      <select
                        value={dayOfMonth}
                        onChange={(e) => setDayOfMonth(Number(e.target.value))}
                        className={fieldCls}
                      >
                        {Array.from({ length: 28 }, (_, i) => i + 1).map(
                          (d) => (
                            <option key={d} value={d}>
                              {d}
                            </option>
                          ),
                        )}
                      </select>
                    </label>
                  )}

                  <label className="flex flex-col gap-1">
                    <span className="text-xs text-[#697080]">Time (UTC)</span>
                    <select
                      value={hourUTC}
                      onChange={(e) => setHourUTC(Number(e.target.value))}
                      className={fieldCls}
                    >
                      {Array.from({ length: 24 }, (_, i) => i).map((h) => (
                        <option key={h} value={h}>
                          {String(h).padStart(2, "0")}:00
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
              )}
            </section>
          </div>

          {/* ── Summary column ────────────────────────────── */}
          <aside className="lg:sticky lg:top-6 bg-[#0d1117] border border-[#161b24] rounded-xl p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#e6edf5]">Summary</h2>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-3">
                <span className="text-[#697080]">Target</span>
                <span className="text-[#e6edf5] font-mono text-xs truncate max-w-[60%] text-right">
                  {target || "—"}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#697080]">Scanners</span>
                <span className="text-[#e6edf5] text-right">
                  {selectedScanners.map((s) => s.toUpperCase()).join(", ")}
                </span>
              </div>
              <div className="flex justify-between gap-3">
                <span className="text-[#697080]">When</span>
                <span className="text-[#e6edf5] text-right">
                  {runMode === "now" ? "Immediately" : scheduleLabel()}
                </span>
              </div>
              <div className="flex justify-between gap-3 border-t border-[#161b24] pt-3">
                <span className="text-[#697080]">Credits</span>
                <span className="text-[#e6edf5] text-right">
                  {runMode === "now"
                    ? `${selectedScanners.length} now`
                    : "1 / scanner / run"}
                </span>
              </div>
            </div>

            {runMode === "now" && !selectedHaveCredits && (
              <Link
                href="/app/dashboard?purchase=true"
                className="block text-center text-xs text-[#4493f8] hover:underline"
              >
                Out of credits — buy more
              </Link>
            )}

            <button
              type="submit"
              disabled={launchDisabled}
              className="w-full px-5 py-3 bg-[#0366d6] text-white font-semibold rounded-lg hover:bg-[#4493f8] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon
                icon={runMode === "now" ? faJetFighterUp : faClock}
              />
              {submitting
                ? runMode === "now"
                  ? "Launching…"
                  : "Scheduling…"
                : runMode === "now"
                  ? "Launch scan"
                  : "Schedule scan"}
            </button>

            {submitError && (
              <div className="text-red-400 text-sm">{submitError}</div>
            )}
            {submitSuccess && (
              <div className="bg-green-500/10 border border-green-500/30 rounded-lg p-3">
                <div className="text-green-400 text-sm font-medium mb-1">
                  ✓ {submitSuccess}
                </div>
                <Link
                  href={runMode === "now" ? "/app/history" : "/app/scheduled"}
                  className="text-[#4493f8] hover:underline text-sm font-semibold"
                >
                  {runMode === "now"
                    ? "View in Scan History →"
                    : "View scheduled scans →"}
                </Link>
              </div>
            )}
          </aside>
        </form>
      </div>
    </DashboardLayout>
  );
}
