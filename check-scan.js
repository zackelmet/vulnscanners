const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const db = admin.firestore();
const SCAN_ID = process.argv[2] || "test-nmap-1778853105";
const USER_ID = "8e4y6TrKmbYZ51V37HulCFduOTO2";

async function checkScan() {
  try {
    // Check user's completedScans subcollection
    const userScanRef = db
      .collection("users")
      .doc(USER_ID)
      .collection("completedScans")
      .doc(SCAN_ID);
    const userScanSnap = await userScanRef.get();

    console.log("\n=== User Scan Document ===");
    if (userScanSnap.exists) {
      const data = userScanSnap.data();
      console.log("Status:", data.status);
      console.log("Scanner Type:", data.scannerType);
      console.log("Has Results Summary:", !!data.resultsSummary);
      console.log(
        "Results Summary:",
        JSON.stringify(data.resultsSummary, null, 2),
      );
      console.log("Error Message:", data.errorMessage || "none");
      console.log("End Time:", data.endTime?.toDate?.());
    } else {
      console.log("Document does not exist");
    }

    // Check global scans collection
    const globalScanRef = db.collection("scans").doc(SCAN_ID);
    const globalScanSnap = await globalScanRef.get();

    console.log("\n=== Global Scan Document ===");
    if (globalScanSnap.exists) {
      const data = globalScanSnap.data();
      console.log("Status:", data.status);
      console.log("Scanner Type:", data.scannerType);
      console.log("Has Results Summary:", !!data.resultsSummary);
    } else {
      console.log("Document does not exist");
    }

    process.exit(0);
  } catch (error) {
    console.error("Error:", error);
    process.exit(1);
  }
}

checkScan();
