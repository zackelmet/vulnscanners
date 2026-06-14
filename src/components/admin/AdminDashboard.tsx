"use client";

import {
  faUsers,
  faUserPlus,
  faArrowTrendUp,
  faBolt,
  faTerminal,
} from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useAuth } from "@/lib/context/AuthContext";
import useSWR from "swr";

interface UserStats {
  total: number;
  new24h: number;
  new7d: number;
  new30d: number;
  series: { date: string; count: number }[];
  recent: { email: string; createdAt: number }[];
}

const fmt = (n: number) => n.toLocaleString("en-US");

function StatCard({
  icon,
  label,
  value,
  loading,
}: {
  icon: typeof faUsers;
  label: string;
  value: number;
  loading: boolean;
}) {
  return (
    <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-5">
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-[#9aa5b6]">{label}</span>
        <span className="w-9 h-9 rounded-lg bg-[#0366d6]/10 text-[#4493f8] grid place-items-center">
          <FontAwesomeIcon icon={icon} className="text-sm" />
        </span>
      </div>
      {loading ? (
        <div className="h-9 w-20 rounded bg-[#161b24] animate-pulse" />
      ) : (
        <div className="text-3xl font-semibold text-[#e6edf5]">
          {fmt(value)}
        </div>
      )}
    </div>
  );
}

export default function AdminDashboard() {
  const { currentUser } = useAuth();

  const authedFetcher = async (url: string) => {
    if (!currentUser) throw new Error("not signed in");
    const token = await currentUser.getIdToken();
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`${url} → ${res.status}`);
    return res.json();
  };

  const { data, error, isLoading } = useSWR<UserStats>(
    currentUser ? "/api/admin/user-stats" : null,
    authedFetcher,
  );

  const loading = isLoading || (!data && !error);
  const maxBar = Math.max(1, ...(data?.series.map((s) => s.count) ?? [1]));

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto bg-[#07090d] min-h-screen">
      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <span className="w-10 h-10 rounded-lg bg-[#0366d6]/10 text-[#4493f8] grid place-items-center">
          <FontAwesomeIcon icon={faTerminal} className="text-lg" />
        </span>
        <div>
          <h1 className="text-3xl font-light text-[#e6edf5] leading-tight">
            Admin
          </h1>
          <p className="text-sm text-[#697080]">User growth &amp; activity</p>
        </div>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-300">
          Failed to load user stats. Make sure you&apos;re signed in as an
          admin.
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard
          icon={faUsers}
          label="Total users"
          value={data?.total ?? 0}
          loading={loading}
        />
        <StatCard
          icon={faBolt}
          label="New · 24h"
          value={data?.new24h ?? 0}
          loading={loading}
        />
        <StatCard
          icon={faUserPlus}
          label="New · 7 days"
          value={data?.new7d ?? 0}
          loading={loading}
        />
        <StatCard
          icon={faArrowTrendUp}
          label="New · 30 days"
          value={data?.new30d ?? 0}
          loading={loading}
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Signups chart */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[#9aa5b6] mb-5">
            Signups · last 14 days
          </h2>
          {loading ? (
            <div className="h-40 rounded bg-[#161b24] animate-pulse" />
          ) : (
            <div className="flex items-end gap-1.5 h-40">
              {data?.series.map((s) => (
                <div
                  key={s.date}
                  className="flex-1 flex flex-col items-center justify-end h-full group"
                  title={`${s.date}: ${s.count}`}
                >
                  <span className="text-[10px] text-[#697080] mb-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    {s.count}
                  </span>
                  <div
                    className="w-full rounded-t bg-[#0366d6] group-hover:bg-[#4493f8] transition-colors"
                    style={{
                      height: `${Math.max(s.count === 0 ? 2 : 6, (s.count / maxBar) * 100)}%`,
                    }}
                  />
                  <span className="text-[9px] text-[#697080] mt-1.5">
                    {s.date.slice(8)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent signups */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6">
          <h2 className="text-sm font-medium text-[#9aa5b6] mb-4">
            Recent signups
          </h2>
          {loading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="h-10 rounded bg-[#161b24] animate-pulse"
                />
              ))}
            </div>
          ) : data && data.recent.length > 0 ? (
            <ul className="divide-y divide-[#161b24]">
              {data.recent.map((u) => (
                <li
                  key={u.email + u.createdAt}
                  className="flex items-center justify-between py-2.5"
                >
                  <span className="text-sm text-[#e6edf5] truncate mr-3">
                    {u.email}
                  </span>
                  <span className="text-xs text-[#697080] shrink-0">
                    {u.createdAt
                      ? new Date(u.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })
                      : "—"}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-[#697080]">No users yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
