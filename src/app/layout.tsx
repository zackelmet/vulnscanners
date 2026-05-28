import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { IBM_Plex_Sans, Michroma } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});

const michroma = Michroma({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-michroma",
});
// ClientProviders and Navbar were temporarily disabled during prerender
// diagnostics; restore them now.
import ClientProviders from "@/lib/context/ClientProviders";
import ConditionalNav from "@/components/nav/ConditionalNav";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

export const metadata: Metadata = {
  title: {
    default: "VulnScanners — Hosted Nmap, Nuclei & OWASP ZAP",
    template: "%s · VulnScanners",
  },
  description:
    "Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app. Zero install, no maintenance, credits never expire.",
  metadataBase: new URL("https://vulnscanners.com"),
  openGraph: {
    title: "VulnScanners — Hosted Nmap, Nuclei & OWASP ZAP",
    description:
      "Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app. Zero install, no maintenance.",
    url: "https://vulnscanners.com",
    siteName: "VulnScanners",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "VulnScanners — Hosted Nmap, Nuclei & OWASP ZAP",
    description:
      "Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app. Zero install, no maintenance.",
  },
  icons: {
    icon: [
      { url: "/favicon/favicon.ico" },
      { url: "/favicon/favicon-32x32.png", sizes: "32x32" },
      { url: "/favicon/favicon-16x16.png", sizes: "16x16" },
    ],
    shortcut: "/favicon/favicon-32x32.png",
    apple: "/favicon/apple-touch-icon.png",
  },
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "VulnScanners",
  url: "https://vulnscanners.com",
  logo: "https://vulnscanners.com/vulnscanners-logo.png",
  description:
    "Hosted Nmap, Nuclei, and OWASP ZAP vulnerability scanning in one unified web app.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${ibmPlexSans.variable} ${michroma.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      {/* Change your theme HERE */}
      <body data-theme="cupcake" className={michroma.className}>
        <ClientProviders>
          <ConditionalNav>{children}</ConditionalNav>
        </ClientProviders>
        <Script id="apollo-tracker" strategy="afterInteractive">
          {`function initApollo(){var n=Math.random().toString(36).substring(7),o=document.createElement("script");o.src="https://assets.apollo.io/micro/website-tracker/tracker.iife.js?nocache="+n,o.async=!0,o.defer=!0,o.onload=function(){window.trackingFunctions.onLoad({appId:"6a0b4046e86a4e0010a1ab14"})},document.head.appendChild(o)}initApollo();`}
        </Script>
      </body>
    </html>
  );
}
