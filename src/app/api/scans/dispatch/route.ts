import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";

const VALID_SCAN_TYPES = ["nmap", "nuclei", "zap"] as const;

/**
 * POST /api/scans/dispatch
 *
 * Server-side helper that forwards a scan job to the Hetzner scanner worker
 * (GCP_SCANNER_URL). The request must be authenticated with a valid Firebase
 * ID token (Bearer). The worker is called with:
 *   POST ${GCP_SCANNER_URL}/scan
 *   X-Scanner-Token: ${GCP_WEBHOOK_SECRET}
 *
 * The same secret (GCP_WEBHOOK_SECRET) is used for dispatch auth
 * (X-Scanner-Token) and for webhook callback auth.
 */
export async function POST(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const auth = admin.auth();

    // ── Auth: require valid Firebase ID token ─────────────────────────────────
    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json(
        { error: "Unauthorized - No token provided" },
        { status: 401 },
      );
    }

    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json(
        { error: "Unauthorized - Invalid token" },
        { status: 401 },
      );
    }

    const callerUid = decodedToken.uid;

    // ── Parse and validate body ───────────────────────────────────────────────
    let body: Record<string, unknown>;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { scanId, scanType, target, options } = body as {
      scanId?: string;
      scanType?: string;
      target?: string;
      options?: Record<string, unknown>;
    };

    if (!scanId || typeof scanId !== "string") {
      return NextResponse.json(
        { error: "Missing required field: scanId" },
        { status: 400 },
      );
    }
    if (!scanType || !VALID_SCAN_TYPES.includes(scanType as any)) {
      return NextResponse.json(
        {
          error: `Missing or invalid scanType. Must be one of: ${VALID_SCAN_TYPES.join(", ")}`,
        },
        { status: 400 },
      );
    }
    if (!target || typeof target !== "string") {
      return NextResponse.json(
        { error: "Missing required field: target" },
        { status: 400 },
      );
    }

    // ── Verify caller owns this scan ──────────────────────────────────────────
    const firestore = admin.firestore();
    const scanDoc = await firestore.collection("scans").doc(scanId).get();
    if (!scanDoc.exists || scanDoc.data()?.userId !== callerUid) {
      return NextResponse.json(
        { error: "Scan not found or unauthorized" },
        { status: 403 },
      );
    }

    // ── Build worker URL ───────────────────────────────────────────────────────
    const workerBase = (process.env.GCP_SCANNER_URL || "")
      .trim()
      .replace(/\/$/, "");
    if (!workerBase) {
      console.error("GCP_SCANNER_URL is not configured");
      return NextResponse.json(
        { error: "Scanner service not configured" },
        { status: 503 },
      );
    }

    const scannerToken = process.env.GCP_WEBHOOK_SECRET || "";
    const endpoint = `${workerBase}/scan`;

    const workerPayload = {
      scanId,
      scanType,
      target,
      options: options ?? {},
    };

    console.log(`Dispatching scan job ${scanId} (${scanType})`);

    // ── Forward to worker ─────────────────────────────────────────────────────
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    let workerResp: Response;
    try {
      workerResp = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Scanner-Token": scannerToken,
        },
        body: JSON.stringify(workerPayload),
        signal: controller.signal,
      });
    } catch (err: any) {
      clearTimeout(timeoutId);
      const msg =
        err.name === "AbortError"
          ? "Scanner worker timed out"
          : "Failed to reach scanner worker";
      console.error(msg, err?.message);
      return NextResponse.json({ error: msg }, { status: 502 });
    }

    clearTimeout(timeoutId);

    if (!workerResp.ok) {
      const body = await workerResp.text().catch(() => "");
      console.error(
        `Scanner worker rejected job ${scanId}:`,
        workerResp.status,
        body,
      );
      return NextResponse.json(
        {
          error: "Scanner worker rejected the job",
          workerStatus: workerResp.status,
        },
        { status: 502 },
      );
    }

    const workerData = await workerResp.json().catch(() => ({}));
    console.log(`Scan job ${scanId} dispatched successfully`);

    return NextResponse.json(
      { success: true, scanId, workerResponse: workerData },
      { status: 202 },
    );
  } catch (error: any) {
    console.error("Error in dispatch route:", error?.message);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
