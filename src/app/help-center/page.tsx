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
        "Our incident response team handles security-related concerns. If you believe you've discovered a vulnerability in VulnScanners, please report it through our support page using the \"Security concern\" category.",
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
    <div className="min-h-screen">
      {/* Header */}
      <header className="border-b border-[#161b24] bg-[#0d1117]/80 backdrop-blur">
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
      <main className="max-w-3xl mx-auto px-6 py-16">
        {/* Page Header */}
        <div className="mb-14">
          <p className="font-mono text-[11.5px] uppercase tracking-[0.08em] text-[#4493f8] mb-3">
            Trust &amp; Safety
          </p>
          <h1 className="text-4xl lg:text-5xl font-medium tracking-tight text-[#e6edf5] mb-3">
            How we protect your data and our platform.
          </h1>
          <p className="text-[#9aa5b6] text-lg leading-relaxed max-w-2xl">
            Our commitment to protecting your data, ensuring ethical use, and
            maintaining the highest security standards.
          </p>
        </div>

        {/* Content Sections */}
        <div className="space-y-10">
          {sections.map((section, index) => (
            <section
              key={index}
              className="bg-[#0d1117]/60 border border-[#161b24] rounded-lg p-7 backdrop-blur"
            >
              <div className="flex items-start gap-3 mb-3">
                <FontAwesomeIcon
                  icon={section.icon}
                  className="text-base text-[#4493f8] mt-1.5 flex-shrink-0"
                />
                <h2 className="text-xl font-medium tracking-tight text-[#e6edf5]">
                  {section.title}
                </h2>
              </div>
              <div className="space-y-3 pl-7">
                {section.content.map((paragraph, pIndex) => (
                  <p
                    key={pIndex}
                    className="text-[#9aa5b6] text-[15px] leading-relaxed"
                  >
                    {paragraph}
                  </p>
                ))}
              </div>
            </section>
          ))}
        </div>

        {/* Contact CTA */}
        <div className="mt-14 border-t border-[#161b24] pt-10">
          <h3 className="text-xl font-medium tracking-tight text-[#e6edf5] mb-2">
            Questions or concerns?
          </h3>
          <p className="text-[#9aa5b6] text-[15px] leading-relaxed mb-5 max-w-2xl">
            If you have questions about our security practices, data handling,
            or need to report a security concern, our team is here to help.
          </p>
          <div>
            <Link
              href="/support"
              className="inline-block px-5 py-2.5 bg-[#0366d6] hover:bg-[#4493f8] text-white text-sm font-medium rounded-md transition-colors"
            >
              Contact support
            </Link>
          </div>
        </div>

        {/* Last Updated */}
        <div className="mt-10">
          <p className="text-xs text-[#697080] font-mono">
            Last updated{" "}
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
