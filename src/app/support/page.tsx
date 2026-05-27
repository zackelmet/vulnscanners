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
          <h1 className="text-3xl font-semibold text-[#e6edf5] mb-3 tracking-tight">
            Contact support
          </h1>
          <p className="text-[#9aa5b6] leading-relaxed">
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

        <section className="mt-10 border-t border-[#161b24] pt-8">
          <h2 className="text-base font-medium text-[#e6edf5] mb-2">
            Trust & Safety
          </h2>
          <p className="text-sm text-[#9aa5b6] leading-relaxed mb-3">
            For details on how we handle scan data, our ethical use policy, and
            our compliance posture, see our{" "}
            <Link
              href="/help-center"
              className="text-[#4493f8] hover:text-[#0366d6] underline-offset-2 hover:underline"
            >
              Trust &amp; Safety page
            </Link>
            .
          </p>
        </section>
      </main>
    </div>
  );
}
