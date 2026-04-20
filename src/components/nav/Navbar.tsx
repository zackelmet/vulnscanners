"use client";

import Image from "next/image";
import Link from "next/link";
import { useAuth } from "@/lib/context/AuthContext";

export default function Navbar() {
  const { currentUser, isLoadingAuth } = useAuth();

  return (
    <header className="w-full border-b border-[#0366d6]/30 bg-[#0a141f] text-white relative z-40">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-5 py-4">
        <Link
          href="https://vulnscanners.com"
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
