import { test, expect } from "@playwright/test";

test("GET /api/healthz returns ok", async ({ request }) => {
  const res = await request.get("/api/healthz");
  expect(res.status()).toBe(200);
  const body = await res.json();
  expect(body.ok).toBe(true);
  expect(typeof body.commit).toBe("string");
  expect(typeof body.timestamp).toBe("string");
});
