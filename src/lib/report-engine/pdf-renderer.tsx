// Top-level renderer: takes a scan record, picks the right parser + mapper,
// runs the React-PDF template, and returns the resulting PDF bytes.

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { ScanReport } from "./templates/ScanReport";
import { parseNmapOutput } from "./nmap-parser";
import { parseNucleiOutput } from "./nuclei-parser";
import { parseZapOutput } from "./zap-parser";
import { mapNmapReport } from "./mappers/nmap-mapper";
import { mapNucleiReport } from "./mappers/nuclei-mapper";
import { mapZapReport } from "./mappers/zap-mapper";
import { ScanReportData } from "./report-data";
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
