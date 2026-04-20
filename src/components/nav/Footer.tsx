import { faLinkedin, faXTwitter } from "@fortawesome/free-brands-svg-icons";
import Image from "next/image";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import Link from "next/link";

export default function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[#0a141f] border-t border-[#0366d6]/30 text-white">
      <div className="max-w-7xl mx-auto px-5 pt-10 pb-12 flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="flex items-center gap-3">
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
              />
              <span className="text-white font-semibold text-lg tracking-wide">
                VulnScanners
              </span>
            </Link>
          </div>

          <div className="flex items-center gap-4 flex-wrap">
            <span className="px-3 py-1 rounded-full bg-[#0366d6]/10 border border-[#0366d6]/30 text-[#0366d6] text-xs font-medium tracking-wide">
              Powered by Open Source
            </span>
            <div className="flex items-center gap-3 text-gray-400">
              <Link
                href="https://x.com/vuln_scanners"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0366d6] transition"
                aria-label="X (formerly Twitter)"
              >
                <FontAwesomeIcon icon={faXTwitter} className="text-xl" />
              </Link>
              <Link
                href="https://www.linkedin.com/company/hacker-analytics/"
                target="_blank"
                rel="noreferrer"
                className="hover:text-[#0366d6] transition"
              >
                <FontAwesomeIcon icon={faLinkedin} className="text-xl" />
              </Link>
            </div>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 text-sm text-gray-500">
          <div className="flex items-center gap-0 divide-x divide-gray-700">
            <Link href="/blog" className="hover:text-[#0366d6] transition px-4">
              Blog
            </Link>
            <Link
              href="/#pricing"
              className="hover:text-[#0366d6] transition px-4"
            >
              Pricing
            </Link>
            <Link
              href="/trust-safety"
              className="hover:text-[#0366d6] transition px-4"
            >
              Trust + Safety
            </Link>
            <Link
              href="/support"
              className="hover:text-[#0366d6] transition px-4"
            >
              Support
            </Link>
          </div>
          <div className="text-xs sm:text-sm">
            © {year} VulnScanners. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}
