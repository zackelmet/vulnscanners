"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faUser,
  faCreditCard,
  faBell,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/context/AuthContext";
import { useUserData } from "@/lib/hooks/useUserData";
import DashboardLayout from "@/components/dashboard/DashboardLayout";

export default function SettingsPage() {
  const { currentUser } = useAuth();
  const { userData, loading } = useUserData();

  return (
    <DashboardLayout>
      <div className="p-6 lg:p-8 space-y-6 max-w-full bg-[#0a141f] min-h-screen">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light text-white">Settings</h1>
          <p className="text-gray-400 mt-1">
            Manage your account preferences and subscription
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#22d3ee]">
              <FontAwesomeIcon icon={faUser} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Account</h2>
              <p className="text-gray-400 text-sm">
                Your account information and preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Email
              </label>
              <input
                type="email"
                value={currentUser?.email || ""}
                disabled
                className="w-full px-4 py-2 border border-[#1a2d44] rounded-lg bg-white/5 text-gray-300 cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-gray-300 mb-1">
                Account ID
              </label>
              <input
                type="text"
                value={currentUser?.uid || ""}
                disabled
                className="w-full px-4 py-2 border border-[#1a2d44] rounded-lg bg-white/5 text-gray-300 cursor-not-allowed font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#22d3ee]">
              <FontAwesomeIcon icon={faCreditCard} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Subscription</h2>
              <p className="text-gray-400 text-sm">
                Manage your plan and billing
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-gray-400">Loading subscription...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-gray-300">
                    Scan Credits
                  </div>
                  <div className="text-sm text-gray-200 mt-2 space-y-1">
                    <div>
                      Nmap:{" "}
                      <span className="font-bold text-white">
                        {userData?.scanCredits?.nmap ?? 0}
                      </span>
                    </div>
                    <div>
                      Nuclei:{" "}
                      <span className="font-bold text-white">
                        {userData?.scanCredits?.nuclei ?? 0}
                      </span>
                    </div>
                    <div>
                      ZAP:{" "}
                      <span className="font-bold text-white">
                        {userData?.scanCredits?.zap ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
                <a
                  href="/#pricing"
                  className="px-4 py-2 bg-[#06b6d4] text-[#04141d] hover:text-white font-semibold rounded-lg hover:bg-[#0891b2] transition-colors shadow-[0_8px_24px_rgba(6,182,212,0.2)]"
                >
                  Buy More
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-gradient-to-br from-[#0d1b2e] to-[#0a141f] border border-[#1a2d44] rounded-xl p-6 shadow-lg">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-[#06b6d4]/10 border border-[#06b6d4]/30 text-[#22d3ee]">
              <FontAwesomeIcon icon={faBell} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Notifications</h2>
              <p className="text-gray-400 text-sm">
                Manage how you receive updates
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">
                  Scan Completion Emails
                </div>
                <div className="text-sm text-gray-400">
                  Get notified when scans complete
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-white/10 border border-[#1a2d44] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#06b6d4] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 peer-checked:after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06b6d4] peer-checked:border-[#06b6d4]"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-white">Security Alerts</div>
                <div className="text-sm text-gray-400">
                  Important security notifications
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-white/10 border border-[#1a2d44] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#06b6d4] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-gray-300 peer-checked:after:bg-white after:border-white/20 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#06b6d4] peer-checked:border-[#06b6d4]"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
