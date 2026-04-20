import Link from "next/link";

export const metadata = {
  title: "Nuclei CVE Scanner — VulnScanners",
  description:
    "Template-based vulnerability detection mapped to current CVE intelligence. Continuously updated community templates.",
};

export default function NucleiScannerPage() {
  return (
    <main className="min-h-screen bg-[#0a141f] text-white">
      <div className="max-w-4xl mx-auto px-5 py-20 space-y-12">
        <div className="space-y-4">
          <div className="text-5xl">⚡</div>
          <h1 className="text-4xl lg:text-5xl font-bold">Nuclei CVE Scanner</h1>
          <p className="text-[#8fa8c8] text-lg max-w-2xl">
            Template-based vulnerability detection mapped to current CVE
            intelligence. Continuously updated community templates.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <svg
              className="w-5 h-5 text-[#0366d6] shrink-0"
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
            <span className="text-sm">CVE detection</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <svg
              className="w-5 h-5 text-[#0366d6] shrink-0"
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
            <span className="text-sm">Template-based scanning</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <svg
              className="w-5 h-5 text-[#0366d6] shrink-0"
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
            <span className="text-sm">Continuously updated checks</span>
          </div>
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl p-4">
            <svg
              className="w-5 h-5 text-[#0366d6] shrink-0"
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
            <span className="text-sm">Actionable finding output</span>
          </div>
        </div>

        <div className="flex gap-4 flex-wrap">
          <Link
            href="/login"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#0366d6] hover:bg-[#0258b8] text-white font-semibold transition-colors"
          >
            Run a Scan →
          </Link>
          <Link
            href="/#scanners"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-white/20 hover:border-[#0366d6]/60 text-[#8fa8c8] hover:text-white transition-colors"
          >
            ← All Scanners
          </Link>
        </div>

        <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-[#8fa8c8]">
          <p className="text-lg font-semibold mb-2">
            Detailed documentation coming soon
          </p>
          <p className="text-sm">
            Sign up to run your first scan now — no local setup required.
          </p>
        </div>
      </div>
    </main>
  );
}
