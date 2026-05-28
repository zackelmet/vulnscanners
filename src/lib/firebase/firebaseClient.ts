import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";

/**
 * Firebase configuration object.
 * These values are loaded from environment variables.
 */
const _trim = (v?: string) => (typeof v === "string" ? v.trim() : v);

const clientCredentials = {
  apiKey: _trim(process.env.NEXT_PUBLIC_FIREBASE_API_KEY),
  authDomain: _trim(process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN),
  projectId: _trim(process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID),
  storageBucket: _trim(process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET),
  messagingSenderId: _trim(
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  ),
  appId: _trim(process.env.NEXT_PUBLIC_FIREBASE_APP_ID),
  measurementId: _trim(process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID),
};

export const hasClientFirebaseConfig = Boolean(
  clientCredentials.apiKey &&
  clientCredentials.authDomain &&
  clientCredentials.projectId &&
  clientCredentials.appId,
);

let firebase_app: FirebaseApp | null = null;
let _auth: ReturnType<typeof getAuth> | undefined;

// Only initialize the Firebase *client* SDK in the browser.
// During Next.js server-side builds / prerendering, `window` is undefined
// and environment variables for the client SDK (apiKey) may not be available.
// Initializing the client SDK on the server can cause runtime errors like
// "auth/invalid-api-key" during the build. Guard initialization to the
// browser environment to avoid build-time failures.
//
// NOTE: This module deliberately initializes only the Firebase *app* and
// *auth*. Firestore lives in `firestoreClient.ts` so that the (large)
// `firebase/firestore` SDK is code-split out of routes that only need auth —
// most importantly the marketing landing page, which pulls this module in via
// the auth context but never touches the database.
if (typeof window !== "undefined") {
  if (hasClientFirebaseConfig) {
    if (!getApps().length) {
      firebase_app = initializeApp(clientCredentials);
    } else {
      firebase_app = getApps()[0];
    }

    _auth = getAuth(firebase_app);
  } else {
    console.warn(
      "Firebase client SDK not initialized: missing NEXT_PUBLIC_FIREBASE_* environment variables.",
    );
  }
}

// Exports: on the server these will be `undefined` which prevents the client
// SDK from running during build/prerender. Consumers must only use these
// exports from browser code (client components / effects).
export default firebase_app as unknown as FirebaseApp;
export const auth = _auth as ReturnType<typeof getAuth>;
