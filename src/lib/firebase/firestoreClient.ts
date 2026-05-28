import { getFirestore } from "firebase/firestore";
import firebase_app, { hasClientFirebaseConfig } from "./firebaseClient";

// Firestore is split into its own module so the (large) `firebase/firestore`
// SDK is only bundled/loaded on routes that actually query the database
// (dashboard, scans, checkout) — not on the marketing landing page.
//
// `firebase_app` is initialized in `firebaseClient.ts` during module
// evaluation (browser only), so by the time anything imports `db` from here
// the app already exists.
let _db: ReturnType<typeof getFirestore> | undefined;

if (typeof window !== "undefined" && hasClientFirebaseConfig && firebase_app) {
  _db = getFirestore(firebase_app);
}

export const db = _db as ReturnType<typeof getFirestore>;
