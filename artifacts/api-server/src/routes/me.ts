import { Router } from "express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";

import { requireAuth, FREE_QUOTE_LIMIT, type AuthedRequest } from "../lib/requireAuth";
import { getUncachableStripeClient } from "../lib/stripeClient";
import { getRevenueCatAccess } from "../lib/revenueCat";

const router = Router();

function configuredPriceIds(): string[] {
  return [
    process.env.STRIPE_PRICE_ID,
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.QUOTEFORGE_PRICE_ID,
  ].filter(Boolean) as string[];
}

function subscriptionMatchesConfiguredPrice(subscription: any): boolean {
  const configured = configuredPriceIds();
  if (configured.length === 0) return true;
  return Boolean(subscription?.items?.data?.some((item: any) => configured.includes(item?.price?.id)));
}

async function getActiveSubscriptionDetails(stripeCustomerId: string | null) {
  if (!stripeCustomerId) return null;

  const stripe = getUncachableStripeClient();
  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });

  const subscription = subscriptions.data.find((sub: any) =>
    ["active", "trialing"].includes(sub.status) &&
    subscriptionMatchesConfiguredPrice(sub)
  ) as any | undefined;

  if (!subscription) return null;

  const item = subscription.items?.data?.[0];
  const price = item?.price;

  return {
    status: subscription.status,
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
    currentPeriodEnd: subscription.current_period_end ?? item?.current_period_end ?? null,
    priceAmount: price?.unit_amount ?? null,
    currency: price?.currency ?? null,
    interval: price?.recurring?.interval ?? null,
  };
}

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  let subscription = null;

  try {
    subscription = await getActiveSubscriptionDetails(user.stripeCustomerId);
  } catch (err) {
    console.error("Load subscription error:", err);
  }

  let appleAccess = {
    active: false,
    ever: false,
    productIdentifier: null as string | null,
    expiresAt: null as string | null,
  };

  try {
    appleAccess = await getRevenueCatAccess(user.id, req.query.refreshApple === "1");
  } catch (err) {
    console.error("Load Apple subscription error:", err);
  }

  const isPro = Boolean(subscription) || appleAccess.active;

  res.json({
    id: user.id,
    email: user.email,
    quoteCount: user.quoteCount,
    quoteLimit: FREE_QUOTE_LIMIT,
    isPro,
    quotesRemaining: isPro ? null : Math.max(0, FREE_QUOTE_LIMIT - user.quoteCount),
    subscription,
    subscriptionSource: subscription ? "stripe" : appleAccess.active ? "apple" : null,
    appleSubscription: appleAccess.active
      ? {
          productIdentifier: appleAccess.productIdentifier,
          expiresAt: appleAccess.expiresAt,
        }
      : null,
  });
});

export default router;
