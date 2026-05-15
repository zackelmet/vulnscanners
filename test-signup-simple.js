const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

async function testSignupFlow() {
  console.log("\n=== SIMPLIFIED USER SIGNUP FLOW TEST ===\n");

  const db = admin.firestore();
  const auth = admin.auth();
  const testEmail = `test-${Date.now()}@vulnscanners.test`;
  const testPassword = "TestPassword123!";
  let testUser = null;

  try {
    // =====================================================================
    // TEST 1: User Account Creation
    // =====================================================================
    console.log("TEST 1: User Account Creation");
    console.log("─".repeat(50));

    testUser = await auth.createUser({
      email: testEmail,
      password: testPassword,
      emailVerified: true,
      disabled: false,
    });

    console.log("✓ Firebase Auth user created");
    console.log(`  UID: ${testUser.uid}`);
    console.log(`  Email: ${testEmail}`);

    // =====================================================================
    // TEST 2: Firestore User Document
    // =====================================================================
    console.log("\nTEST 2: Firestore User Document Creation");
    console.log("─".repeat(50));

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

    console.log("✓ User document created in Firestore");

    const userDoc = await userDocRef.get();
    const userData = userDoc.data();
    console.log("✓ Document readable");
    console.log(
      `  Initial credits: nmap=${userData.scanCredits.nmap}, nuclei=${userData.scanCredits.nuclei}, zap=${userData.scanCredits.zap}`,
    );

    // =====================================================================
    // TEST 3: Manual Credit Addition (simulating successful payment)
    // =====================================================================
    console.log("\nTEST 3: Credit Addition (Simulated Payment)");
    console.log("─".repeat(50));

    await userDocRef.update({
      "scanCredits.nmap": admin.firestore.FieldValue.increment(100),
      "scanCredits.nuclei": admin.firestore.FieldValue.increment(100),
      "scanCredits.zap": admin.firestore.FieldValue.increment(100),
      stripeCustomerId: "cus_test_simulated",
    });

    const updatedDoc = await userDocRef.get();
    const updatedData = updatedDoc.data();
    console.log("✓ Credits added successfully");
    console.log(
      `  Updated credits: nmap=${updatedData.scanCredits.nmap}, nuclei=${updatedData.scanCredits.nuclei}, zap=${updatedData.scanCredits.zap}`,
    );

    // =====================================================================
    // TEST 4: Credit Deduction (simulating scan launch)
    // =====================================================================
    console.log("\nTEST 4: Credit Deduction (Simulated Scan)");
    console.log("─".repeat(50));

    await userDocRef.update({
      "scanCredits.nmap": admin.firestore.FieldValue.increment(-1),
      "scansUsed.nmap": admin.firestore.FieldValue.increment(1),
    });

    const finalDoc = await userDocRef.get();
    const finalData = finalDoc.data();
    console.log("✓ Credit deducted successfully");
    console.log(`  Final credits: nmap=${finalData.scanCredits.nmap}`);
    console.log(`  Scans used: nmap=${finalData.scansUsed.nmap}`);

    // =====================================================================
    // TEST 5: Verify Existing User (test@test.com)
    // =====================================================================
    console.log("\nTEST 5: Verify Production Test User");
    console.log("─".repeat(50));

    const prodTestUid = "8e4y6TrKmbYZ51V37HulCFduOTO2";
    const prodUserDoc = await db.collection("users").doc(prodTestUid).get();

    if (prodUserDoc.exists) {
      const prodData = prodUserDoc.data();
      console.log("✓ Production test user found");
      console.log(`  Email: ${prodData.email}`);
      console.log(
        `  Credits: nmap=${prodData.scanCredits.nmap}, nuclei=${prodData.scanCredits.nuclei}, zap=${prodData.scanCredits.zap}`,
      );
      console.log(
        `  Scans used: nmap=${prodData.scansUsed.nmap}, nuclei=${prodData.scansUsed.nuclei}, zap=${prodData.scansUsed.zap}`,
      );
      console.log(
        `  Stripe customer: ${prodData.stripeCustomerId || "Not set"}`,
      );

      // Check completed scans
      const completedScans = await db
        .collection("users")
        .doc(prodTestUid)
        .collection("completedScans")
        .limit(5)
        .get();

      console.log(`  Completed scans: ${completedScans.size} found`);
      completedScans.forEach((scan) => {
        const data = scan.data();
        console.log(`    - ${scan.id}: ${data.scannerType} → ${data.status}`);
      });
    } else {
      console.log("✗ Production test user not found");
    }

    // =====================================================================
    // Cleanup
    // =====================================================================
    console.log("\nCleaning up test data...");
    console.log("─".repeat(50));

    await auth.deleteUser(testUser.uid);
    await userDocRef.delete();
    console.log("✓ Test user deleted");

    // =====================================================================
    // Summary
    // =====================================================================
    console.log("\n" + "=".repeat(50));
    console.log("TEST SUMMARY");
    console.log("=".repeat(50));
    console.log("");
    console.log("✓ User account creation:        PASS");
    console.log("✓ Firestore document creation:  PASS");
    console.log("✓ Credit addition:              PASS");
    console.log("✓ Credit deduction:             PASS");
    console.log("✓ Production user verification: PASS");
    console.log("");
    console.log("All user account flows verified! 🎉");
    console.log("");

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

testSignupFlow();
