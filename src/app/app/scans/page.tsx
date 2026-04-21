"use client";

import { useEffect, useMemo, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faRocket,
  faHistory,
  faSatelliteDish,
} from "@fortawesome/free-solid-svg-icons";
import { useUserData } from "@/lib/hooks/useUserData";
import { useUserScans } from "@/lib/hooks/useUserScans";
import { useAuth } from "@/lib/context/AuthContext";
import { auth, db } from "@/lib/firebase/firebaseClient";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { doc, updateDoc } from "firebase/firestore";
import { SavedTarget } from "@/lib/types/user";

import { Target } from "@/lib/types/target";

type TabKey = "new" | "history";

export default function ScansPage() {
  const [activeTab, setActiveTab] = useState<TabKey>("new");
  const [selectedScanners, setSelectedScanners] = useState<
    ("nmap" | "nuclei" | "zap")[]
  >(["nmap"]);
  const [zapProfile, setZapProfile] = useState<"quick" | "active" | "full">(
    "active",
  );
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [submitSuccess, setSubmitSuccess] = useState<string | null>(null);

  const { userData, loading } = useUserData();
  const { currentUser } = useAuth();
  const { scans: userScans = [], loading: scansLoading } = useUserScans(
    currentUser?.uid ?? null,
  );

  const [savedTargets, setSavedTargets] = useState<Target[]>([]);
  const [selectedTargetId, setSelectedTargetId] = useState<string>("");

  useEffect(() => {
    const loadTargets = async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/targets", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success && data.targets) {
          setSavedTargets(data.targets);
          if (data.targets.length > 0) {
            setSelectedTargetId(data.targets[0].id);
          }
        }
      } catch (err) {
        console.error("Failed to load targets", err);
      }
    };
    loadTargets();
  }, [currentUser]);

  const selectedTarget = useMemo(
    () => savedTargets.find((target) => target.id === selectedTargetId) ?? null,
    [savedTargets, selectedTargetId],
  );

  const toggleScanner = (scanner: "nmap" | "nuclei" | "zap") => {
    setSelectedScanners((prev) => {
      if (prev.includes(scanner)) {
        // Don't allow deselecting if it's the only one
        if (prev.length === 1) return prev;
        return prev.filter((s) => s !== scanner);
      } else {
        return [...prev, scanner];
      }
    });
  };

  const handleSavedTargetChange = (value: string) => {
    setSelectedTargetId(value);
  };

  const hasCredits = userData
    ? (userData.scanCredits?.nmap ?? 0) > 0 ||
      (userData.scanCredits?.nuclei ?? 0) > 0 ||
      (userData.scanCredits?.zap ?? 0) > 0
    : false;

  const scannerRemaining = (scanner: "nmap" | "nuclei" | "zap") => {
    if (!userData) return 0;
    return userData.scanCredits?.[scanner] ?? 0;
  };

  const formatDate = (ts: any) => {
    if (!ts) return "-";
    if (typeof ts.toDate === "function") return ts.toDate().toLocaleString();
    return new Date(ts).toLocaleString();
  };

  const formatDuration = (startTime: any, endTime: any) => {
    if (!startTime || !endTime) return "-";
    let start = startTime;
    let end = endTime;
    if (typeof startTime.toDate === "function") start = startTime.toDate();
    else start = new Date(startTime);
    if (typeof endTime.toDate === "function") end = endTime.toDate();
    else end = new Date(endTime);

    const diffMs = end.getTime() - start.getTime();
    if (diffMs < 0) return "-";

    const seconds = Math.floor(diffMs / 1000);
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ${seconds % 60}s`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ${minutes % 60}m`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);
    setSubmitSuccess(null);
    setSubmitting(true);

    if (!selectedTargetId) {
      setSubmitError(
        "Please select a target from your saved targets before launching a scan.",
      );
      setSubmitting(false);
      return;
    }

    if (selectedScanners.length === 0) {
      setSubmitError("Please select at least one scanner type.");
      setSubmitting(false);
      return;
    }

    try {
      const user = auth.currentUser;
      if (!user) throw new Error("Not authenticated");

      const token = await user.getIdToken(true);
      const nmapOptions = { topPorts: 100 };
      const zapOptions = { scanProfile: zapProfile };

      const results = [];
      const errors = [];

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
              targetId: selectedTargetId,
              options:
                scannerType === "nmap"
                  ? nmapOptions
                  : scannerType === "zap"
                    ? zapOptions
                    : {},
            }),
          });

          const data = await res.json();
          if (!res.ok) {
            errors.push(`${scannerType}: ${data?.error || "Failed"}`);
          } else {
            results.push({
              scanner: scannerType,
              scansCreated: data.scansCreated || 1,
              batchId: data.batchId,
            });
          }
        } catch (err: any) {
          errors.push(`${scannerType}: ${err.message}`);
        }
      }

      if (errors.length > 0 && results.length === 0) {
        setSubmitError(errors.join("; "));
      } else if (errors.length > 0) {
        setSubmitError(`Some scans failed: ${errors.join("; ")}`);
        const totalCreated = results.reduce(
          (sum, r) => sum + r.scansCreated,
          0,
        );
        setSubmitSuccess(
          `${totalCreated} scan${totalCreated > 1 ? "s" : ""} created successfully for ${results.map((r) => r.scanner.toUpperCase()).join(", ")}`,
        );
      } else {
        const totalCreated = results.reduce(
          (sum, r) => sum + r.scansCreated,
          0,
        );
        setSubmitSuccess(
          `${totalCreated} scan${totalCreated > 1 ? "s" : ""} queued across ${results.length} scanner type${results.length > 1 ? "s" : ""} (${results.map((r) => r.scanner.toUpperCase()).join(", ")})`,
        );
      }

      setTimeout(() => setActiveTab("history"), 2000);
    } catch (err: any) {
      setSubmitError(err.message || "Unknown error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-full bg-[#0a141f] min-h-screen">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light text-white">Scans</h1>
          <p className="text-gray-400 mt-1">
            Launch new scans and view your scan history
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-3">
          <button
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 font-semibold transition-all ${
              activeTab === "new"
                ? "border-[#06b6d4] bg-[#06b6d4]/10 text-[#22d3ee]"
                : "border-[#1a2d44] text-gray-400 hover:border-[#06b6d4]/40 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("new")}
          >
            <FontAwesomeIcon icon={faPlus} />
            New Scan
          </button>
          <button
            className={`px-4 py-2 rounded-lg border flex items-center gap-2 font-semibold transition-all ${
              activeTab === "history"
                ? "border-[#06b6d4] bg-[#06b6d4]/10 text-[#22d3ee]"
                : "border-[#1a2d44] text-gray-400 hover:border-[#06b6d4]/40 hover:text-gray-200"
            }`}
            onClick={() => setActiveTab("history")}
          >
            <FontAwesomeIcon icon={faHistory} />
            Scan History
          </button>
        </div>

        {/* New Scan Tab */}
        {activeTab === "new" && (
          <div className="max-w-3xl mx-auto">
            {!hasCredits ? (
              <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl p-8 text-center shadow-lg">
                <FontAwesomeIcon
                  icon={faRocket}
                  className="text-5xl mb-4 text-[#22d3ee]"
                />
                <h2 className="text-2xl font-bold text-white mb-3">
                  No Scan Credits
                </h2>
                <p className="text-gray-400 max-w-xl mx-auto mb-6">
                  Purchase scan credits to start running Nmap, Nuclei, and OWASP
                  ZAP scans. Credits are shared across all scanner types.
                </p>
                <a
                  href="/#pricing"
                  className="inline-block px-6 py-3 bg-[#06b6d4] text-[#04141d] hover:text-white font-semibold rounded-lg hover:bg-[#0891b2] transition-colors shadow-[0_8px_24px_rgba(6,182,212,0.25)]"
                >
                  <FontAwesomeIcon icon={faRocket} className="mr-2" />
                  Buy Credits
                </a>
              </div>
            ) : (
              <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl p-6 shadow-lg">
                <div className="flex items-start justify-between mb-6">
                  <h2 className="text-xl font-bold text-white">
                    Create New Scan
                  </h2>
                  <span className="px-3 py-1 bg-green-500/15 text-green-300 border border-green-500/30 text-xs font-semibold rounded-full">
                    Authenticated
                  </span>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                  {/* Scanner Types - Multi-select */}
                  <div>
                    <label className="block text-sm font-semibold text-gray-200 mb-3">
                      Scanner Types
                      <span className="text-xs text-gray-500 font-normal ml-2">
                        (select one or more)
                      </span>
                    </label>
                    <div className="space-y-3">
                      {/* Nmap Checkbox */}
                      <label className="flex items-start gap-3 p-3 border border-[#1a2d44] rounded-lg hover:border-[#06b6d4]/50 hover:bg-white/5 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedScanners.includes("nmap")}
                          onChange={() => toggleScanner("nmap")}
                          className="mt-1 h-4 w-4 accent-[#06b6d4] rounded focus:ring-[#06b6d4]"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            Nmap - Network Scanner
                          </div>
                          <div className="text-xs text-gray-400">
                            Port scanning and service detection
                          </div>
                          <div className="text-xs text-[#22d3ee] mt-1 font-semibold">
                            {scannerRemaining("nmap")} credits remaining
                          </div>
                        </div>
                      </label>

                      {/* Nuclei Checkbox */}
                      <label className="flex items-start gap-3 p-3 border border-[#1a2d44] rounded-lg hover:border-[#06b6d4]/50 hover:bg-white/5 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedScanners.includes("nuclei")}
                          onChange={() => toggleScanner("nuclei")}
                          className="mt-1 h-4 w-4 accent-[#06b6d4] rounded focus:ring-[#06b6d4]"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            Nuclei - Vulnerability Assessment
                          </div>
                          <div className="text-xs text-gray-400">
                            CVE detection and security analysis
                          </div>
                          <div className="text-xs text-[#22d3ee] mt-1 font-semibold">
                            {scannerRemaining("nuclei")} credits remaining
                          </div>
                        </div>
                      </label>

                      {/* ZAP Checkbox */}
                      <label className="flex items-start gap-3 p-3 border border-[#1a2d44] rounded-lg hover:border-[#06b6d4]/50 hover:bg-white/5 cursor-pointer transition-colors">
                        <input
                          type="checkbox"
                          checked={selectedScanners.includes("zap")}
                          onChange={() => toggleScanner("zap")}
                          className="mt-1 h-4 w-4 accent-[#06b6d4] rounded focus:ring-[#06b6d4]"
                        />
                        <div className="flex-1">
                          <div className="font-semibold text-white">
                            OWASP ZAP - Web Application Scanner
                          </div>
                          <div className="text-xs text-gray-400">
                            Web vulnerabilities and OWASP Top 10
                          </div>
                          <div className="text-xs text-[#22d3ee] mt-1 font-semibold">
                            {scannerRemaining("zap")} credits remaining
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Saved Targets */}
                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-200 mb-2">
                      Target to Scan
                    </label>
                    <div className="flex flex-wrap gap-3">
                      {savedTargets.length === 0 ? (
                        <p className="text-sm text-gray-400 py-2">
                          You have no saved targets.{" "}
                          <a
                            href="/app/targets"
                            className="text-[#22d3ee] hover:text-[#67e8f9] underline"
                          >
                            Add a target
                          </a>{" "}
                          first.
                        </p>
                      ) : (
                        <select
                          className="min-w-[200px] px-4 py-3 border border-[#1a2d44] rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4]"
                          value={selectedTargetId}
                          onChange={(e) => setSelectedTargetId(e.target.value)}
                        >
                          <option value="" disabled className="bg-[#0d1b2e]">
                            Select a target...
                          </option>
                          {savedTargets.map((target) => (
                            <option
                              key={target.id}
                              value={target.id}
                              className="bg-[#0d1b2e]"
                            >
                              {target.name} ({target.value})
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* ZAP Profile */}
                  {selectedScanners.includes("zap") && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-200 mb-2">
                        Scan Profile
                      </label>
                      <select
                        className="w-full px-4 py-3 border border-[#1a2d44] rounded-lg bg-white/5 text-white focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4]"
                        value={zapProfile}
                        onChange={(e) =>
                          setZapProfile(
                            e.target.value as "quick" | "active" | "full",
                          )
                        }
                      >
                        <option value="quick" className="bg-[#0d1b2e]">
                          Quick - Spider only
                        </option>
                        <option value="active" className="bg-[#0d1b2e]">
                          Active - Spider + active scan
                        </option>
                        <option value="full" className="bg-[#0d1b2e]">
                          Full - AJAX spider + active scan
                        </option>
                      </select>
                    </div>
                  )}

                  {/* Remaining Scans */}
                  <div className="bg-[#06b6d4]/10 border border-[#06b6d4]/30 rounded-lg p-4">
                    <p className="text-sm text-gray-200 mb-2">
                      <strong>Scans Remaining:</strong>
                    </p>
                    {selectedScanners?.map((scanner) => (
                      <p key={scanner} className="text-sm text-gray-300 ml-2">
                        • {scanner.toUpperCase()}: {scannerRemaining(scanner)}{" "}
                        credits remaining
                      </p>
                    ))}
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full px-5 py-3 bg-[#06b6d4] text-[#04141d] hover:text-white font-semibold rounded-lg hover:bg-[#0891b2] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 shadow-[0_8px_24px_rgba(6,182,212,0.25)]"
                  >
                    <FontAwesomeIcon icon={faRocket} />
                    {submitting ? "Launching..." : "Launch Scan"}
                  </button>

                  {submitError && (
                    <div className="text-red-400 text-sm font-medium">
                      {submitError}
                    </div>
                  )}
                  {submitSuccess && (
                    <div className="text-green-400 text-sm font-medium">
                      {submitSuccess}
                    </div>
                  )}
                </form>
              </div>
            )}
          </div>
        )}

        {/* History Tab */}
        {activeTab === "history" && (
          <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl shadow-lg overflow-hidden">
            <div className="p-6 border-b border-[#1a2d44]">
              <h2 className="text-xl font-bold text-white">Scan History</h2>
            </div>

            {scansLoading ? (
              <div className="p-12 text-center text-gray-400">
                Loading scans...
              </div>
            ) : userScans.length === 0 ? (
              <div className="p-12 text-center">
                <FontAwesomeIcon
                  icon={faSatelliteDish}
                  className="text-5xl text-gray-600 mb-4"
                />
                <p className="text-gray-400">
                  No scan history available. Your completed scans will appear
                  here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-white/5 border-b border-[#1a2d44]">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Type
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Target
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Started
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Duration
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Result Files
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wide">
                        Reports
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#1a2d44]">
                    {userScans.map((scan: any) => (
                      <tr
                        key={scan.scanId}
                        className={`hover:bg-white/5 transition-colors ${scan.batchId ? "border-l-4 border-l-[#06b6d4]" : ""}`}
                      >
                        <td className="px-6 py-4 text-sm text-gray-200">
                          <div className="font-mono">
                            {scan.scanId.substring(0, 8)}
                          </div>
                          {scan.batchId && (
                            <div className="text-xs text-[#22d3ee] mt-1">
                              batch: {scan.batchId.substring(0, 8)}
                            </div>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <span className="px-2 py-1 bg-[#06b6d4] text-[#04141d] text-xs font-semibold rounded uppercase">
                            {scan.type}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-200">
                          {scan.target}
                        </td>
                        <td className="px-6 py-4">
                          <span
                            className={`px-2 py-1 text-xs font-semibold rounded border ${
                              scan.status === "completed"
                                ? "bg-green-500/15 text-green-300 border-green-500/30"
                                : scan.status === "in_progress"
                                  ? "bg-[#06b6d4]/15 text-[#22d3ee] border-[#06b6d4]/30"
                                  : "bg-white/5 text-gray-300 border-white/10"
                            }`}
                          >
                            {scan.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400">
                          {formatDate(scan.startTime || scan.createdAt)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-400 font-mono">
                          {formatDuration(scan.startTime, scan.endTime)}
                        </td>
                        <td className="px-6 py-4">
                          {scan.gcpSignedUrl || scan.gcpXmlSignedUrl ? (
                            <div className="flex gap-2">
                              {scan.gcpSignedUrl && (
                                <a
                                  href={scan.gcpSignedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#22d3ee] hover:text-[#67e8f9] text-sm font-semibold"
                                  title="Download JSON results"
                                >
                                  JSON
                                </a>
                              )}
                              {scan.gcpXmlSignedUrl && (
                                <a
                                  href={scan.gcpXmlSignedUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="text-[#22d3ee] hover:text-[#67e8f9] text-sm font-semibold"
                                  title="Download XML results"
                                >
                                  XML
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-600 text-sm">—</span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          {scan.gcpReportSignedUrl ? (
                            <a
                              href={scan.gcpReportSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#22d3ee] hover:text-[#67e8f9] text-sm font-semibold"
                              title="Download PDF report"
                            >
                              PDF
                            </a>
                          ) : (
                            <span className="text-gray-600 text-sm">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
