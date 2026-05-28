/**
 * Shared schema.org JSON-LD builders. Render the returned object inside a
 * <script type="application/ld+json"> tag.
 */

const SITE_URL = "https://vulnscanners.com";

export interface BreadcrumbCrumb {
  name: string;
  url: string; // absolute or path; relative paths get prefixed with SITE_URL
}

export function breadcrumbJsonLd(crumbs: BreadcrumbCrumb[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: crumbs.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      item: c.url.startsWith("http") ? c.url : `${SITE_URL}${c.url}`,
    })),
  };
}

export interface ScannerServiceArgs {
  name: string;
  description: string;
  slug: string;
  serviceType: string;
}

export function scannerServiceJsonLd({
  name,
  description,
  slug,
  serviceType,
}: ScannerServiceArgs) {
  return {
    "@context": "https://schema.org",
    "@type": "Service",
    name,
    description,
    url: `${SITE_URL}/scanners/${slug}`,
    serviceType,
    provider: {
      "@type": "Organization",
      name: "VulnScanners",
      url: SITE_URL,
    },
    areaServed: "Worldwide",
    offers: {
      "@type": "Offer",
      price: "1.00",
      priceCurrency: "USD",
      description: "1 credit per scan; credits never expire",
      url: `${SITE_URL}/#pricing`,
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: "VulnScanners",
    url: SITE_URL,
    publisher: {
      "@type": "Organization",
      name: "VulnScanners",
    },
  };
}

/**
 * Convenience: render multiple JSON-LD objects into a single string for one
 * <script> tag, or call repeatedly for separate tags.
 */
export function jsonLdString(...objs: object[]) {
  return objs.map((o) => JSON.stringify(o)).join("\n");
}
