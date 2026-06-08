"use client";

import { useState, FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faCheckCircle,
  faExclamationTriangle,
} from "@fortawesome/free-solid-svg-icons";

// Lead-capture form for a managed assessment. Posts to the shared Formspree
// endpoint with a category so requests are identifiable in the inbox.
export default function AssessmentForm({
  category,
  subjectLabel,
}: {
  category: string;
  subjectLabel: string;
}) {
  const empty = {
    category,
    name: "",
    email: "",
    company: "",
    target: "",
    message: "",
  };
  const [formData, setFormData] = useState(empty);
  const [submitting, setSubmitting] = useState(false);
  const [status, setStatus] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setFormData((p) => ({ ...p, [e.target.name]: e.target.value }));
    if (status) setStatus(null);
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setStatus(null);
    try {
      const res = await fetch("https://formspree.io/f/mjglngwo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          _subject: `${subjectLabel} request — ${formData.company || formData.name}`,
        }),
      });
      if (!res.ok) throw new Error("Failed to send your request");
      setStatus({
        type: "success",
        message:
          "Thanks — we've received your request and will reach out within one business day to scope your assessment.",
      });
      setFormData(empty);
    } catch (err: any) {
      setStatus({
        type: "error",
        message: err?.message || "Failed to send. Please try again.",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const input =
    "w-full px-3 py-2 border border-[#161b24] rounded-md bg-[#11161f] text-[#e6edf5] placeholder-[#697080] focus:outline-none focus:ring-1 focus:ring-[#0366d6] focus:border-[#0366d6]";

  return (
    <form
      onSubmit={handleSubmit}
      className="bg-[#0d1117] border border-[#161b24] rounded-lg p-6 space-y-5"
    >
      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label htmlFor="a-name" className="block text-sm text-[#e6edf5] mb-2">
            Name
          </label>
          <input
            id="a-name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            required
            className={input}
          />
        </div>
        <div>
          <label htmlFor="a-email" className="block text-sm text-[#e6edf5] mb-2">
            Work email
          </label>
          <input
            id="a-email"
            type="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            required
            className={input}
          />
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        <div>
          <label
            htmlFor="a-company"
            className="block text-sm text-[#e6edf5] mb-2"
          >
            Company
          </label>
          <input
            id="a-company"
            name="company"
            value={formData.company}
            onChange={handleChange}
            required
            className={input}
          />
        </div>
        <div>
          <label
            htmlFor="a-target"
            className="block text-sm text-[#e6edf5] mb-2"
          >
            Target / domain <span className="text-[#697080]">(optional)</span>
          </label>
          <input
            id="a-target"
            name="target"
            value={formData.target}
            onChange={handleChange}
            placeholder="example.com"
            className={input}
          />
        </div>
      </div>

      <div>
        <label
          htmlFor="a-message"
          className="block text-sm text-[#e6edf5] mb-2"
        >
          What would you like assessed?
        </label>
        <textarea
          id="a-message"
          name="message"
          value={formData.message}
          onChange={handleChange}
          required
          rows={4}
          placeholder="Scope, number of targets, timeline, and anything we should know."
          className={`${input} resize-none`}
        />
      </div>

      <button
        type="submit"
        disabled={submitting}
        className="w-full py-2.5 bg-[#0366d6] hover:bg-[#4493f8] text-white text-sm font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {submitting ? "Sending…" : "Request assessment"}
      </button>

      <p className="text-xs text-[#697080] text-center">
        We only assess targets you own or are authorized to test. We&apos;ll
        confirm scope and authorization before any testing begins.
      </p>

      {status && (
        <div
          role="status"
          className={`p-3 rounded-md border flex items-start gap-3 ${
            status.type === "success"
              ? "bg-green-500/10 border-green-500/30"
              : "bg-red-500/10 border-red-500/30"
          }`}
        >
          <FontAwesomeIcon
            icon={
              status.type === "success" ? faCheckCircle : faExclamationTriangle
            }
            className={`text-base mt-0.5 ${
              status.type === "success" ? "text-green-400" : "text-red-400"
            }`}
          />
          <p
            className={`text-sm ${
              status.type === "success" ? "text-green-300" : "text-red-300"
            }`}
          >
            {status.message}
          </p>
        </div>
      )}
    </form>
  );
}
