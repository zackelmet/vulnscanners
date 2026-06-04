"use client";

import { useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faFileLines,
  faSpinner,
  faSatelliteDish,
  faEnvelope,
} from "@fortawesome/free-solid-svg-icons";
import { useUserScans } from "@/lib/hooks/useUserScans";
import { useAuth } from "@/lib/context/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function ReportsPage() {
  const { currentUser } = useAuth();
  const { scans: userScans = [], loading: scansLoading } = useUserScans(
    currentUser?.uid ?? null,
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [generating, setGenerating] = useState(false);
  const [emailing, setEmailing] = useState(false);

  // Only completed scans can go into a report.
  const completed = useMemo(
    () => userScans.filter((s: any) => s.status === "completed"),
    [userScans],
  );

  // Group by target so users can assemble a report across targets/scans.
  const groups = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const s of completed) {
      const target = s.target || s.targetValue || "Unknown target";
      if (!map.has(target)) map.set(target, []);
      map.get(target)!.push(s);
    }
    return Array.from(map, ([target, scans]) => ({ target, scans }));
  }, [completed]);

  const toggle = (scanId: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(scanId)) next.delete(scanId);
      else next.add(scanId);
      return next;
    });
  };

  const toggleTarget = (scans: any[]) => {
    const ids = scans.map((s) => s.scanId);
    const allSelected = ids.every((id) => selected.has(id));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allSelected) ids.forEach((id) => next.delete(id));
      else ids.forEach((id) => next.add(id));
      return next;
    });
  };

  const selectAll = () => {
    if (selected.size === completed.length) setSelected(new Set());
    else setSelected(new Set(completed.map((s: any) => s.scanId)));
  };

  const formatDate = (ts: any) => {
    if (!ts) return "-";
    if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  };

  const generate = async () => {
    if (!currentUser || selected.size === 0) return;
    setGenerating(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/reports/combined", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scanIds: Array.from(selected) }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        alert(err?.error || "Failed to generate report");
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      const cd = res.headers.get("content-disposition") || "";
      const fnMatch = cd.match(/filename="([^"]+)"/);
      a.download = fnMatch?.[1] || "vulnscanners-combined-report.pdf";
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "Report generation failed");
    } finally {
      setGenerating(false);
    }
  };

  const emailReport = async () => {
    if (!currentUser || selected.size === 0) return;
    setEmailing(true);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/reports/combined/email", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ scanIds: Array.from(selected) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        alert(data?.error || "Failed to email report");
        return;
      }
      alert(`Report emailed to ${data.sentTo}.`);
    } catch (err: any) {
      alert(err?.message || "Failed to email report");
    } finally {
      setEmailing(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-full bg-[#07090d] min-h-screen">
        {/* Header */}
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="text-3xl font-light text-[#e6edf5]">Reports</h1>
            <p className="text-[#9aa5b6] mt-1">
              Combine results from multiple scans and targets into one branded
              PDF report.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#9aa5b6]">
              {selected.size} selected
            </span>
            <button
              onClick={generate}
              disabled={generating || emailing || selected.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-[#0366d6] hover:bg-[#0356b6] text-white text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon
                icon={generating ? faSpinner : faFileLines}
                className={generating ? "animate-spin" : ""}
              />
              {generating ? "Generating…" : "Download combined report"}
            </button>
            <button
              onClick={emailReport}
              disabled={emailing || generating || selected.size === 0}
              className="flex items-center gap-2 px-4 py-2 border border-[#21262d] hover:border-[#0366d6] text-[#e6edf5] text-sm font-semibold rounded-lg disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FontAwesomeIcon
                icon={emailing ? faSpinner : faEnvelope}
                className={emailing ? "animate-spin" : ""}
              />
              {emailing ? "Sending…" : "Email it to me"}
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl shadow-sm overflow-hidden">
          {scansLoading ? (
            <div className="p-12 text-center text-[#9aa5b6]">
              Loading scans…
            </div>
          ) : completed.length === 0 ? (
            <div className="p-12 text-center">
              <FontAwesomeIcon
                icon={faSatelliteDish}
                className="text-5xl text-[#697080] mb-4"
              />
              <p className="text-[#9aa5b6]">
                No completed scans yet. Run a scan first, then come back to build
                a combined report.
              </p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between px-6 py-3 border-b border-[#161b24] bg-[#11161f]">
                <span className="text-xs font-semibold text-[#9aa5b6] uppercase">
                  Select scans to include
                </span>
                <button
                  onClick={selectAll}
                  className="text-[#4493f8] hover:text-[#0366d6] text-sm font-semibold"
                >
                  {selected.size === completed.length
                    ? "Clear all"
                    : "Select all"}
                </button>
              </div>

              <div className="divide-y divide-[#161b24]">
                {groups.map((group) => {
                  const ids = group.scans.map((s) => s.scanId);
                  const allSelected = ids.every((id) => selected.has(id));
                  return (
                    <div key={group.target} className="px-6 py-4">
                      <div className="flex items-center gap-3 mb-3">
                        <input
                          type="checkbox"
                          checked={allSelected}
                          onChange={() => toggleTarget(group.scans)}
                          className="w-4 h-4 accent-[#0366d6] cursor-pointer"
                        />
                        <span className="text-sm font-semibold text-[#e6edf5]">
                          {group.target}
                        </span>
                        <span className="text-xs text-[#697080]">
                          {group.scans.length}{" "}
                          {group.scans.length === 1 ? "scan" : "scans"}
                        </span>
                      </div>
                      <div className="space-y-2 pl-7">
                        {group.scans.map((scan: any) => (
                          <label
                            key={scan.scanId}
                            className="flex items-center gap-3 cursor-pointer py-1 group"
                          >
                            <input
                              type="checkbox"
                              checked={selected.has(scan.scanId)}
                              onChange={() => toggle(scan.scanId)}
                              className="w-4 h-4 accent-[#0366d6] cursor-pointer"
                            />
                            <span className="px-2 py-0.5 bg-[#0366d6] text-white text-xs font-semibold rounded uppercase">
                              {scan.type}
                            </span>
                            <span className="text-sm text-[#9aa5b6] group-hover:text-[#e6edf5]">
                              {formatDate(scan.startTime || scan.createdAt)}
                            </span>
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
