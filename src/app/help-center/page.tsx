import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faShieldHalved,
  faLock,
  faUserShield,
  faGavel,
  faBell,
  faCheckCircle,
} from "@fortawesome/free-solid-svg-icons";
import Link from "next/link";

export const metadata = {
  title: "Trust & Safety | VulnScanners",
  description:
    "Learn about our commitment to security, data protection, ethical use policies, and compliance standards.",
};

export default function HelpCenterPage() {
  const sections = [
    {
      icon: faShieldHalved,
      title: "Our Commitment to Security",
      content: [
        "At VulnScanners, security isn't just our product—it's our foundation. We implement industry-leading security practices to protect your data and ensure the integrity of our scanning infrastructure.",
        "Our platform undergoes regular security audits and penetration testing to identify and remediate vulnerabilities before they can be exploited. We use the same tools we provide to you—Nmap, Nuclei, and OWASP ZAP—to continuously monitor and improve our own security posture.",
      ],
    },
    {
      icon: faLock,
      title: "Data Protection & Privacy",
      content: [
        "We understand the sensitive nature of vulnerability scan data. All scan results, target information, and user data are encrypted both in transit (TLS 1.3) and at rest (AES-256).",
        "Your scan results are stored in secure, isolated cloud storage with signed URLs that expire after 7 days. We never share, sell, or distribute your scan data to third parties. Your vulnerability information remains strictly confidential.",
        "We implement strict access controls and audit logging. Only authorized systems can access scan data, and all access is logged for security monitoring purposes.",
      ],
    },
    {
      icon: faUserShield,
      title: "Ethical Use Policy",
      content: [
        "VulnScanners is designed for authorized security testing only. By using our platform, you agree to scan only systems and networks you own or have explicit written permission to test.",
        "Unauthorized scanning of third-party systems is strictly prohibited and may constitute illegal activity under laws such as the Computer Fraud and Abuse Act (CFAA) and similar international legislation.",
        "We reserve the right to suspend or terminate accounts that violate our ethical use policy. If we detect patterns of unauthorized scanning, we will cooperate with law enforcement authorities as required by law.",
      ],
    },
    {
      icon: faGavel,
      title: "Compliance Standards",
      content: [
        "VulnScanners maintains compliance with key industry standards and regulations to ensure our platform meets the highest security and privacy requirements.",
        "Our infrastructure follows OWASP security best practices and implements controls aligned with SOC 2 Type II standards. We regularly review and update our security controls to stay ahead of emerging threats.",
        "For customers subject to regulatory requirements such as GDPR, HIPAA, or PCI DSS, we provide detailed documentation of our security controls and data handling practices upon request.",
      ],
    },
    {
      icon: faBell,
      title: "Incident Response",
      content: [
        "In the unlikely event of a security incident affecting our platform or your data, we maintain a comprehensive incident response plan to quickly contain, investigate, and remediate the issue.",
        "We will notify affected users within 72 hours of confirming a data breach or security incident that compromises user data, in accordance with applicable regulations.",
        "Our incident response team is available 24/7 to handle security-related concerns. If you believe you've discovered a vulnerability in VulnScanners, please report it to security@vulnscanners.com.",
      ],
    },
    {
      icon: faCheckCircle,
      title: "Your Responsibilities",
      content: [
        "As a VulnScanners user, you play a critical role in maintaining the security of your account and data. Please follow these best practices:",
        "• Use strong, unique passwords and enable multi-factor authentication when available",
        "• Keep your API keys and authentication credentials secure—never share them or commit them to public repositories",
        "• Regularly review your scan history and target list for unauthorized activity",
        "• Report any suspicious activity or security concerns to our support team immediately",
        "• Ensure you have proper authorization before scanning any target system",
        "• Use scan results responsibly—remediate vulnerabilities rather than exploiting them",
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-[#07090d]">
      {/* Header */}
      <header className="border-b border-[#161b24] bg-[#0d1117]">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-[#4493f8] hover:text-[#0366d6] transition-colors"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M10 19l-7-7m0 0l7-7m-7 7h18"
              />
            </svg>
            Back to Home
          </Link>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-5xl mx-auto px-6 py-12 lg:py-16">
        {/* Page Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-[#0366d6]/20 border border-[#0366d6]/30 mb-6">
            <FontAwesomeIcon
              icon={faShieldHalved}
              className="text-4xl text-[#4493f8]"
            />
          </div>
          <h1 className="text-4xl lg:text-5xl font-bold text-[#e6edf5] mb-4">
            Trust & Safety
          </h1>
          <p className="text-xl text-[#9aa5b6] max-w-3xl mx-auto">
            Our commitment to protecting your data, ensuring ethical use, and
            maintaining the highest security standards
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-12">
          {sections.map((section, index) => (
            <div
              key={index}
              className="bg-[#0d1117] border border-[#161b24] rounded-xl p-8 shadow-sm"
            >
              <div className="flex items-start gap-4 mb-4">
                <div className="p-3 rounded-lg bg-[#0366d6]/20 border border-[#0366d6]/30 flex-shrink-0">
                  <FontAwesomeIcon
                    icon={section.icon}
                    className="text-2xl text-[#4493f8]"
                  />
                </div>
                <div className="flex-1">
                  <h2 className="text-2xl font-bold text-[#e6edf5] mb-4">
                    {section.title}
                  </h2>
                  <div className="space-y-4">
                    {section.content.map((paragraph, pIndex) => (
                      <p
                        key={pIndex}
                        className="text-[#9aa5b6] leading-relaxed whitespace-pre-line"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-16 bg-[#0d1117] border border-[#161b24] rounded-xl p-8 text-center">
          <h3 className="text-2xl font-bold text-[#e6edf5] mb-3">
            Questions or Concerns?
          </h3>
          <p className="text-[#9aa5b6] mb-6 max-w-2xl mx-auto">
            If you have questions about our security practices, data handling,
            or need to report a security concern, our team is here to help.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/support"
              className="inline-block px-6 py-3 bg-[#0366d6] hover:bg-[#4493f8] text-white font-semibold rounded-lg transition-colors"
            >
              Contact Support
            </Link>
            <a
              href="mailto:security@vulnscanners.com"
              className="inline-block px-6 py-3 bg-[#11161f] hover:bg-[#161b24] text-[#e6edf5] font-semibold rounded-lg border border-[#161b24] transition-colors"
            >
              Report Security Issue
            </a>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-8 text-center">
          <p className="text-sm text-[#697080]">
            Last updated:{" "}
            {new Date().toLocaleDateString("en-US", {
              year: "numeric",
              month: "long",
              day: "numeric",
            })}
          </p>
        </div>
      </main>
    </div>
  );
}
