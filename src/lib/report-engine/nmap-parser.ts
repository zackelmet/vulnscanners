// ─── Nmap stdout parser ────────────────────────────────────────────────────────
// Parses plain-text nmap output (the default human-readable format) into a
// strongly-typed ParsedNmapReport. Handles the common Nmap 7.x output style.

import {
  ParsedNmapReport,
  ParsedHost,
  ParsedPort,
  NmapScanMeta,
} from "./types";

// Regex patterns
const RE_HOST_HEADER =
  /^Nmap scan report for (.+?)(?:\s+\((\d{1,3}(?:\.\d{1,3}){3})\))?$/;
const RE_HOST_IP_ONLY = /^Nmap scan report for (\d{1,3}(?:\.\d{1,3}){3})$/;
const RE_HOST_UP = /^Host is up\s+\(?([\d.]+s)?\)?/;
const RE_HOST_DOWN = /^Host seems down/i;
const RE_PORT_LINE =
  /^(\d+)\/(tcp|udp)\s+(open|closed|filtered|open\|filtered)\s+(\S+)(?:\s+(.+))?$/;
const RE_DONE =
  /^Nmap done:\s+(\d+)\s+IP address(?:es)?\s+\((\d+)\s+host[s]?\s+up\)/;
const RE_START = /^Starting Nmap ([\d.]+)/;
const RE_COMMAND = /^#\s*(.+nmap.+)$/i;
const RE_OS = /^OS details?:\s+(.+)$/i;
const RE_LATENCY = /\(([\d.]+s)\s+latency\)/;
const RE_DURATION = /scanned in ([\d.]+) seconds/;

function parsePort(line: string): ParsedPort | null {
  const m = RE_PORT_LINE.exec(line.trim());
  if (!m) return null;
  return {
    port: parseInt(m[1], 10),
    protocol: m[2],
    state: m[3],
    service: m[4] || "",
    version: (m[5] || "").trim(),
  };
}

function parseHostHeader(
  line: string,
): { hostname: string | null; ip: string } | null {
  // "Nmap scan report for hostname (1.2.3.4)"
  let m = RE_HOST_HEADER.exec(line);
  if (m) {
    if (m[2]) {
      // hostname (ip)
      return { hostname: m[1].trim(), ip: m[2] };
    }
    // may be bare IP
    return { hostname: null, ip: m[1].trim() };
  }
  // "Nmap scan report for 1.2.3.4"
  m = RE_HOST_IP_ONLY.exec(line);
  if (m) return { hostname: null, ip: m[1] };
  return null;
}

export function parseNmapOutput(raw: string): ParsedNmapReport {
  const lines = raw.split("\n");
  const hosts: ParsedHost[] = [];
  let currentHost: ParsedHost | null = null;
  let rawVersion: string | null = null;
  let totalHosts = 0;
  let hostsUp = 0;
  let hostsDown = 0;
  let durationSec: number | null = null;
  let command: string | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) continue;

    // ── Nmap version / start line ──────────────────────────────────────────
    const startM = RE_START.exec(trimmed);
    if (startM) {
      rawVersion = startM[1];
      continue;
    }

    // ── Command (appears as comment in some outputs) ───────────────────────
    const cmdM = RE_COMMAND.exec(trimmed);
    if (cmdM && !command) {
      command = cmdM[1];
      continue;
    }

    // ── Host header ────────────────────────────────────────────────────────
    const hostHeader = parseHostHeader(trimmed);
    if (hostHeader) {
      if (currentHost) hosts.push(currentHost);
      currentHost = {
        ip: hostHeader.ip,
        hostname: hostHeader.hostname,
        state: "unknown",
        latency: null,
        os: null,
        ports: [],
      };
      continue;
    }

    // ── Host state ─────────────────────────────────────────────────────────
    if (currentHost) {
      const upM = RE_HOST_UP.exec(trimmed);
      if (upM) {
        currentHost.state = "up";
        const latM = RE_LATENCY.exec(trimmed);
        if (latM) currentHost.latency = latM[1];
        continue;
      }

      if (RE_HOST_DOWN.test(trimmed)) {
        currentHost.state = "down";
        continue;
      }

      // ── OS ─────────────────────────────────────────────────────────────
      const osM = RE_OS.exec(trimmed);
      if (osM) {
        currentHost.os = osM[1].trim();
        continue;
      }

      // ── Port line ─────────────────────────────────────────────────────
      const port = parsePort(trimmed);
      if (port) {
        currentHost.ports.push(port);
        continue;
      }
    }

    // ── Nmap done line ─────────────────────────────────────────────────────
    const doneM = RE_DONE.exec(trimmed);
    if (doneM) {
      totalHosts = parseInt(doneM[1], 10);
      hostsUp = parseInt(doneM[2], 10);
      hostsDown = totalHosts - hostsUp;
      const durM = RE_DURATION.exec(trimmed);
      if (durM) durationSec = parseFloat(durM[1]);
      continue;
    }
  }

  // Push the last host
  if (currentHost) hosts.push(currentHost);

  // Fallback counts
  if (totalHosts === 0) totalHosts = hosts.length;
  if (hostsUp === 0) hostsUp = hosts.filter((h) => h.state === "up").length;

  const openPortsTotal = hosts.reduce(
    (acc, h) => acc + h.ports.filter((p) => p.state === "open").length,
    0,
  );

  const meta: NmapScanMeta = {
    startTime: null,
    endTime: null,
    durationSec,
    command,
    rawVersion,
    totalHosts,
    hostsUp,
    hostsDown,
    openPortsTotal,
  };

  return { meta, hosts, rawOutput: raw };
}

// ── Risk classification helpers ────────────────────────────────────────────────

const HIGH_RISK_SERVICES = new Set([
  "ftp",
  "telnet",
  "rsh",
  "rlogin",
  "rexec",
  "tftp",
  "finger",
  "smtp",
  "pop3",
  "imap",
  "snmp",
  "netbios-ssn",
  "microsoft-ds",
  "ms-wbt-server",
  "rdp",
  "vnc",
  "x11",
]);

const MEDIUM_RISK_SERVICES = new Set([
  "http",
  "mysql",
  "ms-sql-s",
  "oracle",
  "redis",
  "mongodb",
  "cassandra",
  "memcache",
  "nfs",
  "ipp",
  "ajp13",
]);

export type RiskLevel = "high" | "medium" | "low" | "info";

export function portRisk(port: ParsedPort): RiskLevel {
  const svc = port.service.toLowerCase();
  if (HIGH_RISK_SERVICES.has(svc)) return "high";
  if (MEDIUM_RISK_SERVICES.has(svc)) return "medium";
  if (port.port === 443 || port.port === 22) return "low";
  // Common unexplained high port = info
  if (port.port > 1024) return "info";
  return "low";
}

export function riskLabel(level: RiskLevel): string {
  return level.charAt(0).toUpperCase() + level.slice(1);
}

export function riskColor(level: RiskLevel): string {
  switch (level) {
    case "high":
      return "#dc2626"; // red-600
    case "medium":
      return "#d97706"; // amber-600
    case "low":
      return "#2563eb"; // blue-600
    default:
      return "#6b7280"; // gray-500
  }
}
