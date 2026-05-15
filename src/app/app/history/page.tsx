"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faSatelliteDish,
  faFileAlt,
  faSpinner,
} from "@fortawesome/free-solid-svg-icons";
import { useUserScans } from "@/lib/hooks/useUserScans";
import { useAuth } from "@/lib/context/AuthContext";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function HistoryPage() {
  const { currentUser } = useAuth();
  const { scans: userScans = [], loading: scansLoading } = useUserScans(
    currentUser?.uid ?? null,
  );

  const [generatingReport, setGeneratingReport] = useState<string | null>(null);

  const generateReport = async (scanId: string) => {
    if (!currentUser) return;
    setGeneratingReport(scanId);
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/scans/${scanId}/report`, {
        headers: { Authorization: `Bearer ${token}` },
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
      a.download = fnMatch?.[1] || `report-${scanId.slice(0, 8)}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err?.message || "Report generation failed");
    } finally {
      setGeneratingReport(null);
    }
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

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-full bg-[#07090d] min-h-screen">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light text-[#e6edf5]">Scan History</h1>
          <p className="text-[#9aa5b6] mt-1">
            View and download results from your completed scans
          </p>
        </div>

        {/* History Table */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl shadow-sm overflow-hidden">
          {scansLoading ? (
            <div className="p-12 text-center text-[#9aa5b6]">
              Loading scans...
            </div>
          ) : userScans.length === 0 ? (
            <div className="p-12 text-center">
              <FontAwesomeIcon
                icon={faSatelliteDish}
                className="text-5xl text-[#697080] mb-4"
              />
              <p className="text-[#9aa5b6]">
                No scan history available. Your completed scans will appear
                here.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-[#11161f] border-b border-[#161b24]">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      ID
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      Target
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      Started
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      Result Files
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-semibold text-[#9aa5b6] uppercase">
                      Reports
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161b24]">
                  {userScans.map((scan: any) => (
                    <tr
                      key={scan.scanId}
                      className={`hover:bg-[#11161f] ${scan.batchId ? "border-l-4 border-l-[#0366d6]" : ""}`}
                    >
                      <td className="px-6 py-4 text-sm text-[#e6edf5]">
                        <div className="font-mono">
                          {scan.scanId.substring(0, 8)}
                        </div>
                        {scan.batchId && (
                          <div className="text-xs text-[#4493f8] mt-1">
                            batch: {scan.batchId.substring(0, 8)}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-[#0366d6] text-white text-xs font-semibold rounded uppercase">
                          {scan.type}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#e6edf5]">
                        {scan.target}
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`px-2 py-1 text-xs font-semibold rounded ${
                            scan.status === "completed"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : scan.status === "in_progress"
                                ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                                : "bg-[#697080]/20 text-[#9aa5b6] border border-[#697080]/30"
                          }`}
                        >
                          {scan.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-[#9aa5b6]">
                        {formatDate(scan.startTime || scan.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-sm text-[#9aa5b6] font-mono">
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
                                className="text-[#4493f8] hover:text-[#0366d6] text-sm font-semibold"
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
                                className="text-[#4493f8] hover:text-[#0366d6] text-sm font-semibold"
                                title="Download XML results"
                              >
                                XML
                              </a>
                            )}
                          </div>
                        ) : (
                          <span className="text-[#697080] text-sm">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col gap-1">
                          {scan.gcpReportSignedUrl && (
                            <a
                              href={scan.gcpReportSignedUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[#4493f8] hover:text-[#0366d6] text-sm font-semibold"
                              title="Download PDF report"
                            >
                              PDF
                            </a>
                          )}
                          {(scan.type === "nmap" ||
                            scan.scannerType === "nmap") &&
                            scan.status === "completed" && (
                              <button
                                onClick={() => generateReport(scan.scanId)}
                                disabled={generatingReport === scan.scanId}
                                className="flex items-center gap-1 text-[#4493f8] hover:text-[#0366d6] text-sm font-semibold disabled:opacity-50"
                                title="Generate branded PDF report"
                              >
                                <FontAwesomeIcon
                                  icon={
                                    generatingReport === scan.scanId
                                      ? faSpinner
                                      : faFileAlt
                                  }
                                  className={
                                    generatingReport === scan.scanId
                                      ? "animate-spin"
                                      : ""
                                  }
                                />
                                {generatingReport === scan.scanId
                                  ? "Generating…"
                                  : "Report"}
                              </button>
                            )}
                          {!scan.gcpReportSignedUrl &&
                            scan.type !== "nmap" &&
                            scan.scannerType !== "nmap" && (
                              <span className="text-[#697080] text-sm">—</span>
                            )}
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
