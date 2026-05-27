import { NextRequest, NextResponse } from "next/server";
import type { DecodedIdToken } from "firebase-admin/auth";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";

export type AuthOk = { ok: true; uid: string; token: DecodedIdToken };
export type AuthFail = { ok: false; response: NextResponse };
export type AuthResult = AuthOk | AuthFail;

/**
 * Verify the request's Authorization: Bearer <id_token> header.
 * On success returns the decoded token and uid. On failure returns a
 * NextResponse that the caller should return directly.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  const idToken = authHeader.slice("Bearer ".length).trim();
  if (!idToken) {
    return {
      ok: false,
      response: NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
    };
  }
  try {
    const decoded = await initializeAdmin().auth().verifyIdToken(idToken);
    return { ok: true, uid: decoded.uid, token: decoded };
  } catch {
    return {
      ok: false,
      response: NextResponse.json({ error: "Invalid token" }, { status: 401 }),
    };
  }
}

/**
 * Like requireAuth, but also requires the authenticated user to be an admin.
 * Admin is sourced from a custom claim `admin: true` on the verified token,
 * or as a fallback the `isAdmin: true` field on users/{uid}.
 */
export async function requireAdmin(
  request: NextRequest,
): Promise<AuthResult> {
  const auth = await requireAuth(request);
  if (!auth.ok) return auth;

  const claimAdmin = (auth.token as any)?.admin === true;
  if (claimAdmin) return auth;

  try {
    const snap = await initializeAdmin()
      .firestore()
      .collection("users")
      .doc(auth.uid)
      .get();
    if (snap.exists && snap.data()?.isAdmin === true) return auth;
  } catch (err) {
    console.error("requireAdmin firestore lookup failed:", err);
  }

  return {
    ok: false,
    response: NextResponse.json({ error: "Forbidden" }, { status: 403 }),
  };
}
