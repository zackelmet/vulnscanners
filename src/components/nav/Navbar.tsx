"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";

function NmapIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="2" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="6" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M12 2v4M12 18v4M2 12h4M18 12h4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
      />
    </svg>
  );
}

function NucleiIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ZapIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M12 2 4 5v6c0 5 3.5 9 8 11 4.5-2 8-6 8-11V5l-8-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path
        d="m9 12 2 2 4-4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 10 10"
      fill="none"
      aria-hidden="true"
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path
        d="m2 3.5 3 3 3-3"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

const SCANNER_ITEMS = [
  {
    href: "/scanners/nmap",
    name: "Nmap",
    desc: "Port and service scanning",
    Icon: NmapIcon,
  },
  {
    href: "/scanners/nuclei",
    name: "Nuclei",
    desc: "Template-based CVE detection",
    Icon: NucleiIcon,
  },
  {
    href: "/scanners/zap",
    name: "OWASP ZAP",
    desc: "Web app DAST",
    Icon: ZapIcon,
  },
] as const;

export default function Navbar() {
  const { currentUser, isLoadingAuth } = useAuth();
  const [scannersOpen, setScannersOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setScannersOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="w-full border-b border-[#0366d6]/30 bg-[#0a141f] text-white relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-5 py-4">
        <Link
          href="/"
          className="flex items-center gap-3 hover:opacity-90 transition"
        >
          <Image
            src="/vulnscanners-logo.png"
            alt="VulnScanners Logo"
            width={40}
            height={40}
            className="h-10 w-auto"
            priority
          />
          <span className="text-white font-semibold text-lg tracking-wide leading-tight hidden sm:block">
            VulnScanners
          </span>
        </Link>

        <div className="flex items-center gap-3">
          {!isLoadingAuth && !currentUser && (
            <>
              <div
                ref={dropdownRef}
                className="relative"
                onMouseEnter={() => setScannersOpen(true)}
                onMouseLeave={() => setScannersOpen(false)}
              >
                <button
                  type="button"
                  onClick={() => setScannersOpen((v) => !v)}
                  aria-haspopup="true"
                  aria-expanded={scannersOpen}
                  className="flex items-center gap-1.5 text-sm font-medium text-gray-300 hover:text-[#0366d6] transition"
                >
                  Scanners
                  <ChevronIcon open={scannersOpen} />
                </button>

                {scannersOpen && (
                  <div className="absolute right-0 top-full pt-2 w-72">
                    <div className="rounded-xl bg-[#0d1117] border border-[#1f2632] shadow-xl overflow-hidden">
                      <ul className="py-1.5">
                        {SCANNER_ITEMS.map(({ href, name, desc, Icon }) => (
                          <li key={href}>
                            <Link
                              href={href}
                              onClick={() => setScannersOpen(false)}
                              className="flex items-start gap-3 px-4 py-3 hover:bg-[#11161f] transition-colors group"
                            >
                              <span className="text-[#9aa5b6] group-hover:text-[#e6edf5] transition-colors mt-0.5">
                                <Icon />
                              </span>
                              <span className="flex-1 min-w-0">
                                <span className="block text-sm font-medium text-[#e6edf5]">
                                  {name}
                                </span>
                                <span className="block text-xs text-[#697080]">
                                  {desc}
                                </span>
                              </span>
                            </Link>
                          </li>
                        ))}
                        <li className="border-t border-[#161b24] mt-1.5 pt-1.5">
                          <Link
                            href="/scanners"
                            onClick={() => setScannersOpen(false)}
                            className="block px-4 py-2 text-xs font-mono uppercase tracking-[0.08em] text-[#4493f8] hover:text-[#79b6ff] transition-colors"
                          >
                            All scanners →
                          </Link>
                        </li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>

              <Link
                href="/blog"
                className="text-sm font-medium text-gray-300 hover:text-[#0366d6] transition"
              >
                Blog
              </Link>
              <Link
                href="/#pricing"
                className="text-sm font-medium text-gray-300 hover:text-[#0366d6] transition"
              >
                Pricing
              </Link>
              <Link
                href="/login"
                className="px-4 py-2 text-sm font-semibold bg-[#0366d6] hover:bg-[#034ea1] text-white rounded-lg transition"
              >
                Sign In
              </Link>
            </>
          )}

          {!isLoadingAuth && currentUser && (
            <Link
              href="/app/dashboard"
              className="px-4 py-2 text-sm font-semibold bg-[#0366d6] hover:bg-[#034ea1] text-white rounded-lg transition"
            >
              Dashboard
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
