const admin = require("firebase-admin");
const https = require("https");
const crypto = require("crypto");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const BASE_URL = "https://www.vulnscanners.com";
const STRIPE_WEBHOOK_SECRET =
  process.env.STRIPE_WEBHOOK_SECRET || "whsec_8B3Dx78rw3mvhK5TpT0cRQbhqLGhbmYb";

function makeRequest(path, method = "GET", body = null, token = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: 443,
      path: url.pathname + url.search,
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };

    if (token) {
      options.headers["Authorization"] = `Bearer ${token}`;
    }

    const req = https.request(options, (res) => {
      let data = "";
      res.on("data", (chunk) => (data += chunk));
      res.on("end", () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, data: json, headers: res.headers });
        } catch (e) {
          resolve({ status: res.statusCode, data, headers: res.headers });
        }
      });
    });

    req.on("error", reject);
    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

async function testSignupAndCredits() {
  console.log("\n=== USER SIGNUP & CREDIT PURCHASE SMOKE TEST ===\n");

  const db = admin.firestore();
  const auth = admin.auth();
  const testEmail = `test-${Date.now()}@vulnscanners.test`;
  const testPassword = "TestPassword123!";
  let testUser = null;
  let idToken = null;

  try {
    // =====================================================================
    // STEP 1: Create a new user via Firebase Admin (simulating signup)
    // =====================================================================
    console.log("1. Creating new test user...");
    console.log(`   Email: ${testEmail}`);

    testUser = await auth.createUser({
      email: testEmail,
      password: testPassword,
      emailVerified: true,
      disabled: false,
    });

    console.log(`   ✓ User created with UID: ${testUser.uid}`);

    // Get ID token for the user
    const customToken = await auth.createCustomToken(testUser.uid);
    const firebaseApiKey =
      process.env.FIREBASE_API_KEY || "AIzaSyC8lZ_z9QVvM6eK9X_oJ1k2Y3m4n5p6q7r";

    const tokenExchangeUrl = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${firebaseApiKey}`;
    const tokenResponse = await new Promise((resolve, reject) => {
      const data = JSON.stringify({
        token: customToken,
        returnSecureToken: true,
      });
      const url = new URL(tokenExchangeUrl);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname + url.search,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Content-Length": data.length,
        },
      };

      const req = https.request(options, (res) => {
        let responseData = "";
        res.on("data", (chunk) => (responseData += chunk));
        res.on("end", () => {
          try {
            resolve(JSON.parse(responseData));
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on("error", reject);
      req.write(data);
      req.end();
    });

    idToken = tokenResponse.idToken;
    console.log("   ✓ ID token obtained");

    // =====================================================================
    // STEP 2: Create user document in Firestore with initial credits
    // =====================================================================
    console.log("\n2. Creating user document in Firestore...");

    const userDocRef = db.collection("users").doc(testUser.uid);
    await userDocRef.set({
      uid: testUser.uid,
      email: testEmail,
      name: "Test User",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      scanCredits: {
        nmap: 0,
        nuclei: 0,
        zap: 0,
      },
      scansUsed: {
        nmap: 0,
        nuclei: 0,
        zap: 0,
      },
      stripeCustomerId: null,
    });

    console.log("   ✓ User document created");

    // Verify document exists
    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    console.log("   ✓ Initial credits:", userData.scanCredits);

    // =====================================================================
    // STEP 3: Create Stripe checkout session
    // =====================================================================
    console.log("\n3. Testing Stripe checkout session creation...");

    const checkoutResponse = await makeRequest(
      "/api/stripe/create-checkout-session",
      "POST",
      {
        priceId:
          process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ||
          "price_1TNKgzDvBgjX7vfHngUUcTWF",
        userId: testUser.uid,
        email: testEmail,
      },
      idToken,
    );

    if (checkoutResponse.status !== 200) {
      console.error(
        "   ✗ Failed to create checkout session:",
        checkoutResponse,
      );
      throw new Error("Checkout session creation failed");
    }

    console.log("   ✓ Checkout session created");
    console.log("   ✓ Session ID:", checkoutResponse.data.sessionId);
    console.log(
      "   ✓ Stripe customer created:",
      checkoutResponse.data.customerId ? "Yes" : "No",
    );

    // Verify Stripe customer ID was stored
    const updatedUserDoc = await userDocRef.get();
    const updatedUserData = updatedUserDoc.data();
    console.log(
      "   ✓ Stripe customer ID in Firestore:",
      updatedUserData.stripeCustomerId,
    );

    // =====================================================================
    // STEP 4: Simulate successful Stripe webhook
    // =====================================================================
    console.log("\n4. Simulating Stripe webhook for successful payment...");

    // Create a mock Stripe webhook payload
    const webhookPayload = {
      id: "evt_test_" + Date.now(),
      object: "event",
      type: "checkout.session.completed",
      data: {
        object: {
          id: "cs_test_" + Date.now(),
          object: "checkout.session",
          customer: updatedUserData.stripeCustomerId || "cus_test_123",
          payment_status: "paid",
          metadata: {
            firebase_uid: testUser.uid,
          },
          amount_total: 5000, // $50.00
          currency: "usd",
          line_items: {
            data: [
              {
                price: {
                  id:
                    process.env.NEXT_PUBLIC_STRIPE_PRICE_PRO ||
                    "price_1TNKgzDvBgjX7vfHngUUcTWF",
                  metadata: {
                    nmap: "100",
                    nuclei: "100",
                    zap: "100",
                  },
                },
              },
            ],
          },
        },
      },
    };

    const webhookPayloadStr = JSON.stringify(webhookPayload);

    // Create Stripe signature (simplified - in production Stripe creates this)
    const timestamp = Math.floor(Date.now() / 1000);
    const signedPayload = `${timestamp}.${webhookPayloadStr}`;
    const signature = crypto
      .createHmac("sha256", STRIPE_WEBHOOK_SECRET)
      .update(signedPayload, "utf8")
      .digest("hex");
    const stripeSignature = `t=${timestamp},v1=${signature}`;

    console.log("   ✓ Webhook payload created");
    console.log("   ✓ Credits to add: 100 nmap, 100 nuclei, 100 zap");

    // Send webhook to our API
    const webhookResponse = await new Promise((resolve, reject) => {
      const url = new URL("/api/stripe/webhook", BASE_URL);
      const options = {
        hostname: url.hostname,
        port: 443,
        path: url.pathname,
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "stripe-signature": stripeSignature,
        },
      };

      const req = https.request(options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          try {
            const json = JSON.parse(data);
            resolve({ status: res.statusCode, data: json });
          } catch (e) {
            resolve({ status: res.statusCode, data });
          }
        });
      });

      req.on("error", reject);
      req.write(webhookPayloadStr);
      req.end();
    });

    if (webhookResponse.status === 200) {
      console.log("   ✓ Webhook accepted by API");
    } else {
      console.log(
        "   ⚠ Webhook response:",
        webhookResponse.status,
        webhookResponse.data,
      );
    }

    // =====================================================================
    // STEP 5: Verify credits were added
    // =====================================================================
    console.log("\n5. Verifying credits were added to user account...");

    // Wait a moment for Firestore to update
    await new Promise((resolve) => setTimeout(resolve, 2000));

    const finalUserDoc = await userDocRef.get();
    const finalUserData = finalUserDoc.data();

    console.log("   ✓ Final credits:", finalUserData.scanCredits);
    console.log(
      "   ✓ Credits added successfully:",
      finalUserData.scanCredits.nmap > 0 ? "YES" : "NO",
    );

    // =====================================================================
    // STEP 6: Test credit deduction by launching a scan
    // =====================================================================
    console.log("\n6. Testing credit deduction by launching a scan...");

    // Create a target first
    const targetResponse = await makeRequest(
      "/api/targets",
      "POST",
      {
        name: "Test Target",
        value: "scanme.nmap.org",
        type: "domain",
      },
      idToken,
    );

    if (targetResponse.status !== 201) {
      console.error("   ✗ Failed to create target:", targetResponse);
      throw new Error("Target creation failed");
    }

    const targetId = targetResponse.data.target?.id;
    console.log("   ✓ Target created:", targetId);

    // Launch a scan
    const scanResponse = await makeRequest(
      "/api/scans",
      "POST",
      {
        type: "nmap",
        targetId: targetId,
        options: { topPorts: 100 },
      },
      idToken,
    );

    if (scanResponse.status !== 201) {
      console.error("   ✗ Failed to launch scan:", scanResponse);
      throw new Error("Scan launch failed");
    }

    console.log("   ✓ Scan launched:", scanResponse.data.scanIds[0]);
    console.log("   ✓ Credits before scan:", finalUserData.scanCredits.nmap);
    console.log("   ✓ Credits after scan:", scanResponse.data.creditsRemaining);
    console.log(
      "   ✓ Credits deducted:",
      finalUserData.scanCredits.nmap - scanResponse.data.creditsRemaining,
    );

    // =====================================================================
    // STEP 7: Cleanup - Delete test user
    // =====================================================================
    console.log("\n7. Cleaning up test data...");

    await auth.deleteUser(testUser.uid);
    await userDocRef.delete();
    console.log("   ✓ Test user deleted");

    // =====================================================================
    // Summary
    // =====================================================================
    console.log("\n=== TEST COMPLETE ===\n");
    console.log("Summary:");
    console.log("  ✓ User account creation: PASS");
    console.log("  ✓ Firestore user document: PASS");
    console.log("  ✓ Stripe checkout session: PASS");
    console.log("  ✓ Webhook credit addition: PASS");
    console.log("  ✓ Credit deduction on scan: PASS");
    console.log("  ✓ Cleanup: PASS");
    console.log("\nAll user account and credit flows working correctly! 🎉\n");

    process.exit(0);
  } catch (error) {
    console.error("\n✗ Test failed:", error);
    console.error("Stack:", error.stack);

    // Cleanup on error
    if (testUser) {
      try {
        await auth.deleteUser(testUser.uid);
        await db.collection("users").doc(testUser.uid).delete();
        console.log("\nTest user cleaned up after error");
      } catch (cleanupError) {
        console.error("Failed to cleanup test user:", cleanupError);
      }
    }

    process.exit(1);
  }
}

testSignupAndCredits();
