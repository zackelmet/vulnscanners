import { NextRequest, NextResponse } from "next/server";
import { getStripeServerSide } from "@/lib/stripe/getStripeServerSide";
import { requireAdmin } from "@/lib/firebase/serverAuth";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin(req);
  if (!auth.ok) return auth.response;

  try {
    const stripe = await getStripeServerSide();

    if (!stripe) {
      return NextResponse.json(
        { error: "Stripe is not initialized" },
        { status: 500 },
      );
    }
    const customers = await stripe.customers.list({ limit: 100 });

    const formattedCustomers = customers.data.map((customer) => ({
      id: customer.id,
      email: customer.email,
    }));

    return NextResponse.json({ customers: formattedCustomers });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
