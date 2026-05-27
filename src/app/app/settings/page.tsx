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
      <div className="p-6 lg:p-8 space-y-6 max-w-full bg-[#07090d] min-h-screen">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-light text-[#e6edf5]">Settings</h1>
          <p className="text-[#9aa5b6] mt-1">
            Manage your account preferences and subscription
          </p>
        </div>

        {/* Account Info */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-[#0366d6]/20 border border-[#0366d6]/30 text-[#4493f8]">
              <FontAwesomeIcon icon={faUser} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e6edf5]">Account</h2>
              <p className="text-[#9aa5b6] text-sm">
                Your account information and preferences
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-semibold text-[#9aa5b6] mb-1">
                Email
              </label>
              <input
                type="email"
                value={currentUser?.email || ""}
                disabled
                className="w-full px-4 py-2 border border-[#161b24] rounded-lg bg-[#11161f] text-[#9aa5b6] cursor-not-allowed"
              />
            </div>

            <div>
              <label className="block text-sm font-semibold text-[#9aa5b6] mb-1">
                Account ID
              </label>
              <input
                type="text"
                value={currentUser?.uid || ""}
                disabled
                className="w-full px-4 py-2 border border-[#161b24] rounded-lg bg-[#11161f] text-[#9aa5b6] cursor-not-allowed font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Subscription Info */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-[#0366d6]/20 border border-[#0366d6]/30 text-[#4493f8]">
              <FontAwesomeIcon icon={faCreditCard} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e6edf5]">Subscription</h2>
              <p className="text-[#9aa5b6] text-sm">
                Manage your plan and billing
              </p>
            </div>
          </div>

          {loading ? (
            <div className="text-[#9aa5b6]">Loading subscription...</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold text-[#9aa5b6]">
                    Scan Credits
                  </div>
                  <div className="text-sm text-[#e6edf5] mt-2 space-y-1">
                    <div>
                      Nmap:{" "}
                      <span className="font-bold">
                        {userData?.scanCredits?.nmap ?? 0}
                      </span>
                    </div>
                    <div>
                      Nuclei:{" "}
                      <span className="font-bold">
                        {userData?.scanCredits?.nuclei ?? 0}
                      </span>
                    </div>
                    <div>
                      ZAP:{" "}
                      <span className="font-bold">
                        {userData?.scanCredits?.zap ?? 0}
                      </span>
                    </div>
                  </div>
                </div>
                <a
                  href="/app/dashboard?purchase=true"
                  className="px-4 py-2 bg-[#0366d6] text-white font-semibold rounded-lg hover:bg-[#4493f8] transition-colors"
                >
                  Buy More
                </a>
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <div className="bg-[#0d1117] border border-[#161b24] rounded-xl p-6 shadow-sm">
          <div className="flex items-center gap-4 mb-6">
            <div className="p-3 rounded-xl bg-[#0366d6]/20 border border-[#0366d6]/30 text-[#4493f8]">
              <FontAwesomeIcon icon={faBell} className="text-2xl" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-[#e6edf5]">
                Notifications
              </h2>
              <p className="text-[#9aa5b6] text-sm">
                Manage how you receive updates
              </p>
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#e6edf5]">
                  Scan Completion Emails
                </div>
                <div className="text-sm text-[#9aa5b6]">
                  Get notified when scans complete
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-[#11161f] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0366d6] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#697080] after:border-[#161b24] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0366d6] peer-checked:after:bg-white"></div>
              </label>
            </div>

            <div className="flex items-center justify-between">
              <div>
                <div className="font-semibold text-[#e6edf5]">
                  Security Alerts
                </div>
                <div className="text-sm text-[#9aa5b6]">
                  Important security notifications
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  defaultChecked
                />
                <div className="w-11 h-6 bg-[#11161f] peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-[#0366d6] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-[#697080] after:border-[#161b24] after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0366d6] peer-checked:after:bg-white"></div>
              </label>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
