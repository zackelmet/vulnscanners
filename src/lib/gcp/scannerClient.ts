export interface ScanJob {
  scanId: string;
  userId: string;
  type: "nmap" | "nuclei" | "zap";
  target: string;
  options?: any;
  callbackUrl: string;
}

/**
 * Enqueues a scan job by POSTing to the unified scanner VM.
 * Prefers HETZNER_* env vars and falls back to legacy GCP_* names.
 */
export async function enqueueScanJob(job: ScanJob): Promise<void> {
  const baseUrl = (
    process.env.HETZNER_SCANNER_URL ||
    process.env.GCP_SCANNER_URL ||
    ""
  )
    .trim()
    .replace(/\/$/, "");

  if (!baseUrl) {
    throw new Error(
      "HETZNER_SCANNER_URL (or legacy GCP_SCANNER_URL) is not configured.",
    );
  }

  const scannerToken =
    process.env.HETZNER_SCANNER_AUTH_TOKEN ||
    process.env.GCP_SCANNER_AUTH_TOKEN ||
    process.env.GCP_WEBHOOK_SECRET ||
    "";
  const endpoint = `${baseUrl}/scan`;

  const payload = {
    scanId: job.scanId,
    scanner: job.type,
    target: job.target,
    options: job.options || {},
    userId: job.userId,
  };

  console.log(`Dispatching scan job ${job.scanId} (${job.type}) → ${endpoint}`);

  // Fire-and-forget with 30s timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

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
        const body = await resp.text().catch(() => "");
        console.error(
          `Scanner VM rejected job ${job.scanId}:`,
          resp.status,
          body,
        );
      } else {
        const data = await resp.json().catch(() => ({}));
        console.log(
          `✅ Queued scan job ${job.scanId} on VM (position: ${data.queue_position ?? "?"})`,
        );
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name === "AbortError") {
        console.error(
          `Timeout dispatching scan job ${job.scanId} to VM after 30s`,
        );
      } else {
        console.error(`Error dispatching scan job ${job.scanId}:`, err);
      }
    });
}
