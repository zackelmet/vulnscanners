"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faPlus,
  faTrash,
  faSpinner,
  faPlay,
  faPause,
  faFileArrowDown,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/context/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { ScannerBadge } from "@/components/scans/ScannerBadge";
import {
  describeSchedule,
  WEEKDAY_LABELS,
  ScheduleFrequency,
} from "@/lib/scans/schedule";
import { Target } from "@/lib/types/target";

type ScannerType = "nmap" | "nuclei" | "zap";

interface Schedule {
  id: string;
  name: string | null;
  type: ScannerType;
  types?: ScannerType[];
  target: string;
  frequency: ScheduleFrequency;
  hourUTC: number;
  minuteUTC?: number;
  dayOfWeek?: number;
  dayOfMonth?: number;
  enabled: boolean;
  nextRunAt: string | null;
  lastRunAt: string | null;
  lastScanId: string | null;
  lastError: string | null;
}

const SCANNERS = [
  { value: "nmap", label: "Nmap" },
  { value: "nuclei", label: "Nuclei" },
  { value: "zap", label: "OWASP ZAP" },
] as const;

export default function ScheduledScansPage() {
  const { currentUser } = useAuth();
  const [schedules, setSchedules] = useState<Schedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  const [savedTargets, setSavedTargets] = useState<Target[]>([]);

  // form state — a schedule can run several scanners on each fire.
  const [types, setTypes] = useState<ScannerType[]>(["nmap"]);
  const [target, setTarget] = useState("");
  // When a saved target is picked, link the schedule to it; cleared on manual edit.
  const [targetId, setTargetId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly");
  const [hourUTC, setHourUTC] = useState(9);
  const [minuteUTC, setMinuteUTC] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);
  // Per-scan report download (by lastScanId).
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const authedFetch = useCallback(
    async (url: string, init?: RequestInit) => {
      const token = await currentUser!.getIdToken();
      return fetch(url, {
        ...init,
        headers: {
          ...(init?.headers || {}),
          Authorization: `Bearer ${token}`,
          ...(init?.body ? { "Content-Type": "application/json" } : {}),
        },
      });
    },
    [currentUser],
  );

  const load = useCallback(async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const res = await authedFetch("/api/scheduled-scans");
      const data = await res.json();
      setSchedules(data.schedules || []);
    } catch {
      setSchedules([]);
    } finally {
      setLoading(false);
    }
  }, [currentUser, authedFetch]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    const loadTargets = async () => {
      if (!currentUser) return;
      try {
        const res = await authedFetch("/api/targets");
        const data = await res.json();
        if (data.success && data.targets) setSavedTargets(data.targets);
      } catch {
        setSavedTargets([]);
      }
    };
    loadTargets();
  }, [currentUser, authedFetch]);

  const toggleType = (t: ScannerType) =>
    setTypes((prev) =>
      prev.includes(t) ? prev.filter((x) => x !== t) : [...prev, t],
    );

  const resetForm = () => {
    setTypes(["nmap"]);
    setTarget("");
    setTargetId(null);
    setName("");
    setFrequency("weekly");
    setHourUTC(9);
    setMinuteUTC(0);
    setDayOfWeek(1);
    setDayOfMonth(1);
  };

  const create = async () => {
    if (!target.trim()) {
      alert("Enter a target.");
      return;
    }
    if (types.length === 0) {
      alert("Select at least one scanner.");
      return;
    }
    setSaving(true);
    try {
      const body: any = {
        name: name.trim() || undefined,
        types,
        target: target.trim(),
        frequency,
        hourUTC,
        minuteUTC,
      };
      if (targetId) body.targetId = targetId;
      if (frequency === "weekly") body.dayOfWeek = dayOfWeek;
      if (frequency === "monthly") body.dayOfMonth = dayOfMonth;

      const res = await authedFetch("/api/scheduled-scans", {
        method: "POST",
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to create schedule");
        return;
      }
      resetForm();
      setShowForm(false);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (s: Schedule) => {
    setBusyId(s.id);
    try {
      await authedFetch(`/api/scheduled-scans/${s.id}`, {
        method: "PATCH",
        body: JSON.stringify({ enabled: !s.enabled }),
      });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (s: Schedule) => {
    if (!confirm("Delete this schedule? This cannot be undone.")) return;
    setBusyId(s.id);
    try {
      await authedFetch(`/api/scheduled-scans/${s.id}`, { method: "DELETE" });
      await load();
    } finally {
      setBusyId(null);
    }
  };

  // Download the report PDF for a schedule's most recent scan. The report API
  // requires an auth header, so we fetch the blob and trigger a download rather
  // than using a plain <a href>.
  const downloadReport = async (s: Schedule) => {
    if (!s.lastScanId) return;
    setDownloadingId(s.id);
    try {
      const res = await authedFetch(`/api/scans/${s.lastScanId}/report`);
      if (!res.ok) {
        alert("Report not available for the last run yet.");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `report-${s.lastScanId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      alert("Failed to download report.");
    } finally {
      setDownloadingId(null);
    }
  };

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : "—";

  const inputCls =
    "bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-[#e6edf5] focus:border-[#0366d6] outline-none";

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-full bg-[#07090d] min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-light text-[#e6edf5]">
              Scheduled Scans
            </h1>
            <p className="text-[#9aa5b6] mt-1">
              Run recurring scans automatically at your chosen time (UTC). The
              first run is the next occurrence of that time — today when that
              time is still ahead. Each run uses one scan credit per selected
              scanner.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0366d6] hover:bg-[#0356b6] text-white text-sm font-semibold rounded-lg"
          >
            <FontAwesomeIcon icon={faPlus} />
            New schedule
          </button>
        </div>

        {/* Create form */}
        {showForm && (
          <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                  Scanners
                </span>
                <div className="flex flex-wrap gap-2">
                  {SCANNERS.map((s) => {
                    const active = types.includes(s.value);
                    return (
                      <button
                        key={s.value}
                        type="button"
                        onClick={() => toggleType(s.value)}
                        aria-pressed={active}
                        className={`px-3 py-2 rounded-lg border text-sm font-semibold transition-colors ${
                          active
                            ? "bg-[#0366d6] border-[#0366d6] text-white"
                            : "bg-[#0d1117] border-[#21262d] text-[#9aa5b6] hover:border-[#0366d6]"
                        }`}
                      >
                        {s.label}
                      </button>
                    );
                  })}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                  Target
                </span>
                <input
                  value={target}
                  onChange={(e) => {
                    setTarget(e.target.value);
                    setTargetId(null);
                  }}
                  placeholder={
                    types.includes("zap")
                      ? "https://example.com"
                      : "example.com or IP"
                  }
                  className={inputCls}
                />
                <div className="flex flex-wrap items-center gap-2 pt-1">
                  {savedTargets.length > 0 ? (
                    <>
                      <span className="text-xs text-[#697080]">Saved:</span>
                      {savedTargets.slice(0, 6).map((t) => (
                        <button
                          type="button"
                          key={t.id}
                          onClick={() => {
                            setTarget(t.value);
                            setTargetId(t.id);
                          }}
                          className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                            targetId === t.id
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
                      to reuse them here.
                    </p>
                  )}
                </div>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                  Label (optional)
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Weekly prod perimeter"
                  className={inputCls}
                />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                  Frequency
                </span>
                <select
                  value={frequency}
                  onChange={(e) =>
                    setFrequency(e.target.value as ScheduleFrequency)
                  }
                  className={inputCls}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>

              {frequency === "weekly" && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                    Day of week
                  </span>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className={inputCls}
                  >
                    {WEEKDAY_LABELS.map((d, i) => (
                      <option key={d} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              {frequency === "monthly" && (
                <label className="flex flex-col gap-1">
                  <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                    Day of month (1–28)
                  </span>
                  <input
                    type="number"
                    min={1}
                    max={28}
                    value={dayOfMonth}
                    onChange={(e) =>
                      setDayOfMonth(
                        Math.min(28, Math.max(1, Number(e.target.value))),
                      )
                    }
                    className={inputCls}
                  />
                </label>
              )}

              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                  Time (UTC)
                </span>
                <div className="flex items-center gap-2">
                  <select
                    value={hourUTC}
                    onChange={(e) => setHourUTC(Number(e.target.value))}
                    className={inputCls}
                  >
                    {Array.from({ length: 24 }, (_, h) => (
                      <option key={h} value={h}>
                        {String(h).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                  <span className="text-[#9aa5b6]">:</span>
                  <select
                    value={minuteUTC}
                    onChange={(e) => setMinuteUTC(Number(e.target.value))}
                    className={inputCls}
                  >
                    {[0, 15, 30, 45].map((m) => (
                      <option key={m} value={m}>
                        {String(m).padStart(2, "0")}
                      </option>
                    ))}
                  </select>
                </div>
              </label>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={create}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-[#0366d6] hover:bg-[#0356b6] text-white text-sm font-semibold rounded-lg disabled:opacity-50"
              >
                <FontAwesomeIcon
                  icon={saving ? faSpinner : faClock}
                  className={saving ? "animate-spin" : ""}
                />
                {saving ? "Saving…" : "Create schedule"}
              </button>
              <button
                onClick={() => {
                  setShowForm(false);
                  resetForm();
                }}
                className="px-4 py-2 text-sm font-semibold text-[#9aa5b6] hover:text-[#e6edf5]"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* List */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl shadow-sm overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-[#9aa5b6]">
              Loading schedules…
            </div>
          ) : schedules.length === 0 ? (
            <div className="p-12 text-center">
              <FontAwesomeIcon
                icon={faClock}
                className="text-5xl text-[#697080] mb-4"
              />
              <p className="text-[#9aa5b6]">
                No scheduled scans yet. Create one to run scans on a recurring
                cadence.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#11161f] border-b border-[#161b24]">
                  <tr>
                    {[
                      "Scanner",
                      "Target",
                      "Cadence",
                      "Next run",
                      "Last run",
                      "Last result",
                      "Status",
                      "",
                    ].map((h) => (
                      <th
                        key={h}
                        className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161b24]">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-[#11161f]">
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1">
                          {(s.types?.length ? s.types : [s.type]).map((t) => (
                            <ScannerBadge key={t} type={t} />
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#e6edf5]">
                        {s.target}
                        {s.name && (
                          <div className="text-xs text-[#697080]">{s.name}</div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#9aa5b6]">
                        {describeSchedule(s)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#9aa5b6]">
                        {s.enabled ? fmt(s.nextRunAt) : "—"}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#9aa5b6]">
                        {fmt(s.lastRunAt)}
                        {s.lastError && (
                          <div className="text-xs text-amber-400">
                            {s.lastError}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm">
                        {s.lastScanId ? (
                          <button
                            onClick={() => downloadReport(s)}
                            disabled={downloadingId === s.id}
                            className="inline-flex items-center gap-1.5 text-[#4493f8] hover:text-[#0366d6] disabled:opacity-50"
                            title="Download report for the last run"
                          >
                            <FontAwesomeIcon
                              icon={
                                downloadingId === s.id
                                  ? faSpinner
                                  : faFileArrowDown
                              }
                              className={
                                downloadingId === s.id ? "animate-spin" : ""
                              }
                            />
                            Report
                          </button>
                        ) : (
                          <span className="text-[#697080]">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            s.enabled
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-[#697080]/20 text-[#9aa5b6] border border-[#697080]/30"
                          }`}
                        >
                          {s.enabled ? "Active" : "Paused"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => toggle(s)}
                            disabled={busyId === s.id}
                            className="text-[#4493f8] hover:text-[#0366d6] disabled:opacity-50"
                            title={s.enabled ? "Pause" : "Resume"}
                          >
                            <FontAwesomeIcon
                              icon={
                                busyId === s.id
                                  ? faSpinner
                                  : s.enabled
                                    ? faPause
                                    : faPlay
                              }
                              className={busyId === s.id ? "animate-spin" : ""}
                            />
                          </button>
                          <button
                            onClick={() => remove(s)}
                            disabled={busyId === s.id}
                            className="text-red-400 hover:text-red-300 disabled:opacity-50"
                            title="Delete"
                          >
                            <FontAwesomeIcon icon={faTrash} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
