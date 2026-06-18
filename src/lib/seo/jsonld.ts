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
 * Render JSON-LD for a single <script type="application/ld+json"> tag.
 *
 * A JSON-LD script must contain exactly ONE JSON value. Emitting several
 * top-level objects concatenated (`{…}\n{…}`) is invalid JSON and fails
 * schema.org validation, so when given multiple nodes we wrap them in a JSON
 * array (which schema.org permits as a top-level graph of nodes).
 */
export function jsonLdString(...objs: object[]) {
  return JSON.stringify(objs.length === 1 ? objs[0] : objs);
}
