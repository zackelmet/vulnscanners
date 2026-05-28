// Nmap parser output → ScanReportData.
// Each open port on each host becomes a finding. Severity from portRisk().

import {
  ParsedNmapReport,
  ParsedHost,
  ParsedPort,
} from "../types";
import { portRisk, RiskLevel } from "../nmap-parser";
import {
  ReportFinding,
  ScanReportData,
  Severity,
  VerifyStep,
} from "../report-data";
import {
  buildFindingsOverview,
  buildSeverityCounts,
  CONFIDENTIALITY_STATEMENT,
  GLOSSARY,
  pickKeyFindings,
} from "./_shared";

// Map RiskLevel → Severity used by the template.
const RISK_TO_SEV: Record<RiskLevel, Severity> = {
  high: "high",
  medium: "medium",
  low: "low",
  info: "info",
};

// Per-service business-impact + remediation snippets.
const SERVICE_GUIDE: Record<string, { impact: string; remediation: string[] }> =
  {
    ssh: {
      impact:
        "SSH provides shell-level access to the host. Exposure to the public internet enables credential-stuffing, brute-force, and exploitation of known SSH vulnerabilities (e.g. CVE-2023-48795 Terrapin). Compromise typically results in full host takeover and lateral movement into adjacent systems.",
      remediation: [
        "Restrict inbound SSH to known administrative IP ranges via firewall/Security Group rules.",
        "Disable password authentication and require SSH public keys.",
        "Disable root login (PermitRootLogin no).",
        "Keep OpenSSH patched — recent CVEs require active maintenance.",
        "Consider a bastion host or zero-trust proxy in front of SSH.",
      ],
    },
    ftp: {
      impact:
        "FTP transmits credentials and file contents in plaintext, making it trivially eavesdropped on shared networks. The protocol is broadly considered insecure for any data-handling use case.",
      remediation: [
        "Replace FTP with SFTP (SSH-based) or FTPS (TLS-wrapped) for file transfer.",
        "If FTP must remain reachable, restrict it to a private network only.",
        "Audit historical access for credential exposure.",
      ],
    },
    telnet: {
      impact:
        "Telnet exposes shell access over an unencrypted protocol. Credentials and commands are visible in plaintext to any on-path observer. This is a critical exposure and should be disabled immediately.",
      remediation: [
        "Disable telnet on the host and remove the binary if not required.",
        "Replace any operational use of telnet with SSH.",
        "Audit historical access logs for unauthorised use.",
      ],
    },
    http: {
      impact:
        "An HTTP service is reachable. Without TLS, all traffic — including session tokens — is exposed to passive observers. Search engines and threat actors actively crawl HTTP endpoints looking for misconfiguration and known vulnerabilities.",
      remediation: [
        "Redirect all HTTP traffic to HTTPS and enable HSTS.",
        "Ensure the application behind this port is patched and configured securely.",
        "Restrict admin interfaces by IP allow-list.",
      ],
    },
    https: {
      impact:
        "An HTTPS service is exposed. Confirm the TLS configuration is current (TLS 1.2+ minimum, modern cipher suites) and that the application is patched.",
      remediation: [
        "Verify TLS configuration meets Mozilla's Modern profile.",
        "Confirm the certificate chain is valid and the certificate is auto-renewing.",
        "Patch the application behind this port regularly.",
      ],
    },
    smtp: {
      impact:
        "An SMTP service is exposed. Open SMTP can be abused as an open relay for spam and may leak internal hostnames in server banners. Authenticated SMTP services are also subject to credential-stuffing.",
      remediation: [
        "Disable open relay; require authentication for outbound mail.",
        "Strip internal hostnames from EHLO/HELO responses.",
        "Restrict the service to known mail-handling networks if it is not user-facing.",
      ],
    },
    rdp: {
      impact:
        "Remote Desktop Protocol provides full graphical session access to the host. Public exposure is associated with high rates of brute-force, credential-stuffing, and ransomware deployment.",
      remediation: [
        "Restrict RDP to administrative IP ranges via firewall.",
        "Place RDP behind a VPN or zero-trust gateway.",
        "Enforce strong account lockout and MFA on accounts that can RDP.",
      ],
    },
    mysql: {
      impact:
        "A MySQL database is reachable. Direct database exposure enables credential-stuffing and exploitation of database-tier vulnerabilities. A compromise here typically yields the application's full data set.",
      remediation: [
        "Restrict database access to application-tier hosts only.",
        "Require TLS for all client connections.",
        "Rotate database credentials and audit user privileges.",
      ],
    },
    snmp: {
      impact:
        "SNMP services frequently leak system inventory, network topology, and user information when polled. Default community strings (`public`, `private`) are still common.",
      remediation: [
        "Upgrade to SNMPv3 with authentication + encryption.",
        "Restrict the service to known monitoring hosts only.",
        "Replace any default community strings.",
      ],
    },
    rpcbind: {
      impact:
        "rpcbind/portmapper exposes RPC service mappings and historically has been used to amplify DDoS attacks. It rarely needs to be internet-reachable.",
      remediation: [
        "Restrict rpcbind to the host's loopback interface or trusted subnets.",
        "If RPC services are not required, disable the daemon.",
      ],
    },
  };

const GENERIC: { impact: string; remediation: string[] } = {
  impact:
    "An additional network service is exposed on this port. Every exposed service expands the attack surface and should be justified, monitored, and patched.",
  remediation: [
    "Confirm this service is required to be reachable from its current network position.",
    "Restrict access to known clients via firewall rules where possible.",
    "Ensure the service software is kept current and monitored for failed authentication attempts.",
  ],
};

function findingForOpenPort(
  host: ParsedHost,
  port: ParsedPort,
  index: number,
): ReportFinding {
  const risk = portRisk(port);
  const severity = RISK_TO_SEV[risk];
  const svc = port.service.toLowerCase();
  const hostLabel = host.hostname
    ? `${host.hostname} (${host.ip})`
    : host.ip;
  const guide = SERVICE_GUIDE[svc] ?? GENERIC;

  const title = `Exposed ${port.service || "unknown"} service on ${port.protocol.toUpperCase()}/${port.port}`;

  const description =
    `Port ${port.port}/${port.protocol} on ${hostLabel} is open and serving "${port.service || "unknown"}"` +
    (port.version ? ` (${port.version}).` : ".") +
    " The service is reachable from our scanner host, indicating it is exposed to general internet traffic.";

  const verifySteps: VerifyStep[] = [
    {
      text: `Confirm the port is open and capture the service banner with nmap:`,
      code: `nmap -sV -p ${port.port} ${host.ip}`,
    },
    {
      text: `Inspect the service directly:`,
      code: bannerProbe(port),
    },
  ];

  return {
    id: `NM-${index}`,
    title,
    severity,
    state: "Unresolved",
    description,
    businessImpact: guide.impact,
    howToVerify: verifySteps,
    remediation: guide.remediation,
  };
}

function findingForFilteredPort(
  host: ParsedHost,
  port: ParsedPort,
  index: number,
): ReportFinding {
  const hostLabel = host.hostname
    ? `${host.hostname} (${host.ip})`
    : host.ip;
  return {
    id: `NM-${index}`,
    title: `Filtered ${port.service || "unknown"} on ${port.protocol.toUpperCase()}/${port.port}`,
    severity: "info",
    state: "Unresolved",
    description:
      `Port ${port.port}/${port.protocol} on ${hostLabel} is filtered. A network device (firewall, security group, or NAT) is dropping inbound connection attempts to this port, so we cannot determine whether a service is listening behind it.`,
    businessImpact:
      "Filtered ports are not exposed services and do not represent a vulnerability on their own. They are listed here for completeness — they indicate that a firewall layer is present and active in front of this host.",
    howToVerify: [
      {
        text: "Re-run nmap with a single-port probe to confirm the filtered state:",
        code: `nmap -sV -Pn -p ${port.port} ${host.ip}`,
      },
    ],
    remediation: [
      "No action is required if the filter is intentional.",
      "If you expected this port to be reachable, audit the upstream firewall / security-group rules.",
    ],
  };
}

function bannerProbe(port: ParsedPort): string {
  const svc = port.service.toLowerCase();
  if (svc === "http" || svc === "https" || svc === "http-proxy") {
    return `curl -sI ${svc === "http" || svc === "http-proxy" ? "http" : "https"}://<host>:${port.port}/`;
  }
  if (svc === "ssh") return `ssh -v -p ${port.port} <host>`;
  return `nc -vz <host> ${port.port}`;
}

export function mapNmapReport(args: {
  parsed: ParsedNmapReport;
  scanId: string;
  target: string;
  startedAt: Date;
  completedAt: Date;
}): ScanReportData {
  const findings: ReportFinding[] = [];
  let index = 1;
  for (const host of args.parsed.hosts) {
    if (host.state !== "up") continue;
    for (const port of host.ports) {
      if (port.state === "open") {
        findings.push(findingForOpenPort(host, port, index++));
      } else if (port.state === "filtered") {
        findings.push(findingForFilteredPort(host, port, index++));
      }
    }
  }
  // Sort by severity desc so PT-1 lines up with the highest severity in display order.
  const sevOrder = ["critical", "high", "medium", "low", "info"] as const;
  findings.sort(
    (a, b) =>
      sevOrder.indexOf(a.severity) - sevOrder.indexOf(b.severity),
  );
  // Re-number after the sort.
  findings.forEach((f, i) => {
    f.id = `NM-${i + 1}`;
  });

  const counts = buildSeverityCounts(findings);
  const keyFindings = pickKeyFindings(findings);

  const hostsLine =
    args.parsed.meta.hostsUp +
    "/" +
    args.parsed.meta.totalHosts +
    " hosts responded";
  const portsLine =
    args.parsed.meta.openPortsTotal +
    " open port" +
    (args.parsed.meta.openPortsTotal === 1 ? "" : "s") +
    " across the scan";

  return {
    scanId: args.scanId,
    scannerType: "nmap",
    target: args.target,
    startedAt: args.startedAt,
    completedAt: args.completedAt,
    durationSec: args.parsed.meta.durationSec,
    command: args.parsed.meta.command,
    severityCounts: counts,
    keyFindings,
    findings,
    confidentialityStatement: CONFIDENTIALITY_STATEMENT,
    findingsOverview:
      `${hostsLine}; ${portsLine}. ` +
      buildFindingsOverview(counts, "exposed service"),
    methodology: {
      description:
        "VulnScanners performs network reconnaissance using Nmap from our hosted scanner host. The scan enumerates listening TCP services, identifies the software and version behind each port, and classifies risk based on service class.",
      tools: [
        `Nmap ${args.parsed.meta.rawVersion ?? ""} with service-version detection (-sV)`,
        "Service classification — HIGH_RISK_SERVICES, MEDIUM_RISK_SERVICES (VulnScanners)",
        "OWASP Testing Guide v4.2 — Information Gathering chapter",
      ],
      scope:
        `External TCP scan of ${args.target}. Results reflect the network vantage of our hosted scanner host at the time of the scan.`,
    },
    coverage: [
      {
        heading: "Network exposure",
        items: [
          "TCP port discovery (top 1000 or user-selected)",
          "Service-version detection",
          "Banner capture",
          "Host-state inference",
          "OS / Service Info detection",
        ],
      },
      {
        heading: "Risk classes flagged",
        items: [
          "Plaintext remote-shell services (telnet, rsh, rlogin)",
          "Plaintext file-transfer (FTP, TFTP)",
          "Remote-desktop services (RDP, VNC, X11)",
          "Information-leakage services (SNMP, finger, rpcbind)",
          "Database services (MySQL, MSSQL, MongoDB, Redis)",
        ],
      },
    ],
    glossary: GLOSSARY,
  };
}
