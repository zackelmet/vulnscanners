#!/usr/bin/env node
/**
 * Submit every URL in the live sitemap to IndexNow.
 *
 * Usage:
 *   node scripts/indexnow-submit.mjs
 *   # or
 *   npm run indexnow
 *
 * Reads URLs from https://vulnscanners.com/sitemap.xml so the script can be
 * run any time after a deploy without coupling to local build state.
 */

const SITEMAP_URL = "https://vulnscanners.com/sitemap.xml";
const INDEXNOW_KEY = "9c5e2b8a4f3d1e6c7b9a8d2f4e5c1b3a";
const HOST = "vulnscanners.com";
const KEY_LOCATION = `https://${HOST}/${INDEXNOW_KEY}.txt`;

async function main() {
  console.log(`Fetching sitemap: ${SITEMAP_URL}`);
  const res = await fetch(SITEMAP_URL);
  if (!res.ok) {
    throw new Error(`Sitemap fetch failed: HTTP ${res.status}`);
  }
  const xml = await res.text();

  const urls = [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
  if (urls.length === 0) {
    throw new Error("No <loc> entries found in sitemap.");
  }

  console.log(`Submitting ${urls.length} URLs to IndexNow…`);
  const submit = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      host: HOST,
      key: INDEXNOW_KEY,
      keyLocation: KEY_LOCATION,
      urlList: urls,
    }),
  });

  const body = await submit.text();
  if (submit.ok) {
    console.log(`✓ Submitted (HTTP ${submit.status}).`);
  } else {
    console.error(`✗ Submission failed: HTTP ${submit.status}`);
    console.error(body);
    process.exit(1);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
