import type { Metadata } from "next";
import "./globals.css";
import { GeistSans } from "geist/font/sans";
// ClientProviders and Navbar were temporarily disabled during prerender
// diagnostics; restore them now.
import ClientProviders from "@/lib/context/ClientProviders";
import ConditionalNav from "@/components/nav/ConditionalNav";
import { config } from "@fortawesome/fontawesome-svg-core";
import "@fortawesome/fontawesome-svg-core/styles.css";
config.autoAddCss = false;

export const metadata: Metadata = {
  title: "VulnScanners - Hosted Security Scanners",
  description:
    "Vulnerability Scanning: Zero Install. Maximum Impact. Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app.",
  metadataBase: new URL("https://vulnscanners.com"),
  openGraph: {
    title: "VulnScanners - Hosted Security Scanners",
    description:
      "Vulnerability Scanning: Zero Install. Maximum Impact. Hosted Nmap, Nuclei, and OWASP ZAP in one unified web app.",
    url: "https://vulnscanners.com",
    siteName: "VulnScanners",
  },
  twitter: {
    card: "summary_large_image",
    title: "VulnScanners - Hosted Security Scanners",
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
    <html lang="en" className={GeistSans.variable}>
      {/* Change your theme HERE */}
      <body data-theme="cupcake">
        <ClientProviders>
          <ConditionalNav>{children}</ConditionalNav>
        </ClientProviders>
      </body>
    </html>
  );
}
