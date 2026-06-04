// POST /api/reports/combined/email
// Body: { scanIds: string[] }
// Builds the combined PDF and emails it to the requesting user as an
// attachment. Nothing is persisted.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { buildCombinedPdfForUser } from "@/lib/report-engine/render-from-doc";
import { sendCombinedReportEmail } from "@/lib/email/resend";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_SCANS = 25;

export async function POST(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const firestore = admin.firestore();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let decoded;
    try {
      decoded = await admin.auth().verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }
    const userId = decoded.uid;
    const toEmail = decoded.email;

    if (!toEmail) {
      return NextResponse.json(
        { error: "No email address on your account to send to." },
        { status: 400 },
      );
    }

    const body = await request.json().catch(() => ({}));
    const scanIds: string[] = Array.isArray(body?.scanIds) ? body.scanIds : [];
    if (scanIds.length === 0) {
      return NextResponse.json(
        { error: "Select at least one scan to include." },
        { status: 400 },
      );
    }
    if (scanIds.length > MAX_SCANS) {
      return NextResponse.json(
        { error: `A combined report can include at most ${MAX_SCANS} scans.` },
        { status: 400 },
      );
    }

    let result;
    try {
      result = await buildCombinedPdfForUser(admin, firestore, userId, scanIds);
    } catch (err: any) {
      return NextResponse.json(
        { error: err?.message || "No scans available" },
        { status: 404 },
      );
    }

    const sent = await sendCombinedReportEmail({
      to: toEmail,
      scanCount: result.included,
      pdf: result.pdf,
      filename: `vulnscanners-combined-report-${result.included}-scans.pdf`,
    });

    if ("skipped" in sent) {
      return NextResponse.json(
        {
          error:
            "Email isn't configured yet (missing RESEND_API_KEY). The report was generated but not sent.",
        },
        { status: 503 },
      );
    }

    return NextResponse.json({
      success: true,
      sentTo: toEmail,
      included: result.included,
      skipped: result.skipped.length,
    });
  } catch (err: any) {
    console.error("Combined report email failed:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
