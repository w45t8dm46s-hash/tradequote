import { Router } from "express";
import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth, hasActiveSubscription, FREE_QUOTE_LIMIT, type AuthedRequest } from "../lib/requireAuth";

const router = Router();

router.get("/me", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });
  const isPro = await hasActiveSubscription(user.stripeCustomerId);
  res.json({
    id: user.id,
    email: user.email,
    quoteCount: user.quoteCount,
    quoteLimit: FREE_QUOTE_LIMIT,
    isPro,
    quotesRemaining: isPro ? null : Math.max(0, FREE_QUOTE_LIMIT - user.quoteCount),
  });
});

export default router;
