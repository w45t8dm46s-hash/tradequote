import { Router } from "express";
import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, getActiveProPriceIds, type AuthedRequest } from "../lib/requireAuth";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router = Router();

function getConfiguredPriceId(): string | null {
  return (
    process.env.STRIPE_PRICE_ID ||
    process.env.STRIPE_PRO_PRICE_ID ||
    process.env.QUOTEFORGE_PRICE_ID ||
    null
  );
}

async function getConfiguredStripePrice() {
  const priceId = getConfiguredPriceId();
  if (!priceId) return null;

  const stripe = await getUncachableStripeClient();
  const price = await stripe.prices.retrieve(priceId, { expand: ["product"] });
  const product: any = price.product;

  return {
    id: price.id,
    unit_amount: price.unit_amount ?? 0,
    currency: price.currency,
    recurring: price.recurring,
    productName: typeof product === "object" && product?.name ? product.name : "QuoteForge Pro",
  };
}



// Return the QuoteForge Pro price (the single subscription product).
router.get("/stripe/price", async (_req, res) => {
  try {
    const configured = await getConfiguredStripePrice();
    if (configured) {
      return res.json({ price: configured });
    }

    const result = await db.execute(sql`
      SELECT pr.id, pr.unit_amount, pr.currency, pr.recurring, p.name
      FROM stripe.prices pr
      JOIN stripe.products p ON pr.product = p.id
      WHERE pr.active = true AND p.active = true
      ORDER BY pr.unit_amount ASC
      LIMIT 1
    `);

    const row = result.rows[0];
    if (!row) {
      return res.status(503).json({
        error: "Stripe price is not configured. Set STRIPE_PRICE_ID on QuoteForge.api.",
      });
    }

    return res.json({
      price: {
        id: row.id,
        unit_amount: row.unit_amount,
        currency: row.currency,
        recurring: row.recurring,
        productName: row.name,
      },
    });
  } catch (err: any) {
    console.error("List price error:", err);
    res.status(500).json({ error: err.message || "Failed to load price" });
  }
});

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const userEmail = (req as AuthedRequest).userEmail;
    const { priceId, returnUrl } = req.body as { priceId?: string; returnUrl?: string };
    if (!priceId) return res.status(400).json({ error: "priceId required" });

    // Server-side allowlist: accept the configured live price ID, plus any active synced prices.
    const configuredPriceId = getConfiguredPriceId();
    const allowed = await getActiveProPriceIds().catch(() => []);
    if (priceId !== configuredPriceId && !allowed.includes(priceId)) {
      return res.status(400).json({ error: "Invalid priceId" });
    }

    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });

    const stripe = await getUncachableStripeClient();

    let customerId = user.stripeCustomerId;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: userEmail ?? undefined,
        metadata: { clerkUserId: userId },
      });
      customerId = customer.id;
      await db.update(users).set({ stripeCustomerId: customerId }).where(eq(users.id, userId));
    }

    const base = returnUrl || `${req.protocol}://${req.get("host")}`;
    const successUrl = `${base}?checkout=success`;
    const cancelUrl = `${base}?checkout=cancel`;

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      line_items: [{ price: priceId, quantity: 1 }],
      mode: "subscription",
      success_url: successUrl,
      cancel_url: cancelUrl,
      allow_promotion_codes: true,
    });

    res.json({ url: session.url });
  } catch (err: any) {
    console.error("Checkout error:", err);
    res.status(500).json({ error: err.message || "Failed to create checkout" });
  }
});

router.post("/stripe/cancel", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user) return res.status(404).json({ error: "User not found" });
    if (!user.stripeCustomerId) return res.status(400).json({ error: "No subscription found" });

    const result = await db.execute(sql`
      SELECT s.id
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      JOIN stripe.prices pr ON pr.id = si.price
      JOIN stripe.products p ON p.id = pr.product
      WHERE s.customer = ${user.stripeCustomerId}
        AND s.status IN ('active', 'trialing')
      ORDER BY s.created DESC
      LIMIT 1
    `);
    const row = result.rows[0] as { id: string } | undefined;
    if (!row?.id) return res.status(400).json({ error: "No active subscription found" });

    const stripe = await getUncachableStripeClient();
    const sub = await stripe.subscriptions.update(row.id, { cancel_at_period_end: true });

    res.json({
      ok: true,
      cancelAtPeriodEnd: sub.cancel_at_period_end,
      currentPeriodEnd: sub.current_period_end,
    });
  } catch (err: any) {
    console.error("Cancel error:", err);
    res.status(500).json({ error: err.message || "Failed to cancel subscription" });
  }
});

router.post("/stripe/resume", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
    if (!user?.stripeCustomerId) return res.status(400).json({ error: "No subscription found" });

    const result = await db.execute(sql`
      SELECT s.id
      FROM stripe.subscriptions s
      JOIN stripe.subscription_items si ON si.subscription = s.id
      JOIN stripe.prices pr ON pr.id = si.price
      JOIN stripe.products p ON p.id = pr.product
      WHERE s.customer = ${user.stripeCustomerId}
        AND s.status IN ('active', 'trialing')
        AND s.cancel_at_period_end = true
        AND pr.active = true
        AND p.active = true
      ORDER BY s.created DESC
      LIMIT 1
    `);
    const row = result.rows[0] as { id: string } | undefined;
    if (!row?.id) return res.status(400).json({ error: "No cancellation to undo" });

    const stripe = await getUncachableStripeClient();
    const sub = await stripe.subscriptions.update(row.id, { cancel_at_period_end: false });

    res.json({ ok: true, cancelAtPeriodEnd: sub.cancel_at_period_end });
  } catch (err: any) {
    console.error("Resume error:", err);
    res.status(500).json({ error: err.message || "Failed to resume subscription" });
  }
});

export default router;
