import Link from "next/link";

const scanners = [
  {
    name: "Nmap",
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
    title: "Pick scanner + target",
    copy: "Choose Nmap, Nuclei, or ZAP and run against approved assets.",
  },
  {
    title: "Run in hosted infrastructure",
    copy: "Scans execute in our hosted backend so your team skips scanner setup and maintenance.",
  },
  {
    title: "Review results + re-test",
    copy: "Confirm findings quickly, fix issues, and rerun scans in minutes.",
  },
];

const sellingPoints = [
  {
    title: "Executive-ready reporting",
    copy: "Deliver clear summaries for leadership with technical depth your engineering team can action immediately.",
  },
  {
    title: "Evidence for remediation",
    copy: "Each scan produces concrete findings and context you can use in fix tickets and verification runs.",
  },
  {
    title: "Compliance-friendly output",
    copy: "Generate deliverables that support recurring security reviews and customer or audit conversations.",
  },
  {
    title: "No install or maintenance",
    copy: "Launch scans without maintaining scanner servers, container images, or update pipelines.",
  },
  {
    title: "Trusted scanner stack",
    copy: "Run established tools your team already knows: Nmap, Nuclei, and OWASP ZAP in one hosted workflow.",
  },
  {
    title: "Built for recurring scans",
    copy: "Re-run scans to prove fixes and keep reports current as infrastructure and applications change.",
  },
];

const reportDeliverables = [
  "Executive summary with risk-focused highlights",
  "Technical findings with reproducible evidence",
  "Prioritized remediation guidance for teams",
  "Re-test tracking for fix verification",
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

export default function Home() {
  return (
    <main className="min-h-screen w-full bg-[rgba(10,10,35,0.92)] text-[--text] relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none opacity-70">
        <div className="absolute inset-8 neon-grid" />
      </div>

      <div className="relative w-full max-w-6xl mx-auto px-5 sm:px-6 lg:px-10 py-12 lg:py-20 space-y-14 lg:space-y-20">
        <section className="text-center space-y-6 landing-fade-up">
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <span className="neon-chip">Hosted vulnerability scanning</span>
            <span className="neon-badge-muted">Nmap • Nuclei • OWASP ZAP</span>
          </div>

          <h1 className="text-4xl lg:text-6xl font-black tracking-tight neon-hero-title leading-tight text-balance">
            Deliver Security Reports That Teams Can Actually Use
          </h1>

          <p className="text-base lg:text-xl neon-subtle max-w-3xl mx-auto leading-relaxed text-pretty">
            VulnScanners helps you move from raw scan output to clear,
            actionable deliverables. Run Nmap, Nuclei, and OWASP ZAP from one
            console and share report-ready findings with confidence.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="neon-primary-btn px-6 py-3 font-semibold text-sm w-full sm:w-auto text-center"
            >
              Generate My First Report
            </Link>
            <Link
              href="/app/scans"
              className="neon-outline-btn px-6 py-3 font-semibold text-sm w-full sm:w-auto text-center"
            >
              Open Scanner Console
            </Link>
          </div>
        </section>

        <section className="space-y-6 landing-fade-up" id="scanners">
          <div className="text-center space-y-2">
            <span className="neon-chip">Three scanners. One workflow.</span>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              Built For Real Security Work
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {scanners.map((scanner) => (
              <article
                key={scanner.name}
                className="neon-card landing-card p-5 lg:p-6 space-y-4"
              >
                <div>
                  <h3 className="text-xl font-bold tracking-tight">
                    {scanner.name}
                  </h3>
                  <p className="mt-2 text-sm neon-subtle leading-relaxed">
                    {scanner.summary}
                  </p>
                </div>

                <ul className="space-y-2 text-sm">
                  {scanner.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2">
                      <span className="text-[var(--primary)] mt-[2px]">•</span>
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
          </div>
        </section>

        <section
          className="neon-card landing-fade-up p-6 lg:p-8 space-y-6"
          id="how-it-works"
        >
          <div className="text-center space-y-2">
            <span className="neon-chip">How it works</span>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              From Target To Deliverable Report In Minutes
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {workflow.map((step, index) => (
              <div
                key={step.title}
                className="neon-border landing-card p-4 rounded-xl bg-[rgba(255,255,255,0.02)]"
              >
                <div className="text-xs uppercase tracking-wider text-[var(--primary)] mb-2">
                  Step {index + 1}
                </div>
                <h3 className="text-lg font-semibold mb-2">{step.title}</h3>
                <p className="text-sm neon-subtle leading-relaxed">
                  {step.copy}
                </p>
              </div>
            ))}
          </div>
        </section>

        <section
          className="neon-card landing-fade-up p-6 lg:p-8 space-y-6"
          id="reports"
        >
          <div className="text-center space-y-2">
            <span className="neon-chip">Report deliverables</span>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              Built Around The Output, Not Just The Scan
            </h2>
            <p className="max-w-3xl mx-auto neon-subtle text-sm lg:text-base leading-relaxed">
              Your team needs more than raw scanner logs. VulnScanners focuses
              on evidence-backed reports that are easy to review, assign, and
              verify.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {reportDeliverables.map((item) => (
              <div
                key={item}
                className="neon-border landing-card p-4 rounded-xl bg-[rgba(255,255,255,0.02)] text-sm lg:text-base"
              >
                {item}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {reportShowcase.map((report) => (
              <article
                key={report.title}
                className="neon-card landing-card p-5 lg:p-6 space-y-2"
              >
                <h3 className="text-lg font-bold tracking-tight">
                  {report.title}
                </h3>
                <p className="neon-subtle text-sm leading-relaxed">
                  {report.subtitle}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section className="space-y-6 landing-fade-up" id="why-vulnscanners">
          <div className="text-center space-y-2">
            <span className="neon-chip">Why security teams choose us</span>
            <h2 className="text-3xl lg:text-4xl font-bold neon-section-title">
              Selling Points That Matter In Daily Operations
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {sellingPoints.map((point) => (
              <article
                key={point.title}
                className="neon-card landing-card p-5 lg:p-6 space-y-3"
              >
                <h3 className="text-lg lg:text-xl font-bold tracking-tight">
                  {point.title}
                </h3>
                <p className="neon-subtle text-sm lg:text-base leading-relaxed">
                  {point.copy}
                </p>
              </article>
            ))}
          </div>
        </section>

        <section
          className="text-center neon-card landing-fade-up p-7 lg:p-10 space-y-4"
          id="cta"
        >
          <span className="neon-chip">Ready to run your first scan?</span>
          <h2 className="text-3xl lg:text-4xl font-black tracking-tight neon-hero-title">
            Start Delivering Better Security Reports
          </h2>
          <p className="max-w-2xl mx-auto neon-subtle text-sm lg:text-base">
            Unified web app. Three scanners. Evidence-backed output your team
            can triage, fix, and verify.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-3 items-center justify-center">
            <Link
              href="/login"
              className="neon-primary-btn px-6 py-3 font-semibold text-sm w-full sm:w-auto text-center"
            >
              Create Account
            </Link>
            <Link
              href="/app/scans"
              className="neon-outline-btn px-6 py-3 font-semibold text-sm w-full sm:w-auto text-center"
            >
              Go To Scanner Dashboard
            </Link>
          </div>
        </section>
      </div>
    </main>
  );
}
