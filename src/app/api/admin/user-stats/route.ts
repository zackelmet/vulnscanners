import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { requireAdmin } from "@/lib/firebase/serverAuth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DAY_MS = 24 * 60 * 60 * 1000;
const SERIES_DAYS = 14;
const MAX_USERS = 5000; // safety cap on pagination

// GET /api/admin/user-stats — account counts sourced from Firebase Auth so we
// don't depend on a Firestore createdAt field. Admin-gated.
export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const adminApp = initializeAdmin();
    const created: number[] = []; // creation timestamps (ms)
    const accounts: { email: string; createdAt: number }[] = [];

    let pageToken: string | undefined;
    do {
      const res = await adminApp.auth().listUsers(1000, pageToken);
      for (const u of res.users) {
        const ts = u.metadata.creationTime
          ? new Date(u.metadata.creationTime).getTime()
          : 0;
        created.push(ts);
        accounts.push({ email: u.email || u.uid, createdAt: ts });
      }
      pageToken = res.pageToken;
    } while (pageToken && created.length < MAX_USERS);

    const now = Date.now();
    const since = (days: number) =>
      created.filter((t) => t >= now - days * DAY_MS).length;

    // Daily signup series for the last SERIES_DAYS (oldest → newest).
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const series: { date: string; count: number }[] = [];
    for (let i = SERIES_DAYS - 1; i >= 0; i--) {
      const dayStart = startOfToday.getTime() - i * DAY_MS;
      const dayEnd = dayStart + DAY_MS;
      series.push({
        date: new Date(dayStart).toISOString().slice(0, 10),
        count: created.filter((t) => t >= dayStart && t < dayEnd).length,
      });
    }

    const recent = accounts
      .sort((a, b) => b.createdAt - a.createdAt)
      .slice(0, 10)
      .map((a) => ({ email: a.email, createdAt: a.createdAt }));

    return NextResponse.json({
      total: created.length,
      new24h: since(1),
      new7d: since(7),
      new30d: since(30),
      series,
      recent,
    });
  } catch (error) {
    console.error("Error building user stats:", error);
    return NextResponse.json(
      { error: "Failed to load user stats" },
      { status: 500 },
    );
  }
}
