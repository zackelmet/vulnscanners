import Link from "next/link";
import AssessmentForm from "./AssessmentForm";

export interface AssessmentContent {
  kicker: string;
  title: string;
  subtitle: string;
  intro: string[];
  valueProps: { title: string; text: string }[];
  steps: { title: string; text: string }[];
  faq: { q: string; a: string }[];
  formCategory: string;
  formSubject: string;
}

const SANS_QUOTE =
  "Organizations that do not scan for vulnerabilities and address discovered flaws pro-actively face a significant likelihood of having their computer systems compromised.";

export default function AssessmentPage({ c }: { c: AssessmentContent }) {
  return (
    <main className="min-h-screen text-[#e6edf5]">
      {/* Hero */}
      <section className="max-w-3xl mx-auto px-6 pt-16 pb-10">
        <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8] mb-3">
          {c.kicker}
        </p>
        <h1 className="text-4xl lg:text-5xl font-semibold tracking-tight mb-4">
          {c.title}
        </h1>
        <p className="text-[#c2ccd9] text-lg leading-relaxed mb-6 max-w-2xl">
          {c.subtitle}
        </p>
        <div className="space-y-4 mb-8">
          {c.intro.map((p, i) => (
            <p key={i} className="text-[#9aa5b6] text-[15px] leading-relaxed">
              {p}
            </p>
          ))}
        </div>
        <a
          href="#request"
          className="inline-block px-5 py-2.5 bg-[#0366d6] hover:bg-[#4493f8] text-white text-sm font-medium rounded-md transition-colors"
        >
          Request assessment
        </a>
      </section>

      {/* Value props */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <div className="grid md:grid-cols-3 gap-5">
          {c.valueProps.map((v) => (
            <div
              key={v.title}
              className="bg-[#0d1117] border border-[#161b24] rounded-lg p-5"
            >
              <h3 className="text-[15px] font-medium text-[#e6edf5] mb-2">
                {v.title}
              </h3>
              <p className="text-sm text-[#9aa5b6] leading-relaxed">{v.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* SANS quote */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <figure className="border-l-2 border-[#4493f8] bg-[#0d1117] rounded-lg p-7">
          <blockquote className="text-[#e6edf5] text-[17px] leading-relaxed italic">
            &ldquo;{SANS_QUOTE}&rdquo;
          </blockquote>
          <figcaption className="mt-4 font-mono text-xs text-[#697080]">
            <span className="text-[#4493f8]">SANS</span> — Critical Security
            Control 4
          </figcaption>
        </figure>
      </section>

      {/* How it works */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-medium tracking-tight mb-6">
          How it works
        </h2>
        <ol className="space-y-5">
          {c.steps.map((s, i) => (
            <li key={i} className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-[#0366d6]/15 text-[#4493f8] text-sm font-semibold flex items-center justify-center">
                {i + 1}
              </span>
              <div>
                <p className="text-[15px] font-medium text-[#e6edf5]">
                  {s.title}
                </p>
                <p className="text-[15px] text-[#9aa5b6] leading-relaxed">
                  {s.text}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* FAQ */}
      <section className="max-w-3xl mx-auto px-6 py-10">
        <h2 className="text-2xl font-medium tracking-tight mb-6">
          Common questions
        </h2>
        <dl className="divide-y divide-[#161b24]">
          {c.faq.map((item, i) => (
            <div key={i} className="py-4">
              <dt className="text-[15px] text-[#e6edf5] mb-1.5">{item.q}</dt>
              <dd className="text-sm text-[#9aa5b6] leading-relaxed">
                {item.a}
              </dd>
            </div>
          ))}
        </dl>
      </section>

      {/* Request form */}
      <section
        id="request"
        className="max-w-2xl mx-auto px-6 py-14 scroll-mt-20"
      >
        <h2 className="text-2xl font-medium tracking-tight mb-2">
          Request your assessment
        </h2>
        <p className="text-[#9aa5b6] text-[15px] leading-relaxed mb-6">
          Tell us what you&apos;d like assessed and we&apos;ll get back to you
          within one business day to scope it.
        </p>
        <AssessmentForm
          category={c.formCategory}
          subjectLabel={c.formSubject}
        />
        <p className="text-sm text-[#697080] mt-6">
          Prefer self-serve? Run Nmap, Nuclei, and OWASP ZAP yourself with{" "}
          <Link
            href="/#pricing"
            className="text-[#4493f8] hover:text-[#0366d6] underline-offset-2 hover:underline"
          >
            scan credits
          </Link>
          .
        </p>
      </section>
    </main>
  );
}
