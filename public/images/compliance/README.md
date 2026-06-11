# Compliance framework logos

The landing-page "Compliance" section (above pricing) renders an optional logo
on each quote card. The cards look for these files and **gracefully hide the
logo if the file is missing** (plain `<img>` with an `onError` fallback):

- `cis.svg` — Center for Internet Security
- `pci.svg` — PCI Security Standards Council / PCI DSS
- `nist.svg` — NIST
- `sans.svg` — SANS Institute

These are now present. Provenance (sourced 2026-06-09 from each org's own site):

- `nist.svg` — NIST sidestack logo, `nist.gov` component library. NIST is a U.S.
  federal agency, so its logo is a public-domain government work.
- `pci.svg` — official "PCI Security Standards Council" teal logo, `pcisecuritystandards.org`.
- `cis.svg` — official "CIS — Center for Internet Security" RGB light-mode logo, `cisecurity.org`.
- `sans.svg` — SANS stylized wordmark, extracted from the `sans.org` icon sprite
  (`/icons.svg#logo`). Its `fill` was `currentColor`; pinned to `#101820` so it
  renders consistently in a bare `<img>` on the light card.

Guidance:

- The quote cards have a **light** background, so logos are colored/dark with
  transparent backgrounds. Height renders at ~26px (SVGs scale cleanly).
- These are **trademarked** logos (NIST excepted). Showing a body's logo (vs.
  quoting its public standard) can imply certification or endorsement — PCI SSC
  and SANS especially — so make sure that's defensible for us before launch.
- Swap the path/extension in `COMPLIANCE_QUOTES` in `src/app/LandingPage.tsx`
  if you replace any of these.
