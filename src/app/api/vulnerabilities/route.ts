import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";

export async function GET(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const firestore = admin.firestore();
    const authHeader = request.headers.get("Authorization");

    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    const decodedToken = await admin.auth().verifyIdToken(token);
    const userId = decodedToken.uid;

    const targetsSnapshot = await firestore
      .collection("users")
      .doc(userId)
      .collection("targets")
      .get();

    const targets = targetsSnapshot.empty
      ? []
      : targetsSnapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

    // Mock realistic vulnerabilities based on the targets we have
    const mockVulnerabilities = [];

    const severityMap = ["critical", "high", "medium", "low"];
    const issueLibrary = [
      {
        id: "CVE-2021-44228",
        title: "Log4j Remote Code Execution",
        severity: "critical",
        description:
          "The Log4j logging framework is susceptible to unauthenticated remote code execution.",
        solution: "Upgrade Log4j to version 2.17.1 or higher.",
      },
      {
        id: "CVE-2024-3094",
        title: "XZ Utils Backdoor",
        severity: "critical",
        description:
          "Malicious code discovered in xz tools allowing remote attacker to bypass SSH authentication.",
        solution: "Downgrade xz-utils to trusted version.",
      },
      {
        id: "ZAP-10020",
        title: "Anti-CSRF Tokens Check",
        severity: "high",
        description:
          "A Cross-Site Request Forgery (CSRF) vulnerability may exist due to missing anti-CSRF tokens.",
        solution:
          "Ensure anti-CSRF tokens are required for all state-changing requests.",
      },
      {
        id: "NMAP-22",
        title: "Open SSH Port",
        severity: "medium",
        description: "Port 22 is open, which may allow brute force attacks.",
        solution:
          "Configure firewall rules to restrict SSH access to known IPs, and disable password auth.",
      },
      {
        id: "ZAP-10021",
        title: "X-Content-Type-Options Header Missing",
        severity: "low",
        description:
          "The Anti-MIME-Sniffing header X-Content-Type-Options was not set to 'nosniff'.",
        solution:
          "Ensure that the application/web server sets the Content-Type header appropriately, and that it sets the X-Content-Type-Options header to 'nosniff'.",
      },
    ];

    let idCounter = 1;
    targets.forEach((target) => {
      // randomly assign 1-3 vulnerabilities to each target
      const vulnCount = Math.floor(Math.random() * 3) + 1;

      for (let i = 0; i < vulnCount; i++) {
        const issue =
          issueLibrary[Math.floor(Math.random() * issueLibrary.length)];
        mockVulnerabilities.push({
          ...issue,
          id: `vuln_${idCounter++}`,
          targetId: target.id,
          targetName: (target as any).name,
          targetValue: (target as any).value,
          discoveredAt: new Date(
            Date.now() - Math.random() * 10000000000,
          ).toISOString(),
        });
      }
    });

    if (targets.length === 0) {
      mockVulnerabilities.push({
        ...issueLibrary[0],
        id: "vuln_demo_1",
        targetId: "demo",
        targetName: "Demo API",
        targetValue: "demo.example.com",
        discoveredAt: new Date().toISOString(),
      });
      mockVulnerabilities.push({
        ...issueLibrary[2],
        id: "vuln_demo_2",
        targetId: "demo",
        targetName: "Demo API",
        targetValue: "demo.example.com",
        discoveredAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({
      success: true,
      vulnerabilities: mockVulnerabilities,
    });
  } catch (error: any) {
    console.error("Failed to fetch vulnerabilities:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
