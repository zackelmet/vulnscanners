"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faHome,
  faBullseye,
  faSatelliteDish,
  faLifeRing,
  faQuestionCircle,
  faBars,
  faTimes,
  faJetFighterUp,
  faSignOutAlt,
  faCog,
  faChevronUp,
  faHistory,
  faShieldHalved,
} from "@fortawesome/free-solid-svg-icons";
import { useAuth } from "@/lib/context/AuthContext";
import signout from "@/lib/firebase/signout";
import Image from "next/image";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export default function DashboardLayout({ children }: DashboardLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const { currentUser } = useAuth();
  const accountMenuRef = useRef<HTMLDivElement>(null);

  const getInitials = (email: string | null | undefined) => {
    if (!email) return "U";
    return email.substring(0, 2).toUpperCase();
  };

  const handleLogout = () => {
    signout(async () => {
      router.push("/login");
    });
  };

  // Close account menu on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        accountMenuRef.current &&
        !accountMenuRef.current.contains(event.target as Node)
      ) {
        setAccountMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const navItems = [
    { href: "/app/dashboard", label: "Dashboard", icon: faHome },
    { href: "/app/targets", label: "Targets", icon: faBullseye },
    { href: "/app/scans", label: "Launch Scan", icon: faJetFighterUp },
    { href: "/app/history", label: "Scan History", icon: faHistory },
  ];

  const bottomItems = [
    { href: "#", label: "Support", icon: faLifeRing },
    { href: "#", label: "Help Center", icon: faQuestionCircle },
  ];

  return (
    <div className="min-h-screen bg-[#07090d] flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0d1117] border-r border-[#161b24] text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#161b24]">
          <Link href="/" className="flex items-center gap-3">
            <Image
              src="/HA-logo.png"
              alt="VulnScanners"
              width={32}
              height={32}
              className="w-8 h-8"
            />
            <span className="font-bold text-lg">VulnScanners</span>
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  isActive
                    ? "bg-[#0366d6]/20 text-[#4493f8] font-semibold"
                    : "text-[#9aa5b6] hover:bg-[#11161f] hover:text-[#e6edf5]"
                }`}
                onClick={() => setSidebarOpen(false)}
              >
                <FontAwesomeIcon icon={item.icon} className="w-5 h-5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="px-4 pb-6 space-y-4">
          {/* Support links */}
          <div className="space-y-1">
            {bottomItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-[#697080] hover:text-[#e6edf5] hover:bg-[#11161f] transition-colors text-sm"
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
              </a>
            ))}
          </div>

          {/* Account */}
          <div
            className="relative border-t border-[#161b24] pt-4"
            ref={accountMenuRef}
          >
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-[#11161f] transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#0366d6] text-white font-bold flex items-center justify-center text-sm">
                {getInitials(currentUser?.email)}
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <div className="text-sm font-medium truncate text-[#e6edf5]">
                  {currentUser?.email || "User"}
                </div>
              </div>
              <FontAwesomeIcon
                icon={faChevronUp}
                className={`text-[#697080] text-sm transition-transform ${accountMenuOpen ? "" : "rotate-180"}`}
              />
            </button>

            {/* Account Dropdown Menu */}
            {accountMenuOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#11161f] rounded-lg shadow-xl border border-[#161b24] overflow-hidden">
                <div className="py-1">
                  <Link
                    href="/app/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-[#9aa5b6] hover:bg-[#0d1117] hover:text-[#e6edf5] transition-colors"
                    onClick={() => {
                      setAccountMenuOpen(false);
                      setSidebarOpen(false);
                    }}
                  >
                    <FontAwesomeIcon icon={faCog} className="w-4 h-4" />
                    Settings
                  </Link>
                  <button
                    onClick={() => {
                      handleLogout();
                      setAccountMenuOpen(false);
                    }}
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-[#0d1117] hover:text-red-300 transition-colors"
                  >
                    <FontAwesomeIcon icon={faSignOutAlt} className="w-4 h-4" />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Upgrade button */}
          <Link
            href="/app/dashboard?purchase=true"
            className="block w-full px-4 py-3 bg-[#0366d6] text-white font-semibold rounded-lg text-center hover:bg-[#4493f8] transition-colors"
          >
            <FontAwesomeIcon icon={faJetFighterUp} className="mr-2" />
            Buy Credits
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile header with hamburger */}
        <header className="lg:hidden bg-[#0d1117] border-b border-[#161b24] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-[#9aa5b6] hover:text-[#e6edf5]"
          >
            <FontAwesomeIcon icon={faBars} className="w-6 h-6" />
          </button>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/HA-logo.png"
              alt="VulnScanners"
              width={24}
              height={24}
              className="w-6 h-6"
            />
            <span className="font-bold text-[#e6edf5]">VulnScanners</span>
          </Link>
          <div className="w-10" /> {/* Spacer for centering */}
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-x-hidden overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
