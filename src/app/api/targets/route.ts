import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { CreateTargetRequest, Target } from "@/lib/types/target";

export async function POST(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const auth = admin.auth();
    const firestore = admin.firestore();

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;
    const body: CreateTargetRequest = await request.json();
    const { name, value, type, tags } = body;

    if (!name || !value || !type) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    // Basic validation
    if (type !== "domain" && type !== "ip" && type !== "url") {
      return NextResponse.json(
        { error: "Invalid target type" },
        { status: 400 },
      );
    }

    const newTargetRef = firestore.collection("targets").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();

    const targetData: Omit<Target, "id"> = {
      userId,
      name,
      value,
      type,
      tags: tags || [],
      createdAt: now as any,
      updatedAt: now as any,
      healthScore: 100, // Starts perfectly healthy
    };

    await newTargetRef.set(targetData);

    return NextResponse.json(
      { success: true, target: { id: newTargetRef.id, ...targetData } },
      { status: 201 },
    );
  } catch (error: any) {
    console.error("Error creating target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const admin = initializeAdmin();
    const auth = admin.auth();
    const firestore = admin.firestore();

    const authHeader = request.headers.get("authorization");
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const token = authHeader.split("Bearer ")[1];
    let decodedToken;
    try {
      decodedToken = await auth.verifyIdToken(token);
    } catch {
      return NextResponse.json({ error: "Invalid token" }, { status: 401 });
    }

    const userId = decodedToken.uid;

    const targetsSnapshot = await firestore
      .collection("targets")
      .where("userId", "==", userId)
      .orderBy("createdAt", "desc")
      .get();

    const targets = targetsSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return NextResponse.json({ success: true, targets });
  } catch (error: any) {
    console.error("Error fetching targets:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
