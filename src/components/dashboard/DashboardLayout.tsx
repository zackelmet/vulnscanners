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
  faRocket,
  faSignOutAlt,
  faCog,
  faChevronUp,
  faRobot,
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
    { href: "/app/scans", label: "Scans", icon: faSatelliteDish },
    {
      href: "/app/vulnerabilities",
      label: "Vulnerabilities",
      icon: faShieldHalved,
    },
    { href: "/app/pentests", label: "Pentests", icon: faRobot },
  ];

  const bottomItems = [
    { href: "#", label: "Support", icon: faLifeRing },
    { href: "#", label: "Help Center", icon: faQuestionCircle },
  ];

  return (
    <div className="min-h-screen bg-[#0a141f] flex overflow-hidden">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-60 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 bg-[#0b1826] text-white transform transition-transform duration-300 ease-in-out ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } flex flex-col border-r border-[#1a2d44]`}
      >
        {/* Logo */}
        <div className="p-6 border-b border-[#1a2d44]">
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
                    ? "bg-[#06b6d4]/10 text-[#22d3ee] font-semibold border border-[#06b6d4]/30"
                    : "text-gray-300 hover:bg-white/5 hover:text-white border border-transparent"
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
                className="flex items-center gap-3 px-4 py-2 rounded-lg text-gray-400 hover:text-white hover:bg-white/5 transition-colors text-sm"
              >
                <FontAwesomeIcon icon={item.icon} className="w-4 h-4" />
                {item.label}
              </a>
            ))}
          </div>

          {/* Account */}
          <div
            className="relative border-t border-[#1a2d44] pt-4"
            ref={accountMenuRef}
          >
            <button
              onClick={() => setAccountMenuOpen(!accountMenuOpen)}
              className="w-full flex items-center gap-3 px-4 py-2 rounded-lg hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full bg-[#06b6d4] text-[#04141d] font-bold flex items-center justify-center text-sm">
                {getInitials(currentUser?.email)}
              </div>
              <div className="flex-1 overflow-hidden text-left">
                <div className="text-sm font-medium truncate">
                  {currentUser?.email || "User"}
                </div>
              </div>
              <FontAwesomeIcon
                icon={faChevronUp}
                className={`text-gray-400 text-sm transition-transform ${accountMenuOpen ? "" : "rotate-180"}`}
              />
            </button>

            {/* Account Dropdown Menu */}
            {accountMenuOpen && (
              <div className="absolute bottom-full left-4 right-4 mb-2 bg-[#13253a] rounded-lg shadow-xl border border-[#1a2d44] overflow-hidden">
                <div className="py-1">
                  <Link
                    href="/app/settings"
                    className="flex items-center gap-3 px-4 py-2 text-sm text-gray-300 hover:bg-white/5 hover:text-white transition-colors"
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
                    className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-white/5 hover:text-red-300 transition-colors"
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
            href="/#pricing"
            className="block w-full px-4 py-3 bg-[#06b6d4] text-[#04141d] font-semibold rounded-lg text-center hover:bg-[#0891b2] hover:text-white transition-colors shadow-[0_8px_24px_rgba(6,182,212,0.25)]"
          >
            <FontAwesomeIcon icon={faRocket} className="mr-2" />
            Upgrade Plan
          </Link>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
        {/* Mobile header with hamburger */}
        <header className="lg:hidden bg-[#0b1826] border-b border-[#1a2d44] px-4 py-3 flex items-center justify-between sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-2 text-gray-300 hover:text-white"
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
            <span className="font-bold text-white">VulnScanners</span>
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
