export const LANDING_FAQ = [
  {
    q: "Do I need to install anything?",
    a: "No. Every scan runs on our hosted infrastructure. You provide a target; we handle the engine, templates, updating, and reporting.",
  },
  {
    q: "Whose targets can I scan?",
    a: "Only assets you own or have written authorization to test. Running scans against assets you don't have permission to test violates our terms and likely your local law.",
  },
  {
    q: "What happens to my scan data?",
    a: "Results are stored encrypted and are only accessible to your team. You can export to PDF or delete any scan at any time — including raw output.",
  },
  {
    q: "What does 1 scan credit get me?",
    a: "One Nmap scan, one Nuclei scan, and one OWASP ZAP scan against an approved target — three scans per credit, across all three engines. Each scan produces its own PDF report.",
  },
  {
    q: "Do credits expire?",
    a: "Never. Credits stay on your account until you use them.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes — a 7-day no-questions-asked refund on your first purchase. After that we handle issues case-by-case.",
  },
  {
    q: "How long does a scan take?",
    a: "Most Nmap scans finish in 1–10 minutes. Nuclei sweeps against a single target typically take 5–15 minutes. OWASP ZAP varies the most — a passive scan and spider can wrap in ~10 minutes; a full active scan against a large app can take a couple of hours. Scans run in the background, so you don't have to keep the console open.",
  },
] as const;
