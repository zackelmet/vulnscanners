// Top-level renderer: takes a scan record, picks the right parser + mapper,
// runs the React-PDF template, and returns the resulting PDF bytes.

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ScanReport } from "./templates/ScanReport";
import {
  CombinedReport,
  CombinedReportData,
  CombinedReportScan,
} from "./templates/CombinedReport";
import { parseNmapOutput } from "./nmap-parser";
import { parseNucleiOutput } from "./nuclei-parser";
import { parseZapOutput } from "./zap-parser";
import { mapNmapReport } from "./mappers/nmap-mapper";
import { mapNucleiReport } from "./mappers/nuclei-mapper";
import { mapZapReport } from "./mappers/zap-mapper";
import { ScanReportData, Severity } from "./report-data";
import { ScannerType } from "./types";

export interface RenderArgs {
  scanId: string;
  scannerType: ScannerType;
  target: string;
  rawOutput: string;
  startedAt: Date;
  completedAt: Date;
  /** Optional — only nmap output embeds the original command. */
  command?: string | null;
}

export function buildReportData(args: RenderArgs): ScanReportData {
  const common = {
    scanId: args.scanId,
    target: args.target,
    startedAt: args.startedAt,
    completedAt: args.completedAt,
  };
  switch (args.scannerType) {
    case "nmap":
      return mapNmapReport({ ...common, parsed: parseNmapOutput(args.rawOutput) });
    case "nuclei":
      return mapNucleiReport({
        ...common,
        parsed: parseNucleiOutput(args.rawOutput),
        command: args.command ?? null,
      });
    case "zap":
      return mapZapReport({
        ...common,
        parsed: parseZapOutput(args.rawOutput),
        command: args.command ?? null,
      });
  }
}

export async function renderScanReport(args: RenderArgs): Promise<Buffer> {
  const data = buildReportData(args);
  return renderToBuffer(<ScanReport data={data} />);
}

// ── Combined multi-scan report ────────────────────────────────────────────────

const SEVERITIES: Severity[] = ["critical", "high", "medium", "low", "info", "accepted"];

/** One scan's inputs for a combined report (same shape as RenderArgs). */
export type CombinedScanArgs = RenderArgs;

export interface CombinedRenderArgs {
  generatedAt: Date;
  scans: CombinedScanArgs[];
}

export async function renderCombinedReport(
  args: CombinedRenderArgs,
): Promise<Buffer> {
  const scans: CombinedReportScan[] = args.scans.map((scanArgs) => ({
    scanId: scanArgs.scanId,
    scannerType: scanArgs.scannerType,
    target: scanArgs.target,
    data: buildReportData(scanArgs),
  }));

  const aggregateSeverityCounts = SEVERITIES.reduce(
    (acc, sev) => {
      acc[sev] = scans.reduce(
        (sum, s) => sum + (s.data.severityCounts[sev] || 0),
        0,
      );
      return acc;
    },
    {} as Record<Severity, number>,
  );

  const totalFindings = scans.reduce(
    (sum, s) => sum + s.data.findings.length,
    0,
  );

  const data: CombinedReportData = {
    generatedAt: args.generatedAt,
    scans,
    aggregateSeverityCounts,
    totalFindings,
  };

  return renderToBuffer(<CombinedReport data={data} />);
}
