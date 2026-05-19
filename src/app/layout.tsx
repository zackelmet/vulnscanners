import type { Metadata } from "next";
import Script from "next/script";
import "./globals.css";
import { IBM_Plex_Sans } from "next/font/google";

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
});
// ClientProviders and Navbar were temporarily disabled during prerender
// diagnostics; restore them now.
import ClientProviders from "@/lib/context/ClientProviders";
import ConditionalNav from "@/components/nav/ConditionalNav";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

export const metadata: Metadata = {
  title: "A better vulnerability scanner — VulnScanners",
  description:
    "Vulnerability Scanning: Zero Install. Maximum Impact. Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app.",
  metadataBase: new URL("https://vulnscanners.com"),
  openGraph: {
    title: "A better vulnerability scanner — VulnScanners",
    description:
      "Vulnerability Scanning: Zero Install. Maximum Impact. Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app.",
    url: "https://vulnscanners.com",
    siteName: "VulnScanners",
  },
  twitter: {
    card: "summary_large_image",
    title: "A better vulnerability scanner — VulnScanners",
    description:
      "Vulnerability Scanning: Zero Install. Maximum Impact. Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app.",
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

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={ibmPlexSans.variable}>
      {/* Change your theme HERE */}
      <body data-theme="cupcake" className={ibmPlexSans.className}>
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
