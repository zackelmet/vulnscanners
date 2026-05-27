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

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const [customers, revenue, activeSubscriptions, canceledSubscriptions] =
      await Promise.all([
        stripe.customers.list({ limit: 100 }),
        stripe.balanceTransactions.list({ limit: 100 }),
        stripe.subscriptions.list({ status: "active", limit: 100 }),
        stripe.subscriptions.list({
          status: "canceled",
          created: { gte: Math.floor(thirtyDaysAgo.getTime() / 1000) },
          limit: 100,
        }),
      ]);

    const totalCustomers = customers.data.length;
    const totalRevenue =
      revenue.data.reduce((sum, transaction) => sum + transaction.amount, 0) /
      100;
    const activeSubscriptionsCount = activeSubscriptions.data.length;

    const mrr = activeSubscriptions.data.reduce(
      (sum, subscription) =>
        sum + (subscription.items.data[0].price.unit_amount ?? 0) / 100,
      0,
    );

    const canceledSubscriptionsCount = canceledSubscriptions.data.length;
    const churnRate = calculateChurnRate(
      activeSubscriptionsCount,
      canceledSubscriptionsCount,
    );

    return NextResponse.json({
      totalCustomers,
      totalRevenue,
      activeSubscriptions: activeSubscriptionsCount,
      mrr,
      churnRate,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

function calculateChurnRate(
  activeSubscriptions: number,
  canceledSubscriptions: number,
): number {
  if (activeSubscriptions === 0) return 0;
  return (
    (canceledSubscriptions / (activeSubscriptions + canceledSubscriptions)) *
    100
  );
}
