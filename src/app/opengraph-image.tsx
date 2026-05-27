import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "VulnScanners — Hosted Nmap, Nuclei & OWASP ZAP";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        background:
          "linear-gradient(135deg, #0a141f 0%, #0d1b2e 60%, #06283d 100%)",
        color: "#ffffff",
        fontFamily: "sans-serif",
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        <div
          style={{
            width: 12,
            height: 12,
            borderRadius: 999,
            background: "#06b6d4",
            boxShadow: "0 0 24px #06b6d4",
          }}
        />
        <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: 1 }}>
          VULNSCANNERS
        </div>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
        <div
          style={{
            fontSize: 88,
            fontWeight: 700,
            lineHeight: 1.05,
            letterSpacing: -1.5,
          }}
        >
          Hosted scans.
          <br />
          <span style={{ color: "#06b6d4" }}>Deliverable reports.</span>
        </div>
        <div style={{ fontSize: 36, color: "#a3b1c2", fontWeight: 400 }}>
          Nmap · Nuclei · OWASP ZAP — one console, zero install
        </div>
      </div>

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 22,
          color: "#67e8f9",
          borderTop: "1px solid rgba(103, 232, 249, 0.2)",
          paddingTop: 24,
        }}
      >
        <div>vulnscanners.com</div>
        <div>Credits never expire</div>
      </div>
    </div>,
    { ...size },
  );
}
