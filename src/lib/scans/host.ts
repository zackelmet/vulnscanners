// Normalize a scan target to a bare host so the same host stored differently by
// each scanner (ZAP keeps the https:// prefix, Nmap/Nuclei strip it) collapses
// to one: lowercase, drop the scheme, a leading "www.", and any trailing slash.
// Port and path are kept distinct.
export function normalizeHost(raw: string): string {
  let h = (raw || "").trim().toLowerCase();
  h = h.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // scheme://
  h = h.replace(/^www\./, "");
  h = h.replace(/\/+$/, ""); // trailing slash(es)
  return h || "Unknown target";
}
