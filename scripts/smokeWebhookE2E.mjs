import fs from "fs";
import path from "path";
import crypto from "crypto";
import Stripe from "stripe";
import admin from "firebase-admin";

function loadEnv() {
  const files = [
    ".env.vercel.production.local",
    ".env.production",
    ".env.local",
    ".env.production.example",
    ".env",
  ];
  for (const file of files) {
    const fullPath = path.join(process.cwd(), file);
    if (!fs.existsSync(fullPath)) continue;
    const text = fs.readFileSync(fullPath, "utf8");
    if (!text.includes("STRIPE_SECRET_KEY=")) continue;

    for (const rawLine of text.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith("#") || !line.includes("=")) continue;
      const idx = line.indexOf("=");
      const key = line.slice(0, idx).trim();
      let value = line.slice(idx + 1).trim();
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      if (!process.env[key]) process.env[key] = value;
    }
    return file;
  }
  return null;
}

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required env: ${name}`);
  }
  return value;
}

async function main() {
  const envSource = loadEnv();
  if (!envSource) throw new Error("No env file with Stripe keys found");

  const stripeSecretKey = requireEnv("STRIPE_SECRET_KEY");
  const stripeWebhookSecret = requireEnv("STRIPE_WEBHOOK_SECRET");
  const firebaseProjectId = requireEnv("FIREBASE_ADMIN_PROJECT_ID");
  const firebaseClientEmail = requireEnv("FIREBASE_ADMIN_CLIENT_EMAIL");
  const firebasePrivateKey = requireEnv("FIREBASE_ADMIN_PRIVATE_KEY").replace(/\\n/g, "\n");
  const priceEssential = requireEnv("NEXT_PUBLIC_STRIPE_PRICE_ESSENTIAL");

  if (!admin.apps.length) {
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: firebaseProjectId,
        clientEmail: firebaseClientEmail,
        privateKey: firebasePrivateKey,
      }),
    });
  }

  const db = admin.firestore();
  const stripe = new Stripe(stripeSecretKey);

  const testUid = `smoke_${Date.now()}`;
  const userRef = db.collection("users").doc(testUid);

  await userRef.set(
    {
      email: `${testUid}@example.com`,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      scanCredits: { nmap: 0, nuclei: 0, zap: 0 },
      scansUsed: { nmap: 0, nuclei: 0, zap: 0 },
      role: "user",
      status: "active",
    },
    { merge: true },
  );

  const beforeDoc = await userRef.get();
  const before = beforeDoc.data()?.scanCredits ?? { nmap: 0, nuclei: 0, zap: 0 };

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [{ price: priceEssential, quantity: 1 }],
    success_url: "https://vulnscanners.vercel.app/success?session_id={CHECKOUT_SESSION_ID}",
    cancel_url: "https://vulnscanners.vercel.app/cancel",
    metadata: {
      firebase_uid: testUid,
      scan_type: "credit_pack",
      quantity: "1",
    },
  });

  const event = {
    id: `evt_smoke_${Date.now()}`,
    object: "event",
    api_version: "2023-10-16",
    created: Math.floor(Date.now() / 1000),
    livemode: true,
    pending_webhooks: 1,
    request: { id: null, idempotency_key: null },
    type: "checkout.session.completed",
    data: {
      object: {
        id: session.id,
        object: "checkout.session",
        mode: "payment",
        customer: session.customer,
        metadata: {
          firebase_uid: testUid,
        },
      },
    },
  };

  const payload = JSON.stringify(event);
  const timestamp = Math.floor(Date.now() / 1000);
  const signedPayload = `${timestamp}.${payload}`;
  const signature = crypto
    .createHmac("sha256", stripeWebhookSecret)
    .update(signedPayload, "utf8")
    .digest("hex");

  const response = await fetch("https://vulnscanners.vercel.app/api/stripe/webhook", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "stripe-signature": `t=${timestamp},v1=${signature}`,
    },
    body: payload,
  });

  const responseText = await response.text();
  if (!response.ok) {
    throw new Error(`Webhook POST failed: ${response.status} ${responseText}`);
  }

  await new Promise((resolve) => setTimeout(resolve, 3000));

  const afterDoc = await userRef.get();
  const after = afterDoc.data()?.scanCredits ?? { nmap: 0, nuclei: 0, zap: 0 };

  const delta = {
    nmap: (after.nmap ?? 0) - (before.nmap ?? 0),
    nuclei: (after.nuclei ?? 0) - (before.nuclei ?? 0),
    zap: (after.zap ?? 0) - (before.zap ?? 0),
  };

  console.log(`ENV_SOURCE: ${envSource}`);
  console.log(`TEST_UID: ${testUid}`);
  console.log(`CHECKOUT_SESSION_ID: ${session.id}`);
  console.log(`WEBHOOK_HTTP_STATUS: ${response.status}`);
  console.log(`WEBHOOK_RESPONSE: ${responseText.slice(0, 200)}`);
  console.log(`BEFORE_CREDITS: ${JSON.stringify(before)}`);
  console.log(`AFTER_CREDITS: ${JSON.stringify(after)}`);
  console.log(`DELTA_CREDITS: ${JSON.stringify(delta)}`);

  if (delta.nmap <= 0 && delta.nuclei <= 0 && delta.zap <= 0) {
    throw new Error("No credit increment observed after webhook");
  }

  console.log("SMOKE_RESULT: PASS");
}

main().catch((error) => {
  console.error("SMOKE_RESULT: FAIL");
  console.error(error?.message || error);
  process.exit(1);
});
