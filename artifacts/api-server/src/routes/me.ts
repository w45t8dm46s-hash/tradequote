import { Router } from "express";
import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, hasActiveSubscription, FREE_QUOTE_LIMIT, type AuthedRequest } from "../lib/requireAuth";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  const isPro = await hasActiveSubscription(user.stripeCustomerId);

  let subscription: {
    status: string;
    cancelAtPeriodEnd: boolean;
    currentPeriodEnd: number | null;
    priceAmount: number | null;
    currency: string | null;
    interval: string | null;
  } | null = null;

  if (user.stripeCustomerId) {
    const result = await db.execute(sql`
      SELECT s.status, s.cancel_at_period_end, s.current_period_end,
             pr.unit_amount, pr.currency, pr.recurring
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      JOIN stripe.prices pr ON pr.id = si.price
      JOIN stripe.products p ON p.id = pr.product
      WHERE s.customer = ${user.stripeCustomerId}
        AND s.status IN ('active', 'trialing')
        AND pr.active = true
        AND p.active = true
      ORDER BY s.created DESC
      LIMIT 1
    `);
    const row = result.rows[0] as any | undefined;
    if (row) {
      const periodEnd = row.current_period_end;
      const periodEndNum = periodEnd instanceof Date ? Math.floor(periodEnd.getTime() / 1000) : (typeof periodEnd === "number" ? periodEnd : (periodEnd ? Math.floor(new Date(periodEnd).getTime() / 1000) : null));
      subscription = {
        status: row.status,
        cancelAtPeriodEnd: !!row.cancel_at_period_end,
        currentPeriodEnd: periodEndNum,
        priceAmount: row.unit_amount ?? null,
        currency: row.currency ?? null,
        interval: row.recurring?.interval ?? null,
      };
    }
  }

  res.json({
    id: user.id,
    email: user.email,
    quoteCount: user.quoteCount,
    quoteLimit: FREE_QUOTE_LIMIT,
    isPro,
    quotesRemaining: isPro ? null : Math.max(0, FREE_QUOTE_LIMIT - user.quoteCount),
    subscription,
  });
});

export default router;
