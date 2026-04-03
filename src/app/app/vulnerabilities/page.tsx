"use client";

import { useEffect, useState, useMemo } from "react";
import DashboardLayout from "@/components/dashboard/DashboardLayout";
import VulnerabilityCard, {
  Vulnerability,
} from "@/components/dashboard/VulnerabilityCard";
import { useAuth } from "@/lib/context/AuthContext";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBug,
  faShieldVirus,
  faFilter,
} from "@fortawesome/free-solid-svg-icons";

export default function VulnerabilitiesPage() {
  const { currentUser } = useAuth();
  const [vulnerabilities, setVulnerabilities] = useState<Vulnerability[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");
  const [filterTarget, setFilterTarget] = useState<string>("all");

  useEffect(() => {
    const fetchVulns = async () => {
      if (!currentUser) return;
      try {
        const token = await currentUser.getIdToken();
        const res = await fetch("/api/vulnerabilities", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (data.success) {
          setVulnerabilities(data.vulnerabilities);
        }
      } catch (err) {
        console.error("Failed to load vulnerabilities", err);
      } finally {
        setLoading(false);
      }
    };
    fetchVulns();
  }, [currentUser]);

  const uniqueTargets = useMemo(() => {
    const targets = new Map();
    vulnerabilities.forEach((v) => {
      if (!targets.has(v.targetId)) {
        targets.set(v.targetId, v.targetName);
      }
    });
    return Array.from(targets.entries());
  }, [vulnerabilities]);

  const filteredVulns = useMemo(() => {
    return vulnerabilities
      .filter((v) => filterSeverity === "all" || v.severity === filterSeverity)
      .filter((v) => filterTarget === "all" || v.targetId === filterTarget)
      .sort((a, b) => {
        const sevMap = { critical: 4, high: 3, medium: 2, low: 1 };
        return sevMap[b.severity] - sevMap[a.severity];
      });
  }, [vulnerabilities, filterSeverity, filterTarget]);

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-full">
        <div>
          <h1 className="text-3xl font-bold text-[#0A1128]">
            Open Vulnerabilities
          </h1>
          <p className="text-gray-600 mt-1">
            Review active findings mapped across all your scan targets.
          </p>
        </div>

        {/* Filters */}
        <div className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm flex flex-col sm:flex-row items-center gap-4">
          <div className="flex items-center gap-2 text-gray-600 font-semibold text-sm">
            <FontAwesomeIcon icon={faFilter} />
            Filters:
          </div>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00FED9]"
            value={filterSeverity}
            onChange={(e) => setFilterSeverity(e.target.value)}
          >
            <option value="all">All Severities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
          <select
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50 focus:outline-none focus:ring-2 focus:ring-[#00FED9]"
            value={filterTarget}
            onChange={(e) => setFilterTarget(e.target.value)}
          >
            <option value="all">All Targets</option>
            {uniqueTargets.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>

          <div className="ml-auto text-sm text-gray-500 font-semibold bg-gray-100 px-3 py-1.5 rounded-lg border border-gray-200">
            {filteredVulns.length} Results
          </div>
        </div>

        {/* List */}
        {loading ? (
          <div className="flex justify-center py-20 text-gray-500">
            Loading your vulnerabilities...
          </div>
        ) : filteredVulns.length === 0 ? (
          <div className="text-center py-20 bg-gray-50 border border-gray-200 rounded-xl shadow-sm">
            <FontAwesomeIcon
              icon={faShieldVirus}
              className="text-6xl text-gray-300 mb-4"
            />
            <h3 className="text-xl font-bold text-[#0A1128]">
              No Vulnerabilities Found
            </h3>
            <p className="text-gray-600">
              Great job! Your selected targets are secure. Try running a new
              scan.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredVulns.map((vuln) => (
              <VulnerabilityCard key={vuln.id} vuln={vuln} />
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
