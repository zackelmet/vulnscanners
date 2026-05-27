import { NextRequest, NextResponse } from "next/server";
import { getStripeServerSide } from "@/lib/stripe/getStripeServerSide";
import { requireAdmin } from "@/lib/firebase/serverAuth";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const { email } = await req.json();
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    const stripe = await getStripeServerSide();

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not initialized" },
        { status: 500 },
      );
    }

    const customer = await stripe.customers.create({ email });

    return NextResponse.json({ customerId: customer.id });
  } catch (error: any) {
    console.error("Error adding customer:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
