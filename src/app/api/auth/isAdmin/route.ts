import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { requireAuth } from "@/lib/firebase/serverAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAuth(req);
  if (!auth.ok) return auth.response;

  // Admin status is the user's own — never derived from a client-supplied uid.
  const claimAdmin = (auth.token as any)?.admin === true;
  if (claimAdmin) return NextResponse.json({ isAdmin: true });

  try {
    const userDoc = await initializeAdmin()
      .firestore()
      .collection("users")
      .doc(auth.uid)
      .get();
    return NextResponse.json({ isAdmin: userDoc.data()?.isAdmin === true });
  } catch (error) {
    console.error("Error checking admin status:", error);
    return NextResponse.json({ isAdmin: false }, { status: 500 });
  }
}
