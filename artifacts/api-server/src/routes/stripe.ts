import { Router } from "express";
import { db, users } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { requireAuth, type AuthedRequest } from "../lib/requireAuth";
import { getUncachableStripeClient } from "../lib/stripeClient";

const router = Router();

// Return the QuoteFlow Pro price (the single subscription product).
router.get("/stripe/price", async (_req, res) => {
  try {
    const result = await db.execute(sql`
      SELECT pr.id, pr.unit_amount, pr.currency, pr.recurring, p.name
      FROM stripe.prices pr
      JOIN stripe.products p ON pr.product = p.id
      WHERE pr.active = true AND p.active = true
      ORDER BY pr.unit_amount ASC
      LIMIT 1
    `);
    const row = result.rows[0];
    if (!row) return res.json({ price: null });
    res.json({
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
    res.status(500).json({ error: "Failed to load price" });
  }
});

router.post("/stripe/checkout", requireAuth, async (req, res) => {
  try {
    const userId = (req as AuthedRequest).userId;
    const userEmail = (req as AuthedRequest).userEmail;
    const { priceId, returnUrl } = req.body as { priceId?: string; returnUrl?: string };
    if (!priceId) return res.status(400).json({ error: "priceId required" });

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

export default router;
