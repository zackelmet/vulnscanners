/**
 * IndexNow client — pings Bing / Yandex (and any other IndexNow-compatible
 * search engine) to recrawl a set of URLs. The protocol requires a per-host
 * key whose value is hosted at /<key>.txt for ownership verification.
 *
 * Spec: https://www.indexnow.org/documentation
 */

export const INDEXNOW_KEY = "9c5e2b8a4f3d1e6c7b9a8d2f4e5c1b3a";
export const INDEXNOW_HOST = "vulnscanners.com";
export const INDEXNOW_KEY_LOCATION = `https://${INDEXNOW_HOST}/${INDEXNOW_KEY}.txt`;

export interface IndexNowResult {
  ok: boolean;
  status: number;
  body?: string;
  urlCount: number;
}

/**
 * Submit up to 10,000 URLs in one call. Every URL must be on INDEXNOW_HOST.
 * Returns the HTTP status — IndexNow treats 200/202 as success.
 */
export async function submitToIndexNow(
  urls: string[],
): Promise<IndexNowResult> {
  if (urls.length === 0) {
    return { ok: true, status: 204, urlCount: 0 };
  }

  const res = await fetch("https://api.indexnow.org/indexnow", {
    method: "POST",
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      Accept: "application/json",
    },
    body: JSON.stringify({
      host: INDEXNOW_HOST,
      key: INDEXNOW_KEY,
      keyLocation: INDEXNOW_KEY_LOCATION,
      urlList: urls,
    }),
  });

  const body = await res.text();
  return { ok: res.ok, status: res.status, body, urlCount: urls.length };
}
