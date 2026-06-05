"use client";

import { useState, FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function MsspPage() {
  const [formData, setFormData] = useState({
    category: "mssp-meeting",
    name: "",
    email: "",
    company: "",
    role: "",
    clients: "1–5",
    message: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<
      HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement
    >,
  ) => {
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    if (submitStatus) setSubmitStatus(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setSubmitStatus(null);

    try {
      const res = await fetch("https://formspree.io/f/mjglngwo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          _subject: `MSP/MSSP meeting request — ${formData.company || formData.name}`,
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to send your request");
      }

      setSubmitStatus({
        type: "success",
        message:
          "Thanks — we've received your request and will reach out within one business day to set up a meeting.",
      });

      setFormData({
        category: "mssp-meeting",
        name: "",
        email: "",
        company: "",
        role: "",
        clients: "1–5",
        message: "",
      });
    } catch (error: any) {
      setSubmitStatus({
        type: "error",
        message:
          error.message || "Failed to send your request. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const clientRanges = ["1–5", "5–20", "20–50", "50+"];

  return (
    <div className="min-h-screen">
      <header className="border-b border-[#161b24] bg-[#0d1117]/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#4493f8] hover:text-[#0366d6] transition-colors text-sm"
          >
            <svg
              className="w-4 h-4"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to home
          </Link>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-6 py-16">
        <div className="mb-10">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8] mb-3">
            For MSPs &amp; MSSPs
          </p>
          <h1 className="text-3xl lg:text-4xl font-medium tracking-tight text-[#e6edf5] mb-3">
            Hosted scanning for your whole client base.
          </h1>
          <p className="text-[#9aa5b6] text-[15px] leading-relaxed">
            Run Nmap, Nuclei, and OWASP ZAP across every client environment from
            one place, with branded, client-ready PDF reports out of the box. We
            offer volume pricing for managed providers — request a meeting and
            we&apos;ll put together a plan that fits how you operate.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0d1117] border border-[#161b24] rounded-lg p-6 space-y-5"
        >
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="mssp-name"
                className="block text-sm text-[#e6edf5] mb-2"
              >
                Name
              </label>
              <input
                id="mssp-name"
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
              />
            </div>

            <div>
              <label
                htmlFor="mssp-email"
                className="block text-sm text-[#e6edf5] mb-2"
              >
                Work email
              </label>
              <input
                id="mssp-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
              />
            </div>
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="mssp-company"
                className="block text-sm text-[#e6edf5] mb-2"
              >
                Company
              </label>
              <input
                id="mssp-company"
                type="text"
                name="company"
                value={formData.company}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
              />
            </div>

            <div>
              <label
                htmlFor="mssp-role"
                className="block text-sm text-[#e6edf5] mb-2"
              >
                Role <span className="text-[#697080]">(optional)</span>
              </label>
              <input
                id="mssp-role"
                type="text"
                name="role"
                value={formData.role}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="mssp-clients"
              className="block text-sm text-[#e6edf5] mb-2"
            >
              How many clients / environments would you scan?
            </label>
            <select
              id="mssp-clients"
              name="clients"
              value={formData.clients}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
            >
              {clientRanges.map((r) => (
                <option key={r} value={r}>
                  {r}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="mssp-message"
              className="block text-sm text-[#e6edf5] mb-2"
            >
              What would you like to use the scanners for?
            </label>
            <textarea
              id="mssp-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={5}
              placeholder="Tell us about your clients, cadence, and what a good fit looks like."
              className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#0366d6] hover:bg-[#4493f8] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending…" : "Request a meeting"}
          </button>

          {submitStatus && (
            <div
              role="status"
              className={`p-3 rounded-md border flex items-start gap-3 ${
                submitStatus.type === "success"
                  ? "bg-green-500/10 border-green-500/30"
                  : "bg-red-500/10 border-red-500/30"
              }`}
            >
              <FontAwesomeIcon
                icon={
                  submitStatus.type === "success"
                    ? faCheckCircle
                    : faExclamationTriangle
                }
                className={`text-base mt-0.5 ${
                  submitStatus.type === "success"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              />
              <p
                className={`text-sm ${
                  submitStatus.type === "success"
                    ? "text-green-300"
                    : "text-red-300"
                }`}
              >
                {submitStatus.message}
              </p>
            </div>
          )}
        </form>

        <section className="mt-14 border-t border-[#161b24] pt-10">
          <h2 className="text-xl font-medium tracking-tight text-[#e6edf5] mb-1">
            Why providers run VulnScanners
          </h2>
          <p className="text-sm text-[#697080] mb-6">
            Built to slot into how managed teams already work.
          </p>
          <dl className="divide-y divide-[#161b24]">
            {[
              {
                q: "One console, every client",
                a: "Launch Nmap, Nuclei, and OWASP ZAP against any approved target without standing up or maintaining tooling for each engagement.",
              },
              {
                q: "Client-ready reports",
                a: "Every scan produces a branded PDF you can hand straight to a client or auditor — no reformatting, no extra tooling.",
              },
              {
                q: "Volume pricing",
                a: "Pricing scales with the number of clients and environments you cover. Tell us your footprint and we'll tailor a plan.",
              },
              {
                q: "Authorized testing only",
                a: "VulnScanners is for targets you're authorized to test. We'll confirm scope and acceptable-use as part of onboarding.",
              },
            ].map((item, i) => (
              <div key={i} className="py-4">
                <dt className="text-[15px] text-[#e6edf5] mb-1.5">{item.q}</dt>
                <dd className="text-sm text-[#9aa5b6] leading-relaxed">
                  {item.a}
                </dd>
              </div>
            ))}
          </dl>
        </section>
      </main>
    </div>
  );
}
