// GET /api/dashboard
// Aggregates the signed-in user's scans into the dashboard view model:
// risk counts by severity (via the report-engine parsers/mappers), a health
// score, recent scans, recent risks, discovered targets, and in-progress /
// scheduled counts. Parsing is capped to the most recent scans for latency.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { resolveRawOutput } from "@/lib/report-engine/render-from-doc";
import { parseNmapOutput } from "@/lib/report-engine/nmap-parser";
import { parseNucleiOutput } from "@/lib/report-engine/nuclei-parser";
import { parseZapOutput } from "@/lib/report-engine/zap-parser";
import { mapNmapReport } from "@/lib/report-engine/mappers/nmap-mapper";
import { mapNucleiReport } from "@/lib/report-engine/mappers/nuclei-mapper";
import { mapZapReport } from "@/lib/report-engine/mappers/zap-mapper";
import { ScanReportData } from "@/lib/report-engine/report-data";
import { Severity, SEVERITY_ORDER } from "@/lib/report-engine/templates/_theme";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type ScannerType = "nmap" | "nuclei" | "zap";

// Most recent completed scans to parse for risk aggregation (bounds latency).
const PARSE_CAP = 40;
// Severity → health-score penalty weight. Deliberately lenient so a clean-ish
// posture still scores well (a single critical ≈ 88, not 75).
const WEIGHT: Record<Severity, number> = {
  critical: 12,
  high: 5,
  medium: 1.5,
  low: 0.5,
  info: 0,
  accepted: 0,
};

function emptyCounts(): Record<Severity, number> {
  return SEVERITY_ORDER.reduce(
    (a, k) => ((a[k] = 0), a),
    {} as Record<Severity, number>,
  );
}

function buildReportData(
  scanId: string,
  scannerType: ScannerType,
  target: string,
  raw: string,
  completedAt: Date,
  command: string | null,
): ScanReportData {
  const common = { scanId, target, startedAt: completedAt, completedAt };
  if (scannerType === "nmap")
    return mapNmapReport({ ...common, parsed: parseNmapOutput(raw) });
  if (scannerType === "nuclei")
    return mapNucleiReport({
      ...common,
      parsed: parseNucleiOutput(raw),
      command,
    });
  return mapZapReport({ ...common, parsed: parseZapOutput(raw), command });
}

function gradeFor(score: number): string {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

const SCANNER_LABEL: Record<ScannerType, string> = {
  nmap: "Nmap Network Scan",
  nuclei: "Nuclei Vulnerability Scan",
  zap: "OWASP ZAP Web Scan",
};

export async function GET(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const auth = admin.auth();
    const firestore = admin.firestore();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let decoded;
    try {
      decoded = await auth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = decoded.uid;

    const userRef = firestore.collection("users").doc(userId);

    // Pull recent scans (sorted in memory to avoid an index requirement).
    const snap = await userRef.collection("completedScans").limit(120).get();
    const scans = snap.docs
      .map((d) => ({ id: d.id, ...(d.data() as any) }))
      .sort(
        (a, b) =>
          (b.createdAt?.toMillis?.() ?? b.startTime?.toMillis?.() ?? 0) -
          (a.createdAt?.toMillis?.() ?? a.startTime?.toMillis?.() ?? 0),
      );

    const inProgress = scans.filter(
      (s) => s.status === "queued" || s.status === "in_progress",
    ).length;

    const completed = scans.filter((s) => s.status === "completed");

    // Recent scans (any status) for the activity feed.
    const recentScans = scans.slice(0, 6).map((s) => ({
      scanId: s.id,
      scannerType: (s.scannerType || s.type) as ScannerType,
      label: SCANNER_LABEL[(s.scannerType || s.type) as ScannerType] || "Scan",
      target: s.target || s.targetValue || "—",
      status: s.status,
      completedAtMs:
        s.endTime?.toMillis?.() ?? s.startTime?.toMillis?.() ?? null,
    }));

    // Parse the most recent completed scans for severity-classified risks.
    const riskCounts = emptyCounts();
    const recentRisks: {
      title: string;
      severity: Severity;
      scannerType: ScannerType;
      target: string;
    }[] = [];
    const targetMap = new Map<string, Record<Severity, number>>();

    for (const s of completed.slice(0, PARSE_CAP)) {
      const scannerType = (s.scannerType || s.type) as ScannerType;
      if (!["nmap", "nuclei", "zap"].includes(scannerType)) continue;
      const target = s.target || s.targetValue || "—";
      let raw = "";
      try {
        raw = await resolveRawOutput(admin, s, scannerType);
      } catch {
        continue;
      }
      if (!raw) continue;
      let data: ScanReportData;
      try {
        data = buildReportData(
          s.id,
          scannerType,
          target,
          raw,
          s.endTime?.toDate?.() ?? new Date(),
          s.rawPayload?.cmd ?? null,
        );
      } catch {
        continue;
      }

      for (const k of SEVERITY_ORDER)
        riskCounts[k] += data.severityCounts[k] || 0;

      const tCounts = targetMap.get(target) ?? emptyCounts();
      for (const k of SEVERITY_ORDER) tCounts[k] += data.severityCounts[k] || 0;
      targetMap.set(target, tCounts);

      for (const f of data.findings)
        recentRisks.push({
          title: f.title,
          severity: f.severity,
          scannerType,
          target,
        });
    }

    // Sort risks by severity (most severe first), keep the top few.
    recentRisks.sort(
      (a, b) =>
        SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity),
    );

    const totalRisks = SEVERITY_ORDER.filter((k) => k !== "accepted").reduce(
      (sum, k) => sum + riskCounts[k],
      0,
    );

    const penalty = SEVERITY_ORDER.reduce(
      (sum, k) => sum + riskCounts[k] * WEIGHT[k],
      0,
    );
    const healthScore = Math.max(0, Math.min(100, 100 - penalty));

    // Scheduled scans (enabled).
    let scheduled = 0;
    try {
      const schedSnap = await userRef.collection("scheduledScans").get();
      scheduled = schedSnap.docs.filter(
        (d) => (d.data() as any).enabled !== false,
      ).length;
    } catch {
      scheduled = 0;
    }

    const targets = Array.from(targetMap, ([target, counts]) => ({
      target,
      counts,
      total: SEVERITY_ORDER.filter((k) => k !== "accepted").reduce(
        (s, k) => s + counts[k],
        0,
      ),
    })).sort((a, b) => b.total - a.total);

    return NextResponse.json({
      riskCounts,
      totalRisks,
      healthScore,
      grade: gradeFor(healthScore),
      inProgress,
      scheduled,
      recentScans,
      recentRisks: recentRisks.slice(0, 6),
      targets: targets.slice(0, 8),
      totalTargets: targetMap.size,
      completedCount: completed.length,
    });
  } catch (err: any) {
    console.error("dashboard aggregation failed:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
