"use client";

import { useCallback, useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faClock,
  faPlus,
  faTrash,
  faSpinner,
  faPlay,
  faPause,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/context/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import {
  describeSchedule,
  WEEKDAY_LABELS,
  ScheduleFrequency,
} from "@/lib/scans/schedule";

interface Schedule {
  id: string;
  name: string | null;
  type: "nmap" | "nuclei" | "zap";
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

  // form state
  const [type, setType] = useState<"nmap" | "nuclei" | "zap">("nmap");
  const [target, setTarget] = useState("");
  const [name, setName] = useState("");
  const [frequency, setFrequency] = useState<ScheduleFrequency>("weekly");
  const [hourUTC, setHourUTC] = useState(9);
  const [minuteUTC, setMinuteUTC] = useState(0);
  const [dayOfWeek, setDayOfWeek] = useState(1);
  const [dayOfMonth, setDayOfMonth] = useState(1);

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

  const resetForm = () => {
    setType("nmap");
    setTarget("");
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
    setSaving(true);
    try {
      const body: any = {
        name: name.trim() || undefined,
        type,
        target: target.trim(),
        frequency,
        hourUTC,
        minuteUTC,
      };
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

  const fmt = (iso: string | null) =>
    iso ? new Date(iso).toLocaleString() : "—";

  const inputCls =
    "bg-[#0d1117] border border-[#21262d] rounded-lg px-3 py-2 text-sm text-[#e6edf5] focus:border-[#7c3aed] outline-none";

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
              Run recurring scans automatically. Times are in UTC; each run uses
              one scan credit for the chosen scanner.
            </p>
          </div>
          <button
            onClick={() => setShowForm((v) => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-lg"
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
                  Scanner
                </span>
                <select
                  value={type}
                  onChange={(e) => setType(e.target.value as any)}
                  className={inputCls}
                >
                  {SCANNERS.map((s) => (
                    <option key={s.value} value={s.value}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                  Target
                </span>
                <input
                  value={target}
                  onChange={(e) => setTarget(e.target.value)}
                  placeholder={
                    type === "zap" ? "https://example.com" : "example.com or IP"
                  }
                  className={inputCls}
                />
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
                className="flex items-center gap-2 px-4 py-2 bg-[#7c3aed] hover:bg-[#6d28d9] text-white text-sm font-semibold rounded-lg disabled:opacity-50"
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
                        <span className="px-2 py-1 bg-[#7c3aed] text-white text-xs font-semibold rounded uppercase">
                          {s.type}
                        </span>
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
                            className="text-[#a78bfa] hover:text-[#7c3aed] disabled:opacity-50"
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
