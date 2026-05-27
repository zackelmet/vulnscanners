export const LANDING_FAQ = [
  {
    q: "Do I need to install anything?",
    a: "No. Every scan runs on our hosted infrastructure. You provide a target; we handle the engine, templates, updating, and reporting.",
  },
  {
    q: "Whose targets can I scan?",
    a: "Only assets you own or have written authorization to test. We require target ownership verification before your first scan against any host.",
  },
  {
    q: "What happens to my scan data?",
    a: "Results are stored encrypted and are only accessible to your team. You can export to PDF or delete any scan at any time — including raw output.",
  },
  {
    q: "Do credits expire?",
    a: "Credits are valid for 12 months from purchase. If your team doesn't use a pack, reach out — we'll sort something out.",
  },
  {
    q: "Is there a refund policy?",
    a: "Yes — a 7-day no-questions-asked refund on your first purchase. After that we handle issues case-by-case.",
  },
  {
    q: "Can I integrate with CI or webhooks?",
    a: "Webhooks are live; a REST API is available for scan dispatch and result retrieval. Full CI examples in the docs.",
  },
] as const;
