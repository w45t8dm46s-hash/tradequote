import { getAuth, clerkClient } from "@clerk/express";
import type { Request, Response, NextFunction } from "express";
import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";

export interface AuthedRequest extends Request {
  userId: string;
  userEmail: string | null;
}

const FREE_QUOTE_LIMIT = 5;

export async function ensureLocalUser(clerkUserId: string): Promise<{ id: string; email: string | null; quoteCount: number; stripeCustomerId: string | null; stripeSubscriptionId: string | null }> {
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

export async function hasActiveSubscription(stripeCustomerId: string | null): Promise<boolean> {
  if (!stripeCustomerId) return false;
  const result = await db.execute(sql`
    SELECT 1 FROM stripe.subscriptions
    WHERE customer = ${stripeCustomerId}
      AND status IN ('active', 'trialing')
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
