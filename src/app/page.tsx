import type { Metadata } from "next";
import LandingPage from "./LandingPage";
import { LANDING_FAQ } from "./landing-faq";

export const metadata: Metadata = {
  title: "Hosted Nmap, Nuclei & OWASP ZAP scanning — VulnScanners",
  description:
    "Run Nmap, Nuclei, and OWASP ZAP from one hosted console. No install, no maintenance — credits never expire. Built for MSPs, pentesters, and security teams.",
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: "https://vulnscanners.com/",
    title: "Hosted Nmap, Nuclei & OWASP ZAP scanning — VulnScanners",
    description:
      "Run Nmap, Nuclei, and OWASP ZAP from one hosted console. Credits never expire.",
    siteName: "VulnScanners",
  },
  twitter: {
    card: "summary_large_image",
    title: "Hosted Nmap, Nuclei & OWASP ZAP scanning — VulnScanners",
    description:
      "Run Nmap, Nuclei, and OWASP ZAP from one hosted console. Credits never expire.",
  },
};

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: LANDING_FAQ.map((item) => ({
    "@type": "Question",
    name: item.q,
    acceptedAnswer: { "@type": "Answer", text: item.a },
  })),
};

export default function Page() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <LandingPage />
    </>
  );
}
