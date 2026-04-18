export interface ScanJob {
  scanId: string;
  userId: string;
  type: "nmap" | "nuclei" | "zap";
  target: string;
  options?: any;
  callbackUrl: string;
}

/**
 * Dispatches a scan job to the Hetzner worker at GCP_SCANNER_URL (default:
 * https://api.vulnscanners.com).  The same secret (GCP_WEBHOOK_SECRET) is
 * used here as the X-Scanner-Token and by the Hetzner worker when it calls
 * back via the webhook.
 *
 * This function is intentionally fire-and-forget: the worker accepts the job
 * and POSTs results back asynchronously via POST /api/scans/webhook.
 */
export async function enqueueScanJob(job: ScanJob): Promise<void> {
  const baseUrl = (
    process.env.GCP_SCANNER_URL || "https://api.vulnscanners.com"
  )
    .trim()
    .replace(/\/$/, "");

  // GCP_WEBHOOK_SECRET is a server-only env var (no NEXT_PUBLIC_ prefix).
  // It is also used as X-Scanner-Token so the worker can authenticate
  // requests from this app, and as the webhook auth secret when the worker
  // calls back.
  const scannerToken = process.env.GCP_WEBHOOK_SECRET || "";
  if (!scannerToken) {
    throw new Error("GCP_WEBHOOK_SECRET is not configured.");
  }

  const endpoint = `${baseUrl}/scan`;

  const payload = {
    scanId: job.scanId,
    scanType: job.type,
    target: job.target,
    options: job.options || {},
    userId: job.userId,
  };

  console.log("Dispatching scan job:", {
    scanId: job.scanId,
    scanType: job.type,
    endpoint,
  });

  // Fire-and-forget with 30 s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30_000);

  fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Scanner-Token": scannerToken,
    },
    body: JSON.stringify(payload),
    signal: controller.signal,
  })
    .then(async (resp) => {
      clearTimeout(timeoutId);
      if (!resp.ok) {
        console.error("Scanner worker rejected job:", {
          scanId: job.scanId,
          httpStatus: resp.status,
        });
      } else {
        const data = await resp.json().catch(() => ({}));
        console.log("Scan job dispatched to worker:", {
          scanId: job.scanId,
          queuePosition: data.queue_position ?? "unknown",
        });
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.error("Dispatch timeout for scan job:", { scanId: job.scanId });
      } else {
        console.error("Error dispatching scan job:", {
          scanId: job.scanId,
          error: err?.message,
        });
      }
    });
}
