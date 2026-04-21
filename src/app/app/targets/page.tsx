"use client";

import { useState, useEffect, FormEvent } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faPlus,
  faEdit,
  faTrash,
  faServer,
  faGlobe,
  faLink,
  faHeartPulse,
} from "@fortawesome/free-solid-svg-icons";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import { useAuth } from "@/lib/context/AuthContext";
import { Target, TargetType } from "@/lib/types/target";

const EMPTY_FORM = {
  name: "",
  value: "",
  type: "domain" as TargetType,
  tags: "",
};

export default function TargetsPage() {
  const { currentUser } = useAuth();
  const [targets, setTargets] = useState<Target[]>([]);
  const [loading, setLoading] = useState(true);

  const [formState, setFormState] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const [editingTarget, setEditingTarget] = useState<Target | null>(null);

  const fetchTargets = async () => {
    if (!currentUser) return;
    try {
      setLoading(true);
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/targets", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        setTargets(data.targets);
      }
    } catch (err) {
      console.error("Failed to fetch targets", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTargets();
  }, [currentUser]);

  const handleInputChange = (field: string, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
    if (feedback) setFeedback(null);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentUser) return;

    setSaving(true);
    const parsedTags = formState.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);

    try {
      const token = await currentUser.getIdToken();
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: formState.name,
          value: formState.value,
          type: formState.type,
          tags: parsedTags,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setTargets([data.target, ...targets]);
        setFormState(EMPTY_FORM);
        setFeedback({
          type: "success",
          message: "Target created successfully.",
        });
      } else {
        setFeedback({
          type: "error",
          message: data.error || "Failed to create target.",
        });
      }
    } catch (error) {
      console.error(error);
      setFeedback({ type: "error", message: "An error occurred." });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (targetId: string) => {
    if (!currentUser || !window.confirm("Delete this target?")) return;
    try {
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/targets/${targetId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setTargets(targets.filter((t) => t.id !== targetId));
      }
    } catch (error) {
      console.error(error);
    }
  };

  const getTargetIcon = (type: string) => {
    if (type === "ip") return faServer;
    if (type === "url") return faLink;
    return faGlobe;
  };

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-full bg-[#0a141f] min-h-screen">
        <div>
          <h1 className="text-3xl font-light text-white">Targets</h1>
          <p className="text-gray-400 mt-1">
            Manage infrastructure, domains, and APIs to scan.
          </p>
        </div>

        {/* Create Target Form */}
        <form
          className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl p-6 shadow-lg space-y-4"
          onSubmit={handleSubmit}
        >
          <h2 className="text-xl font-semibold text-white">Add Target</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="flex flex-col">
              <span className="text-sm font-semibold text-gray-300">Name</span>
              <input
                type="text"
                required
                value={formState.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                placeholder="Production API"
                className="mt-2 px-3 py-2 border border-[#1a2d44] rounded-lg bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4]"
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-semibold text-gray-300">
                Value (IP / URL / Domain)
              </span>
              <input
                type="text"
                required
                value={formState.value}
                onChange={(e) => handleInputChange("value", e.target.value)}
                placeholder="192.168.1.1 or api.example.com"
                className="mt-2 px-3 py-2 border border-[#1a2d44] rounded-lg bg-white/5 text-white placeholder:text-gray-500 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4]"
              />
            </label>
            <label className="flex flex-col">
              <span className="text-sm font-semibold text-gray-300">Type</span>
              <select
                value={formState.type}
                onChange={(e) => handleInputChange("type", e.target.value)}
                className="mt-2 px-3 py-2 border border-[#1a2d44] rounded-lg bg-white/5 text-white focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4]"
              >
                <option value="domain" className="bg-[#0d1b2e]">
                  Domain Name
                </option>
                <option value="ip" className="bg-[#0d1b2e]">
                  IP Address
                </option>
                <option value="url" className="bg-[#0d1b2e]">
                  URL (e.g. for ZAP)
                </option>
              </select>
            </label>
          </div>
          <div>
            <label className="flex flex-col">
              <span className="text-sm font-semibold text-gray-300">
                Tags (comma separated)
              </span>
              <input
                type="text"
                value={formState.tags}
                onChange={(e) => handleInputChange("tags", e.target.value)}
                placeholder="production, api"
                className="mt-2 px-3 py-2 border border-[#1a2d44] rounded-lg bg-white/5 text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#06b6d4] focus:border-[#06b6d4]"
              />
            </label>
          </div>
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving || !formState.value.trim()}
              className="inline-flex items-center gap-2 px-4 py-2 bg-[#06b6d4] text-[#04141d] hover:text-white font-semibold rounded-lg hover:bg-[#0891b2] transition-colors disabled:opacity-50 shadow-[0_8px_24px_rgba(6,182,212,0.2)]"
            >
              <FontAwesomeIcon icon={faPlus} />{" "}
              {saving ? "Saving…" : "Save target"}
            </button>
            {feedback && (
              <span
                className={`text-sm ${feedback.type === "error" ? "text-red-400" : "text-green-400"}`}
              >
                {feedback.message}
              </span>
            )}
          </div>
        </form>

        {/* Data Table */}
        <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl shadow-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-white/5 border-b border-[#1a2d44] text-sm text-gray-400">
                  <th className="p-4 font-semibold uppercase tracking-wide text-xs">
                    Target
                  </th>
                  <th className="p-4 font-semibold uppercase tracking-wide text-xs">
                    Type
                  </th>
                  <th className="p-4 font-semibold uppercase tracking-wide text-xs">
                    Health Score
                  </th>
                  <th className="p-4 font-semibold uppercase tracking-wide text-xs">
                    Tags
                  </th>
                  <th className="p-4 font-semibold uppercase tracking-wide text-xs text-right">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1a2d44]">
                {loading ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      Loading targets...
                    </td>
                  </tr>
                ) : targets.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-6 text-center text-gray-500">
                      No targets found. Add one above.
                    </td>
                  </tr>
                ) : (
                  targets.map((t) => (
                    <tr
                      key={t.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="p-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-white">
                            {t.name}
                          </span>
                          <span className="text-sm font-mono text-gray-500">
                            {t.value}
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className="inline-flex items-center gap-2 px-2.5 py-1 rounded-md text-xs font-semibold bg-[#06b6d4]/15 text-[#22d3ee] border border-[#06b6d4]/30">
                          <FontAwesomeIcon icon={getTargetIcon(t.type)} />
                          {t.type.toUpperCase()}
                        </span>
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <FontAwesomeIcon
                            icon={faHeartPulse}
                            className={
                              t.healthScore === 100
                                ? "text-green-400"
                                : "text-yellow-400"
                            }
                          />
                          <span className="font-semibold text-gray-200">
                            {t.healthScore ?? 100}/100
                          </span>
                        </div>
                      </td>
                      <td className="p-4">
                        <div className="flex flex-wrap gap-1">
                          {t.tags?.map((tag) => (
                            <span
                              key={tag}
                              className="px-2 py-0.5 bg-white/5 text-gray-300 text-xs rounded-full border border-white/10"
                            >
                              {tag}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="p-4 text-right">
                        <button
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                          onClick={() => handleDelete(t.id)}
                        >
                          <FontAwesomeIcon icon={faTrash} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
