"use client";

import { useState, FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export default function SupportPage() {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    category: "general",
    subject: "",
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
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        throw new Error("Failed to send message");
      }

      setSubmitStatus({
        type: "success",
        message:
          "Thanks — we've received your message and will respond within 24–48 hours.",
      });

      setFormData({
        name: "",
        email: "",
        category: "general",
        subject: "",
        message: "",
      });
    } catch (error: any) {
      setSubmitStatus({
        type: "error",
        message: error.message || "Failed to send message. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const categories = [
    { value: "general", label: "General inquiry" },
    { value: "technical", label: "Technical support" },
    { value: "billing", label: "Billing & credits" },
    { value: "security", label: "Security concern" },
    { value: "feedback", label: "Feature request / feedback" },
  ];

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
            Support
          </p>
          <h1 className="text-3xl lg:text-4xl font-medium tracking-tight text-[#e6edf5] mb-3">
            We&apos;re here to help.
          </h1>
          <p className="text-[#9aa5b6] text-[15px] leading-relaxed">
            Questions about a scan, your account, or billing? Send us a note and
            we&apos;ll respond within 24–48 hours.
          </p>
        </div>

        <form
          onSubmit={handleSubmit}
          className="bg-[#0d1117] border border-[#161b24] rounded-lg p-6 space-y-5"
        >
          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <label
                htmlFor="support-name"
                className="block text-sm text-[#e6edf5] mb-2"
              >
                Name
              </label>
              <input
                id="support-name"
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
                htmlFor="support-email"
                className="block text-sm text-[#e6edf5] mb-2"
              >
                Email
              </label>
              <input
                id="support-email"
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="support-category"
              className="block text-sm text-[#e6edf5] mb-2"
            >
              Category
            </label>
            <select
              id="support-category"
              name="category"
              value={formData.category}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
            >
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label
              htmlFor="support-subject"
              className="block text-sm text-[#e6edf5] mb-2"
            >
              Subject
            </label>
            <input
              id="support-subject"
              type="text"
              name="subject"
              value={formData.subject}
              onChange={handleChange}
              required
              className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]"
            />
          </div>

          <div>
            <label
              htmlFor="support-message"
              className="block text-sm text-[#e6edf5] mb-2"
            >
              Message
            </label>
            <textarea
              id="support-message"
              name="message"
              value={formData.message}
              onChange={handleChange}
              required
              rows={6}
              className="w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6] resize-none"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 bg-[#0366d6] hover:bg-[#4493f8] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Sending…" : "Send message"}
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
            Before you write
          </h2>
          <p className="text-sm text-[#697080] mb-6">
            A few things people ask most often — might save you a round trip.
          </p>
          <dl className="divide-y divide-[#161b24]">
            {[
              {
                q: "How quickly do you respond?",
                a: "Most messages get a reply within 24–48 hours on weekdays. Active scan failures and billing problems are prioritized first.",
              },
              {
                q: "Where do I find a scan I already ran?",
                a: (
                  <>
                    Every scan you launch is in{" "}
                    <Link
                      href="/app/history"
                      className="text-[#4493f8] hover:text-[#0366d6] underline-offset-2 hover:underline"
                    >
                      Scan History
                    </Link>
                    . Completed scans include the raw output, a downloadable PDF
                    report, and a Delete action.
                  </>
                ),
              },
              {
                q: "How do scan credits work?",
                a: "Credits are charged per scan, per scanner. Nmap, Nuclei, and ZAP each draw from your purchased credits, and credits never expire.",
              },
              {
                q: "I think I found a security issue in VulnScanners itself.",
                a: 'Use the form above and choose the "Security concern" category. We treat those reports with priority and follow up on the disclosure timeline.',
              },
              {
                q: "Can I scan a target I don’t own?",
                a: (
                  <>
                    No. VulnScanners is for authorized testing only. See the
                    ethical-use details in our{" "}
                    <Link
                      href="/help-center#trust"
                      className="text-[#4493f8] hover:text-[#0366d6] underline-offset-2 hover:underline"
                    >
                      Help Center
                    </Link>
                    .
                  </>
                ),
              },
              {
                q: "How long does a scan take?",
                a: "Nmap usually finishes in 1–10 minutes and Nuclei in 5–15. A full OWASP ZAP active scan is the slowest — minutes to a couple of hours on a large app. Scans run in the background, so you can close the console.",
              },
              {
                q: "My scan shows no findings or “target unreachable.”",
                a: (
                  <>
                    Usually the target was down, firewalled, or blocking the
                    scanner — or it&apos;s genuinely clean for that engine.
                    Download
                    the raw output to see what the tool observed. Failed scans
                    refund the credit automatically. More in the{" "}
                    <Link
                      href="/help-center#troubleshooting"
                      className="text-[#4493f8] hover:text-[#0366d6] underline-offset-2 hover:underline"
                    >
                      troubleshooting guide
                    </Link>
                    .
                  </>
                ),
              },
              {
                q: "How do I delete a scan?",
                a: "Open Scan History and click Delete on any scan to permanently remove it, including its raw output. Deletion can't be undone.",
              },
              {
                q: "Can I get a refund?",
                a: "Your first purchase is covered by a 7-day, no-questions-asked refund. After that we handle issues case by case — and any scan that fails refunds its credit automatically.",
              },
              {
                q: "Do you offer pricing for MSPs / MSSPs?",
                a: (
                  <>
                    Yes — we offer volume pricing for managed providers running
                    our hosted scanners across multiple clients.{" "}
                    <Link
                      href="/mssp"
                      className="text-[#4493f8] hover:text-[#0366d6] underline-offset-2 hover:underline"
                    >
                      Request a meeting
                    </Link>
                    .
                  </>
                ),
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

        <section className="mt-10 border-t border-[#161b24] pt-8">
          <h2 className="text-base font-medium text-[#e6edf5] mb-2">
            Looking for how-tos?
          </h2>
          <p className="text-sm text-[#9aa5b6] leading-relaxed">
            Our{" "}
            <Link
              href="/help-center"
              className="text-[#4493f8] hover:text-[#0366d6] underline-offset-2 hover:underline"
            >
              Help Center
            </Link>{" "}
            covers getting started, the scanners, reading reports, credits,
            scheduling, troubleshooting, and our trust &amp; safety practices.
          </p>
        </section>
      </main>
    </div>
  );
}
