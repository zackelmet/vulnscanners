import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { validateWorkEmail } from "@/lib/email/workEmail";
import { sendSampleReportEmail } from "@/lib/email/resend";
import {
  getSampleReportPdf,
  SAMPLE_REPORT_FILENAME,
} from "@/lib/sample-report/asset";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const admin = initializeAdmin();

// Firestore doc IDs can't contain "/" and shouldn't be unbounded; key leads by
// a sanitized email so repeat requests upsert instead of piling up.
function leadDocId(email: string): string {
  return email.replace(/[^a-z0-9._-]/gi, "_").slice(0, 256);
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body." },
      { status: 400 },
    );
  }

  const email = (body as { email?: unknown })?.email;
  const result = validateWorkEmail(email);
  if (!result.ok) {
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }

  // Record the lead (best-effort — never block delivery on a write failure).
  try {
    const firestore = admin.firestore();
    await firestore
      .collection("sampleReportLeads")
      .doc(leadDocId(result.email))
      .set(
        {
          email: result.email,
          domain: result.domain,
          source: "landing-sample-report",
          ip: req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || null,
          userAgent: req.headers.get("user-agent") || null,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          requestCount: admin.firestore.FieldValue.increment(1),
        },
        { merge: true },
      );
  } catch (err) {
    console.error("Failed to record sample-report lead:", err);
  }

  // Deliver the sample report.
  try {
    const sent = await sendSampleReportEmail({
      to: result.email,
      pdf: getSampleReportPdf(),
      filename: SAMPLE_REPORT_FILENAME,
    });
    if ("skipped" in sent) {
      // Email is not configured — surface a soft error so the UI doesn't claim
      // success when nothing was sent.
      console.error("Sample report email skipped (RESEND_API_KEY unset).");
      return NextResponse.json(
        {
          error:
            "Email delivery is temporarily unavailable. Please try again later.",
        },
        { status: 503 },
      );
    }
    // Log the Resend message id so a submission can be traced to its row in the
    // Resend dashboard (delivered / bounced / spam) when delivery is questioned.
    console.log(
      `[sample-report] sent to ${result.email} — resend id: ${sent.id ?? "unknown"}`,
    );
  } catch (err) {
    console.error("Failed to send sample report email:", err);
    return NextResponse.json(
      { error: "We couldn't send the report. Please try again." },
      { status: 500 },
    );
  }

  return NextResponse.json({ ok: true });
}
