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
    title: "Trusted scanner stack",
    copy: "Run established tools your team already knows: Nmap, Nuclei, and OWASP ZAP in one hosted workflow.",
  },
  {
    title: "No install or maintenance",
    copy: "Launch scans without maintaining scanner servers, container images, or update pipelines.",
  },
  {
    title: "Attack-surface visibility",
    copy: "Map exposed services and web risk quickly so teams can prioritize what is reachable first.",
  },
  {
    title: "Attacker-perspective testing",
    copy: "Assess external posture the way an internet-based adversary sees it, then validate fixes fast.",
  },
  {
    title: "Actionable remediation flow",
    copy: "Move from finding to fix with clear output your engineering and security teams can triage together.",
  },
  {
    title: "Built for recurring scans",
    copy: "Use repeatable runs to verify remediation and keep pace with infrastructure and application changes.",
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
            Hosted Vulnerability Scanning Without The Operational Overhead
          </h1>

          <p className="text-base lg:text-xl neon-subtle max-w-3xl mx-auto leading-relaxed text-pretty">
            Simplify security assessments with hosted scanners. Run Nmap,
            Nuclei, and OWASP ZAP from one console to discover exposure,
            identify vulnerabilities, and re-test quickly.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            <Link
              href="/login"
              className="neon-primary-btn px-6 py-3 font-semibold text-sm w-full sm:w-auto text-center"
            >
              Start Scanning
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
              From Target To Findings In Minutes
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
            Launch VulnScanners Today
          </h2>
          <p className="max-w-2xl mx-auto neon-subtle text-sm lg:text-base">
            Unified web app. Three scanners. Real backend execution. Zero local
            setup.
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
