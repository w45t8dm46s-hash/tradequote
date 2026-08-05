import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

import { getUncachableStripeClient } from "./stripeClient";
import { getRevenueCatAccess } from "./revenueCat";

export interface AuthedRequest extends Request {
  userId: string;
  userEmail: string | null;
}

const FREE_QUOTE_LIMIT = 5;

async function ensureUsersTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS users (
      id text PRIMARY KEY,
      email text,
      name text,
      quote_count integer DEFAULT 0 NOT NULL,
      stripe_customer_id text,
      stripe_subscription_id text,
      created_at timestamp DEFAULT now() NOT NULL
    )
  `);
}

export async function ensureLocalUser(clerkUserId: string): Promise<{ id: string; email: string | null; quoteCount: number; stripeCustomerId: string | null; stripeSubscriptionId: string | null }> {
  await ensureUsersTable();
  const existing = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);
  if (existing[0]) return existing[0];

  let email: string | null = null;
  try {
    const user = await clerkClient.users.getUser(clerkUserId);
    email = user.primaryEmailAddress?.emailAddress ?? user.emailAddresses[0]?.emailAddress ?? null;
  } catch (err) {
    // Tolerate Clerk lookup failure - we'll fill email later.
  }

  const inserted = await db
    .insert(users)
    .values({ id: clerkUserId, email })
    .onConflictDoNothing()
    .returning();

  if (inserted[0]) return inserted[0];

  const row = await db.select().from(users).where(eq(users.id, clerkUserId)).limit(1);
  return row[0]!;
}

function getConfiguredProPriceIds(): string[] {
  return [
    process.env.STRIPE_PRICE_ID,
    process.env.STRIPE_PRO_PRICE_ID,
    process.env.QUOTEFORGE_PRICE_ID,
  ].filter(Boolean) as string[];
}

function subscriptionMatchesConfiguredPrice(subscription: any, configuredPriceIds: string[]): boolean {
  if (configuredPriceIds.length === 0) return true;
  return Boolean(
    subscription?.items?.data?.some((item: any) => configuredPriceIds.includes(item?.price?.id))
  );
}

export async function getActiveProPriceIds(): Promise<string[]> {
  return getConfiguredProPriceIds();
}

export async function hasActiveSubscription(stripeCustomerId: string | null): Promise<boolean> {
  if (!stripeCustomerId) return false;

  const stripe = getUncachableStripeClient();
  const configuredPriceIds = getConfiguredProPriceIds();

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 10,
    expand: ["data.items.data.price"],
  });

  return subscriptions.data.some((subscription: any) =>
    ["active", "trialing"].includes(subscription.status) &&
    subscriptionMatchesConfiguredPrice(subscription, configuredPriceIds)
  );
}

export async function hasEverSubscribed(stripeCustomerId: string | null): Promise<boolean> {
  if (!stripeCustomerId) return false;

  const stripe = getUncachableStripeClient();
  const configuredPriceIds = getConfiguredProPriceIds();

  const subscriptions = await stripe.subscriptions.list({
    customer: stripeCustomerId,
    status: "all",
    limit: 100,
    expand: ["data.items.data.price"],
  });

  return subscriptions.data.some((subscription: any) =>
    subscriptionMatchesConfiguredPrice(subscription, configuredPriceIds)
  );
}

export async function hasProAccess(
  userId: string,
  stripeCustomerId: string | null,
): Promise<boolean> {
  try {
    if (await hasActiveSubscription(stripeCustomerId)) return true;
  } catch (error) {
    console.error("Stripe Pro access check failed:", error);
  }

  try {
    return (await getRevenueCatAccess(userId)).active;
  } catch (error) {
    console.error("RevenueCat Pro access check failed:", error);
    return false;
  }
}

export async function hasEverHadProAccess(
  userId: string,
  stripeCustomerId: string | null,
): Promise<boolean> {
  try {
    if (await hasEverSubscribed(stripeCustomerId)) return true;
  } catch (error) {
    console.error("Stripe subscription history check failed:", error);
  }

  try {
    return (await getRevenueCatAccess(userId)).ever;
  } catch (error) {
    console.error("RevenueCat subscription history check failed:", error);
    return false;
  }
}

export const requireAuth = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const auth = getAuth(req);
    const userId = auth?.sessionClaims?.userId as string | undefined || auth?.userId;
    if (!userId) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const localUser = await ensureLocalUser(userId);
    (req as AuthedRequest).userId = localUser.id;
    (req as AuthedRequest).userEmail = localUser.email;
    next();
  } catch (err) {
    console.error("requireAuth error:", err);
    res.status(500).json({ error: "Auth check failed" });
  }
};

export { FREE_QUOTE_LIMIT };
export type { AuthedRequest };
