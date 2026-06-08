# Compliance framework logos

The landing-page "Compliance" section (above pricing) renders an optional logo
on each quote card. The cards look for these files and **gracefully hide the
logo if the file is missing** (so nothing breaks until you add them):

- `cis.png` — Center for Internet Security
- `pci.png` — PCI Security Standards Council / PCI DSS
- `nist.png` — NIST
- `sans.png` — SANS Institute

Guidance:

- The quote cards have a **light** background, so use colored or dark logos
  (transparent PNG). Height renders at ~26px.
- These are **trademarked** logos. Use official assets from each org's brand /
  press kit and confirm they're cleared for this use. Showing a body's logo
  (vs. quoting its public standard) can imply certification or endorsement —
  PCI SSC and SANS especially — so make sure that's defensible for us.
- Swap the path/extension in `COMPLIANCE_QUOTES` in `src/app/LandingPage.tsx`
  if you provide SVG/JPG instead of PNG.
