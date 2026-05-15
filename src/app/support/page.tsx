"use client";

import { useState, FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faLifeRing,
  faPaperPlane,
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
      const res = await fetch("/api/support", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Failed to send message");
      }

      setSubmitStatus({
        type: "success",
        message:
          "Thank you for contacting us! We've received your message and will respond within 24-48 hours.",
      });

      // Reset form
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
    { value: "general", label: "General Inquiry" },
    { value: "technical", label: "Technical Support" },
    { value: "billing", label: "Billing & Credits" },
    { value: "security", label: "Security Concern" },
    { value: "feedback", label: "Feature Request / Feedback" },
  ];

  return (
    <div className="min-h-screen bg-[#07090d]">
      {/* Header */}
      <header className="border-b border-[#161b24] bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#4493f8] hover:text-[#0366d6] transition-colors"
          >
            <svg
              className="w-5 h-5"
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
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-6 py-12 lg:py-16">
        {/* Page Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0366d6]/20 border border-[#0366d6]/30 mb-6">
            <FontAwesomeIcon
              icon={faLifeRing}
              className="text-4xl text-[#4493f8]"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#e6edf5] mb-4">
            Support Center
          </h1>
          <p className="text-xl text-[#9aa5b6] max-w-2xl mx-auto">
            Need help? We&apos;re here to assist you with any questions or
            concerns about VulnScanners.
          </p>
        </div>

        {/* Quick Links */}
        <div className="grid md:grid-cols-3 gap-4 mb-12">
          <Link
            href="/help-center"
            className="bg-[#0d1117] border border-[#161b24] rounded-lg p-5 hover:border-[#0366d6] transition-all text-center"
          >
            <div className="text-2xl mb-2">📚</div>
            <div className="font-semibold text-[#e6edf5] mb-1">
              Trust & Safety
            </div>
            <div className="text-sm text-[#9aa5b6]">
              Security & compliance info
            </div>
          </Link>

          <a
            href="mailto:security@vulnscanners.com"
            className="bg-[#0d1117] border border-[#161b24] rounded-lg p-5 hover:border-[#0366d6] transition-all text-center"
          >
            <div className="text-2xl mb-2">🔒</div>
            <div className="font-semibold text-[#e6edf5] mb-1">
              Report Security Issue
            </div>
            <div className="text-sm text-[#9aa5b6]">
              security@vulnscanners.com
            </div>
          </a>

          <Link
            href="/app/dashboard"
            className="bg-[#0d1117] border border-[#161b24] rounded-lg p-5 hover:border-[#0366d6] transition-all text-center"
          >
            <div className="text-2xl mb-2">🚀</div>
            <div className="font-semibold text-[#e6edf5] mb-1">
              Go to Dashboard
            </div>
            <div className="text-sm text-[#9aa5b6]">Launch scans</div>
          </Link>
        </div>

        {/* Contact Form */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-8 shadow-lg">
          <h2 className="text-2xl font-bold text-[#e6edf5] mb-6">
            Send us a message
          </h2>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Name and Email */}
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold text-[#e6edf5] mb-2">
                  Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#161b24] rounded-lg bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-2 focus:ring-[#0366d6] focus:border-transparent"
                  placeholder="John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-semibold text-[#e6edf5] mb-2">
                  Email <span className="text-red-400">*</span>
                </label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 border border-[#161b24] rounded-lg bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-2 focus:ring-[#0366d6] focus:border-transparent"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-[#e6edf5] mb-2">
                Category <span className="text-red-400">*</span>
              </label>
              <select
                name="category"
                value={formData.category}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-[#161b24] rounded-lg bg-[#11161f] text-[#e6edf5] focus:outline-none focus:ring-2 focus:ring-[#0366d6] focus:border-transparent"
              >
                {categories.map((cat) => (
                  <option key={cat.value} value={cat.value}>
                    {cat.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Subject */}
            <div>
              <label className="block text-sm font-semibold text-[#e6edf5] mb-2">
                Subject <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                name="subject"
                value={formData.subject}
                onChange={handleChange}
                required
                className="w-full px-4 py-3 border border-[#161b24] rounded-lg bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-2 focus:ring-[#0366d6] focus:border-transparent"
                placeholder="Brief description of your inquiry"
              />
            </div>

            {/* Message */}
            <div>
              <label className="block text-sm font-semibold text-[#e6edf5] mb-2">
                Message <span className="text-red-400">*</span>
              </label>
              <textarea
                name="message"
                value={formData.message}
                onChange={handleChange}
                required
                rows={6}
                className="w-full px-4 py-3 border border-[#161b24] rounded-lg bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-2 focus:ring-[#0366d6] focus:border-transparent resize-none"
                placeholder="Please provide as much detail as possible..."
              />
              <p className="text-xs text-[#697080] mt-2">
                For security vulnerabilities, please email
                security@vulnscanners.com directly
              </p>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 bg-[#0366d6] hover:bg-[#4493f8] text-white font-bold rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-lg"
            >
              <FontAwesomeIcon icon={faPaperPlane} />
              {submitting ? "Sending..." : "Send Message"}
            </button>

            {/* Status Messages */}
            {submitStatus && (
              <div
                className={`p-4 rounded-lg border ${
                  submitStatus.type === "success"
                    ? "bg-green-500/10 border-green-500/30"
                    : "bg-red-500/10 border-red-500/30"
                }`}
              >
                <div className="flex items-start gap-3">
                  <FontAwesomeIcon
                    icon={
                      submitStatus.type === "success"
                        ? faCheckCircle
                        : faExclamationTriangle
                    }
                    className={`text-xl mt-0.5 ${
                      submitStatus.type === "success"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  />
                  <p
                    className={`text-sm font-medium ${
                      submitStatus.type === "success"
                        ? "text-green-400"
                        : "text-red-400"
                    }`}
                  >
                    {submitStatus.message}
                  </p>
                </div>
              </div>
            )}
          </form>
        </div>

        {/* Response Time Info */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#9aa5b6]">
            💡 <strong>Average response time:</strong> 24-48 hours
          </p>
          <p className="text-sm text-[#697080] mt-2">
            For urgent security issues, please email security@vulnscanners.com
          </p>
        </div>
      </main>
    </div>
  );
}
