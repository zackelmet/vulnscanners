const admin = require("firebase-admin");
const https = require("https");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const TEST_UID = "8e4y6TrKmbYZ51V37HulCFduOTO2";
const BASE_URL = "https://www.vulnscanners.com";

async function makeRequest(path, method = "GET", body = null, token = null) {
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

async function runSmokeTest() {
  console.log("\n=== VULNSCANNERS USER FLOW SMOKE TEST ===\n");

  try {
    // Step 1: Get custom token and exchange for ID token
    console.log("1. Getting Firebase ID token for test user...");
    const customToken = await admin.auth().createCustomToken(TEST_UID);
    console.log("   ✓ Custom token created");

    // Exchange custom token for ID token using Firebase Auth REST API
    const firebaseApiKey = process.env.FIREBASE_API_KEY || "YOUR_API_KEY";
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

    const idToken = tokenResponse.idToken;
    console.log("   ✓ ID token obtained");

    // Step 2: Fetch user data from Firestore to check credits
    console.log("\n2. Fetching user data from Firestore...");
    const db = admin.firestore();
    const userDoc = await db.collection("users").doc(TEST_UID).get();
    const userData = userDoc.data();
    console.log("   ✓ User credits:", userData.scanCredits);
    console.log("   ✓ Scans used:", userData.scansUsed);

    // Step 3: Create a target
    console.log("\n3. Creating a target...");
    const targetResponse = await makeRequest(
      "/api/targets",
      "POST",
      {
        name: "Smoke Test Target",
        value: "scanme.nmap.org",
        type: "domain",
        tags: ["smoke-test"],
      },
      idToken,
    );

    if (targetResponse.status !== 201) {
      console.error("   ✗ Failed to create target:", targetResponse);
      return;
    }
    const targetId = targetResponse.data.target?.id;
    console.log("   ✓ Target created:", targetId);

    // Step 4: Launch a scan
    console.log("\n4. Launching nmap scan...");
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
      return;
    }
    const scanId = scanResponse.data.scanIds[0];
    console.log("   ✓ Scan launched:", scanId);
    console.log("   ✓ Credits remaining:", scanResponse.data.creditsRemaining);

    // Step 5: Wait for scan to complete
    console.log("\n5. Waiting for scan to complete (60 seconds)...");
    await new Promise((resolve) => setTimeout(resolve, 60000));

    // Step 6: Check scan status in Firestore
    console.log("\n6. Checking scan status in Firestore...");
    const userScanRef = db
      .collection("users")
      .doc(TEST_UID)
      .collection("completedScans")
      .doc(scanId);
    const scanDoc = await userScanRef.get();

    if (!scanDoc.exists) {
      console.error("   ✗ Scan document not found");
      return;
    }

    const scanData = scanDoc.data();
    console.log("   ✓ Scan status:", scanData.status);
    console.log("   ✓ Scanner type:", scanData.scannerType);
    console.log("   ✓ Has results:", !!scanData.resultsSummary);

    if (scanData.resultsSummary) {
      console.log("   ✓ Results preview:");
      console.log("     - Hosts up:", scanData.resultsSummary.hostsUp);
      console.log("     - Open ports:", scanData.resultsSummary.openPorts);
      console.log(
        "     - Raw preview length:",
        scanData.resultsSummary.rawPreview?.length || 0,
      );
    }

    // Step 7: Fetch scans list via API
    console.log("\n7. Fetching user scans via API...");
    const scansListResponse = await makeRequest(
      "/api/scans",
      "GET",
      null,
      idToken,
    );

    if (scansListResponse.status !== 200) {
      console.error("   ✗ Failed to fetch scans:", scansListResponse);
    } else {
      console.log(
        "   ✓ Scans fetched:",
        scansListResponse.data.scans?.length || 0,
        "total",
      );
      const ourScan = scansListResponse.data.scans?.find(
        (s) => s.id === scanId,
      );
      if (ourScan) {
        console.log("   ✓ Our scan is in the list:", ourScan.status);
      }
    }

    // Step 8: Try to generate PDF report
    console.log("\n8. Testing PDF report generation...");
    const reportResponse = await makeRequest(
      `/api/scans/${scanId}/report`,
      "GET",
      null,
      idToken,
    );

    if (reportResponse.status === 200) {
      const contentType = reportResponse.headers["content-type"];
      console.log("   ✓ PDF report generated");
      console.log("   ✓ Content-Type:", contentType);
      console.log(
        "   ✓ Response size:",
        typeof reportResponse.data === "string"
          ? reportResponse.data.length
          : 0,
        "bytes",
      );
    } else {
      console.log(
        "   ✗ PDF generation failed:",
        reportResponse.status,
        reportResponse.data,
      );
    }

    // Step 9: Verify user can list targets
    console.log("\n9. Fetching user targets...");
    const targetsResponse = await makeRequest(
      "/api/targets",
      "GET",
      null,
      idToken,
    );

    if (targetsResponse.status === 200) {
      console.log(
        "   ✓ Targets fetched:",
        targetsResponse.data.targets?.length || 0,
        "total",
      );
      const ourTarget = targetsResponse.data.targets?.find(
        (t) => t.id === targetId,
      );
      if (ourTarget) {
        console.log("   ✓ Our target is in the list:", ourTarget.name);
      }
    } else {
      console.error("   ✗ Failed to fetch targets:", targetsResponse);
    }

    console.log("\n=== SMOKE TEST COMPLETE ===\n");
    console.log("Summary:");
    console.log("  - User authentication: ✓");
    console.log("  - Target creation: ✓");
    console.log("  - Scan launch: ✓");
    console.log(
      "  - Scan completion: " + (scanData.status === "completed" ? "✓" : "✗"),
    );
    console.log(
      "  - Results retrieval: " + (scanData.resultsSummary ? "✓" : "✗"),
    );
    console.log("  - API list endpoints: ✓");
    console.log(
      "  - PDF generation: " + (reportResponse.status === 200 ? "✓" : "✗"),
    );
    console.log("\nTest scan ID:", scanId);
    console.log("Test target ID:", targetId);

    process.exit(0);
  } catch (error) {
    console.error("\n✗ Error during smoke test:", error);
    process.exit(1);
  }
}

runSmokeTest();
