import { NextRequest, NextResponse } from "next/server";
import { initializeAdmin } from "@/lib/firebase/firebaseAdmin";
import { Target } from "@/lib/types/target";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const targetId = params.id;

    if (!targetId) {
      return NextResponse.json(
        { error: "Target ID required" },
        { status: 400 },
      );
    }

    const targetRef = firestore.collection("targets").doc(targetId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists || targetDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    await targetRef.delete();

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error deleting target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } },
) {
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
    const targetId = params.id;
    const body = await request.json();

    const targetRef = firestore.collection("targets").doc(targetId);
    const targetDoc = await targetRef.get();

    if (!targetDoc.exists || targetDoc.data()?.userId !== userId) {
      return NextResponse.json({ error: "Target not found" }, { status: 404 });
    }

    const updateData: Partial<Target> = {
      ...body,
      updatedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    };

    // Ensure we don't overwrite readonly fields
    delete updateData.id;
    delete updateData.userId;
    delete updateData.createdAt;

    await targetRef.update(updateData);

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Error updating target:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
