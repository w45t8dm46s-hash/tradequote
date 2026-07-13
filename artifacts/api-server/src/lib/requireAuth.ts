import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

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
    // Tolerate Clerk lookup failure - we'll fill email later
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

export async function getActiveProPriceIds(): Promise<string[]> {
  const result = await db.execute(sql`
    SELECT pr.id FROM stripe.prices pr
    JOIN stripe.products p ON pr.product = p.id
    WHERE pr.active = true AND p.active = true
  `);
  return result.rows.map((r: any) => r.id as string);
}

export async function hasActiveSubscription(stripeCustomerId: string | null): Promise<boolean> {
  if (!stripeCustomerId) return false;
  // Tie entitlement strictly to a subscription on an active QuoteForge price.
  const result = await db.execute(sql`
    SELECT 1
    FROM stripe.subscriptions s
    JOIN stripe.subscription_items si ON si.subscription = s.id
    JOIN stripe.prices pr ON pr.id = si.price
    JOIN stripe.products p ON p.id = pr.product
    WHERE s.customer = ${stripeCustomerId}
      AND s.status IN ('active', 'trialing')
      AND pr.active = true
      AND p.active = true
    LIMIT 1
  `);
  return result.rows.length > 0;
}

/**
 * Returns true if this customer has EVER had a Pro subscription (including
 * cancelled/expired ones). Used to close the loophole where an ex-subscriber
 * could fall back to the free-quote allowance after cancellation.
 */
export async function hasEverSubscribed(stripeCustomerId: string | null): Promise<boolean> {
  if (!stripeCustomerId) return false;
  const result = await db.execute(sql`
    SELECT 1
    FROM stripe.subscriptions s
    JOIN stripe.subscription_items si ON si.subscription = s.id
    JOIN stripe.prices pr ON pr.id = si.price
    JOIN stripe.products p ON p.id = pr.product
    WHERE s.customer = ${stripeCustomerId}
      AND p.active = true
    LIMIT 1
  `);
  return result.rows.length > 0;
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
