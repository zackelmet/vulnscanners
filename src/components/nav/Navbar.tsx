"use client";

import Image from "next/image";
import Link from "next/link";
import { useState, useRef, useEffect } from "react";
import { useAuth } from "@/lib/context/AuthContext";

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
    logo: "/scanners/nmap.png",
    logoW: 60,
    logoH: 28,
  },
  {
    href: "/scanners/nuclei",
    name: "Nuclei",
    desc: "Template-based CVE detection",
    logo: "/scanners/nuclei.png",
    logoW: 28,
    logoH: 28,
  },
  {
    href: "/scanners/zap",
    name: "OWASP ZAP",
    desc: "Web app DAST",
    logo: "/scanners/zap.png",
    logoW: 28,
    logoH: 28,
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
          {!isLoadingAuth && (
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
                        {SCANNER_ITEMS.map(
                          ({ href, name, desc, logo, logoW, logoH }) => (
                            <li key={href}>
                              <Link
                                href={href}
                                onClick={() => setScannersOpen(false)}
                                className="flex items-center gap-3 px-4 py-3 hover:bg-[#11161f] transition-colors group"
                              >
                                <span className="w-8 h-7 flex items-center justify-center shrink-0">
                                  <Image
                                    src={logo}
                                    alt={`${name} logo`}
                                    width={logoW}
                                    height={logoH}
                                    className="max-h-7 w-auto object-contain grayscale brightness-150 opacity-80 group-hover:grayscale-0 group-hover:brightness-100 group-hover:opacity-100 transition-all"
                                  />
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
                          ),
                        )}
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

              {currentUser ? (
                <Link
                  href="/app/dashboard"
                  className="px-4 py-2 text-sm font-semibold bg-[#0366d6] hover:bg-[#034ea1] text-white rounded-lg transition"
                >
                  Console
                </Link>
              ) : (
                <Link
                  href="/login"
                  className="px-4 py-2 text-sm font-semibold bg-[#0366d6] hover:bg-[#034ea1] text-white rounded-lg transition"
                >
                  Sign In
                </Link>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
