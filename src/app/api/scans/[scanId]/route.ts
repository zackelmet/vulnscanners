// DELETE /api/scans/[scanId]
// Permanently deletes a scan owned by the signed-in user, including its raw
// output (stored inline on the doc) and any report links. Used by the History
// page's delete action.

import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";

export const runtime = "nodejs";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { scanId: string } },
) {
  try {
    const admin = initializeAdmin();
    const auth = admin.auth();
    const firestore = admin.firestore();

    const authHeader = request.headers.get("authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    let decoded;
    try {
      decoded = await auth.verifyIdToken(authHeader.split("Bearer ")[1]);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decoded.uid;
    const { scanId } = params;
    if (!scanId) {
      return NextResponse.json({ error: "Scan ID required" }, { status: 400 });
    }

    // Scans live under the owner — scoping the ref to the user means a caller
    // can only ever delete their own scans.
    const scanRef = firestore
      .collection("users")
      .doc(userId)
      .collection("completedScans")
      .doc(scanId);
    const scanDoc = await scanRef.get();
    if (!scanDoc.exists) {
      return NextResponse.json({ error: "Scan not found" }, { status: 404 });
    }

    // Best-effort: remove any uploaded artifacts from Storage (no-op on the
    // Spark plan where raw output lives inline on the doc, which the delete
    // below removes). Never block the delete on this.
    const scan = scanDoc.data() as any;
    const gsUrls = [
      scan?.gcpStorageUrl,
      scan?.gcpXmlStorageUrl,
      scan?.gcpJsonStorageUrl,
      scan?.gcpReportStorageUrl,
    ].filter((u): u is string => typeof u === "string" && u.startsWith("gs://"));
    await Promise.all(
      gsUrls.map(async (gsUrl) => {
        const m = gsUrl.match(/^gs:\/\/([^/]+)\/(.+)$/);
        if (!m) return;
        try {
          await admin.storage().bucket(m[1]).file(m[2]).delete();
        } catch {
          /* artifact already gone / no bucket — ignore */
        }
      }),
    );

    await scanRef.delete();

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error("Error deleting scan:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 },
    );
  }
}
