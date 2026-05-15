const admin = require("firebase-admin");

// Initialize Firebase Admin
admin.initializeApp({
  credential: admin.credential.cert({
    projectId: process.env.FIREBASE_ADMIN_PROJECT_ID,
    clientEmail: process.env.FIREBASE_ADMIN_CLIENT_EMAIL,
    privateKey: process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n"),
  }),
});

const TEST_UID = "8e4y6TrKmbYZ51V37HulCFduOTO2";

async function getCustomToken() {
  try {
    // Create a custom token for the test user
    const customToken = await admin.auth().createCustomToken(TEST_UID);
    console.log("Custom token created. Now exchange it for an ID token using:");
    console.log(
      '\ncurl -X POST "https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=YOUR_API_KEY" \\',
    );
    console.log('  -H "Content-Type: application/json" \\');
    console.log(`  -d '{"token":"${customToken}","returnSecureToken":true}'`);
    console.log("\nOr use this custom token directly with Firebase Client SDK");
    console.log("\nCustom Token:", customToken);
  } catch (error) {
    console.error("Error:", error);
  }
}

getCustomToken();
