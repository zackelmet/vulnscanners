import Link from "next/link";

/* ─── Data ───────────────────────────────────────────────── */

const scanners = [
  {
    name: "Nmap",
    icon: "🔍",
    summary:
      "Fast external port and service visibility for attack-surface mapping.",
    highlights: [
      "Internet-facing service inventory",
      "Open port verification",
      "Fast baseline checks",
    ],
  },
  {
    name: "Nuclei",
    icon: "⚡",
    summary:
      "Template-based vulnerability detection mapped to current CVE intelligence.",
    highlights: [
      "Continuously updated checks",
      "Actionable finding output",
      "Great for frequent re-testing",
    ],
  },
  {
    name: "OWASP ZAP",
    icon: "🛡️",
    summary: "Automated web-layer security baseline for common app-level risk.",
    highlights: [
      "Automated web security baseline",
      "Crawler + passive analysis",
      "Easy report handoff",
    ],
  },
];

const workflow = [
  {
    step: "01",
    title: "Pick scanner + target",
    copy: "Choose Nmap, Nuclei, or ZAP and run against approved assets.",
  },
  {
    step: "02",
    title: "Run in hosted infrastructure",
    copy: "Scans execute in our hosted backend so your team skips scanner setup and maintenance.",
  },
  {
    step: "03",
    title: "Review results + re-test",
    copy: "Confirm findings quickly, fix issues, and rerun scans in minutes.",
  },
];

const sellingPoints = [
  {
    icon: "📊",
    title: "Executive-ready reporting",
    copy: "Deliver clear summaries for leadership with technical depth your engineering team can action immediately.",
  },
  {
    icon: "🔬",
    title: "Evidence for remediation",
    copy: "Each scan produces concrete findings and context you can use in fix tickets and verification runs.",
  },
  {
    icon: "✅",
    title: "Compliance-friendly output",
    copy: "Generate deliverables that support recurring security reviews and customer or audit conversations.",
  },
  {
    icon: "☁️",
    title: "No install or maintenance",
    copy: "Launch scans without maintaining scanner servers, container images, or update pipelines.",
  },
  {
    icon: "🔧",
    title: "Trusted scanner stack",
    copy: "Run established tools your team already knows: Nmap, Nuclei, and OWASP ZAP in one hosted workflow.",
  },
  {
    icon: "🔁",
    title: "Built for recurring scans",
    copy: "Re-run scans to prove fixes and keep reports current as infrastructure and applications change.",
  },
];

const reportDeliverables = [
  {
    label: "Executive summary",
    detail: "Risk-focused highlights for leadership",
    icon: "📋",
  },
  {
    label: "Technical findings",
    detail: "Reproducible evidence per vulnerability",
    icon: "🧪",
  },
  {
    label: "Remediation guidance",
    detail: "Prioritized fixes your team can action",
    icon: "🎯",
  },
  {
    label: "Re-test tracking",
    detail: "Verification that issues are resolved",
    icon: "🔄",
  },
];

const reportShowcase = [
  {
    title: "External Attack Surface Report",
    subtitle: "Placeholder: replace with your real sample report",
  },
  {
    title: "Web Application Findings Report",
    subtitle: "Placeholder: replace with your real sample report",
  },
  {
    title: "Remediation Verification Report",
    subtitle: "Placeholder: replace with your real sample report",
  },
];

const stats = [
  { value: "3", label: "Industry scanners" },
  { value: "<5 min", label: "Time to first scan" },
  { value: "Zero", label: "Local setup required" },
];

/* ─── Page ───────────────────────────────────────────────── */

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-[rgba(10,10,35,0.92)] text-[--text] relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 pointer-events-none opacity-50">
        <div className="absolute inset-8 neon-grid" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 py-16 lg:py-24 space-y-20 lg:space-y-28">
        {/* ── HERO ───────────────────────────────────────── */}
        <section className="text-center space-y-8 landing-fade-up">
          <div className="flex items-center justify-center">
            <div className="badge badge-outline badge-lg gap-2 border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(0,254,217,0.06)]">
              <span className="inline-block w-2 h-2 rounded-full bg-[var(--primary)] animate-pulse" />
              Hosted vulnerability scanning
            </div>
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.1] text-balance">
            <span className="neon-hero-title">Deliver Security Reports</span>
            <br />
            <span className="text-[var(--text)]">
              That Teams Can Actually Use
            </span>
          </h1>

          <p className="text-base lg:text-lg neon-subtle max-w-2xl mx-auto leading-relaxed text-pretty">
            VulnScanners helps you move from raw scan output to clear,
            actionable deliverables. Run Nmap, Nuclei, and OWASP ZAP from one
            console and share report-ready findings with confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="btn btn-lg neon-primary-btn border-0 gap-2 text-sm font-bold px-8 w-full sm:w-auto"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13 7l5 5m0 0l-5 5m5-5H6"
                />
              </svg>
              Generate My First Report
            </Link>
            <Link
              href="/app/scans"
              className="btn btn-lg btn-outline border-[var(--primary)] text-[var(--text)] hover:bg-[rgba(0,254,217,0.08)] hover:border-[var(--primary)] gap-2 text-sm font-bold px-8 w-full sm:w-auto"
            >
              Open Scanner Console
            </Link>
          </div>

          <div className="flex items-center justify-center gap-2 flex-wrap pt-2">
            {["Nmap", "Nuclei", "OWASP ZAP"].map((name) => (
              <div
                key={name}
                className="badge badge-ghost bg-[rgba(255,255,255,0.04)] border-[var(--border)] text-[var(--text-muted)] text-xs"
              >
                {name}
              </div>
            ))}
          </div>
        </section>

        {/* ── STATS BAR ──────────────────────────────────── */}
        <section className="landing-fade-up">
          <div className="stats stats-horizontal w-full bg-transparent border border-[var(--border-strong)] rounded-2xl shadow-[var(--shadow-glow)] overflow-hidden">
            {stats.map((stat) => (
              <div
                key={stat.label}
                className="stat place-items-center py-6 bg-[rgba(15,22,43,0.7)]"
              >
                <div className="stat-value text-[var(--primary)] text-2xl lg:text-3xl font-black">
                  {stat.value}
                </div>
                <div className="stat-desc text-[var(--text-muted)] text-xs lg:text-sm mt-1 uppercase tracking-wider">
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── SCANNERS ───────────────────────────────────── */}
        <section className="space-y-8 landing-fade-up" id="scanners">
          <div className="text-center space-y-3">
            <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(0,254,217,0.06)] uppercase tracking-widest text-[0.65rem]">
              Three scanners · One workflow
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              Built For Real Security Work
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {scanners.map((scanner) => (
              <div
                key={scanner.name}
                className="card border border-[var(--border-strong)] bg-[rgba(15,22,43,0.8)] shadow-xl landing-card group"
              >
                <div className="card-body p-6 space-y-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{scanner.icon}</span>
                    <h3 className="card-title text-xl tracking-tight text-[var(--text)]">
                      {scanner.name}
                    </h3>
                  </div>
                  <p className="text-sm neon-subtle leading-relaxed">
                    {scanner.summary}
                  </p>
                  <div className="divider my-0 before:bg-[var(--border)] after:bg-[var(--border)]" />
                  <ul className="space-y-2 text-sm">
                    {scanner.highlights.map((item) => (
                      <li key={item} className="flex items-center gap-2">
                        <svg
                          className="w-4 h-4 text-[var(--primary)] shrink-0"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={2.5}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span className="text-[var(--text-muted)]">{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── HOW IT WORKS ───────────────────────────────── */}
        <section className="space-y-8 landing-fade-up" id="how-it-works">
          <div className="text-center space-y-3">
            <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(0,254,217,0.06)] uppercase tracking-widest text-[0.65rem]">
              How it works
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              From Target To Deliverable Report In Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-0 md:gap-0">
            {workflow.map((item, idx) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center p-6 group"
              >
                {idx < workflow.length - 1 && (
                  <div className="hidden md:block absolute top-10 left-[calc(50%+28px)] w-[calc(100%-56px)] h-px bg-gradient-to-r from-[var(--primary)] to-[var(--border)]" />
                )}
                <div className="w-14 h-14 rounded-full border-2 border-[var(--primary)] bg-[rgba(0,254,217,0.08)] flex items-center justify-center text-[var(--primary)] font-black text-lg mb-4 shadow-[0_0_20px_rgba(0,254,217,0.15)] group-hover:shadow-[0_0_30px_rgba(0,254,217,0.3)] transition-shadow">
                  {item.step}
                </div>
                <h3 className="text-lg font-bold mb-2 text-[var(--text)]">
                  {item.title}
                </h3>
                <p className="text-sm neon-subtle leading-relaxed max-w-xs">
                  {item.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        {/* ── REPORT DELIVERABLES ────────────────────────── */}
        <section className="space-y-8 landing-fade-up" id="reports">
          <div className="text-center space-y-3">
            <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(0,254,217,0.06)] uppercase tracking-widest text-[0.65rem]">
              Report deliverables
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              Built Around The Output, Not Just The Scan
            </h2>
            <p className="max-w-2xl mx-auto neon-subtle text-sm lg:text-base leading-relaxed">
              Your team needs more than raw scanner logs. VulnScanners focuses
              on evidence-backed reports that are easy to review, assign, and
              verify.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {reportDeliverables.map((d) => (
              <div
                key={d.label}
                className="card bg-[rgba(15,22,43,0.6)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors landing-card"
              >
                <div className="card-body p-5 items-center text-center gap-3">
                  <span className="text-3xl">{d.icon}</span>
                  <h3 className="font-bold text-sm text-[var(--text)]">
                    {d.label}
                  </h3>
                  <p className="text-xs neon-subtle leading-relaxed">
                    {d.detail}
                  </p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
            {reportShowcase.map((report) => (
              <div
                key={report.title}
                className="card bg-[rgba(15,22,43,0.8)] border border-dashed border-[var(--border)] hover:border-[var(--primary)] transition-colors group landing-card"
              >
                <div className="card-body p-6 items-center text-center gap-3">
                  <div className="w-16 h-16 rounded-xl bg-[rgba(0,254,217,0.06)] border border-[var(--border-strong)] flex items-center justify-center text-2xl group-hover:shadow-[0_0_20px_rgba(0,254,217,0.15)] transition-shadow">
                    📄
                  </div>
                  <h3 className="font-bold text-base text-[var(--text)]">
                    {report.title}
                  </h3>
                  <p className="text-xs neon-subtle">{report.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── WHY VULNSCANNERS ───────────────────────────── */}
        <section className="space-y-8 landing-fade-up" id="why-vulnscanners">
          <div className="text-center space-y-3">
            <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(0,254,217,0.06)] uppercase tracking-widest text-[0.65rem]">
              Why security teams choose us
            </div>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              Selling Points That Matter In Daily Operations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sellingPoints.map((point) => (
              <div
                key={point.title}
                className="card bg-[rgba(15,22,43,0.6)] border border-[var(--border)] hover:border-[var(--border-strong)] transition-colors landing-card"
              >
                <div className="card-body p-6 gap-3">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{point.icon}</span>
                    <h3 className="card-title text-base lg:text-lg text-[var(--text)]">
                      {point.title}
                    </h3>
                  </div>
                  <p className="neon-subtle text-sm leading-relaxed">
                    {point.copy}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── BOTTOM CTA ─────────────────────────────────── */}
        <section
          className="landing-fade-up rounded-3xl border border-[var(--border-strong)] bg-gradient-to-br from-[rgba(0,254,217,0.04)] to-[rgba(0,140,255,0.04)] p-8 lg:p-14 text-center space-y-6 shadow-[0_0_60px_rgba(0,254,217,0.08)]"
          id="cta"
        >
          <div className="badge badge-outline badge-sm border-[var(--border-strong)] text-[var(--primary)] bg-[rgba(0,254,217,0.06)] uppercase tracking-widest text-[0.65rem]">
            Ready to run your first scan?
          </div>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight neon-hero-title">
            Start Delivering Better Security Reports
          </h2>
          <p className="max-w-xl mx-auto neon-subtle text-sm lg:text-base leading-relaxed">
            Unified web app. Three scanners. Evidence-backed output your team
            can triage, fix, and verify.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-center pt-2">
            <Link
              href="/login"
              className="btn btn-lg neon-primary-btn border-0 gap-2 text-sm font-bold px-8 w-full sm:w-auto"
            >
              Create Account
            </Link>
            <Link
              href="/app/scans"
              className="btn btn-lg btn-outline border-[var(--primary)] text-[var(--text)] hover:bg-[rgba(0,254,217,0.08)] hover:border-[var(--primary)] gap-2 text-sm font-bold px-8 w-full sm:w-auto"
            >
              Go To Scanner Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
