import { anthropic } from "@workspace/integrations-anthropic-ai";
import { Router } from "express";
import { db, users } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, hasActiveSubscription, FREE_QUOTE_LIMIT, type AuthedRequest } from "../lib/requireAuth";

const router = Router();

router.post("/quotes/generate", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const isPro = await hasActiveSubscription(user.stripeCustomerId);

  // Atomic reservation: increment the count only if either Pro or under the
  // free limit. This prevents race conditions at the boundary.
  let reservedCount = user.quoteCount;
  if (isPro) {
    const [updated] = await db
      .update(users)
      .set({ quoteCount: sql`${users.quoteCount} + 1` })
      .where(eq(users.id, userId))
      .returning({ quoteCount: users.quoteCount });
    reservedCount = updated?.quoteCount ?? user.quoteCount + 1;
  } else {
    const updated = await db
      .update(users)
      .set({ quoteCount: sql`${users.quoteCount} + 1` })
      .where(and(eq(users.id, userId), sql`${users.quoteCount} < ${FREE_QUOTE_LIMIT}`))
      .returning({ quoteCount: users.quoteCount });
    if (updated.length === 0) {
      return res.status(402).json({
        error: "upgrade_required",
        message: `Free plan includes ${FREE_QUOTE_LIMIT} quotes. Upgrade to Pro for unlimited quotes.`,
        quoteCount: user.quoteCount,
        quoteLimit: FREE_QUOTE_LIMIT,
      });
    }
    reservedCount = updated[0].quoteCount;
  }

  const { jobType, customerName, customerAddress, description, measurements, notes, photos } = req.body;

  const textPrompt = `You are an expert quoting assistant for UK electricians. Generate a detailed, professional quote based on the following electrical job information. All work must be compliant with BS 7671 (18th Edition Wiring Regulations) and Part P of the UK Building Regulations.

Job Type: ${jobType}
Customer Name: ${customerName}
${customerAddress ? `Customer Address: ${customerAddress}` : ""}
Job Description: ${description}
${measurements ? `Measurements/Quantities: ${measurements}` : ""}
${notes ? `Additional Notes: ${notes}` : ""}
${photos?.length ? `\nNote: ${photos.length} photo(s) have been provided. Please analyse them carefully to identify existing electrical fittings, cable types, consumer unit condition, accessory makes/models, and any safety or scope-of-work concerns visible in the images.` : ""}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just JSON):
{
  "lineItems": [
    {
      "description": "string (specific task or electrical material)",
      "quantity": number,
      "unit": "string (e.g. hours, units, m, days)",
      "rate": number (price per unit in GBP, realistic UK market rates),
      "total": number (quantity × rate)
    }
  ],
  "subtotal": number (sum of all line item totals),
  "taxRate": 20,
  "taxAmount": number (subtotal × 0.20),
  "total": number (subtotal + taxAmount),
  "professionalSummary": "string (internal professional summary of the work including any regs/testing considerations, 2-3 sentences)",
  "customerSummary": "string (clear customer-facing description of what will be done, 2-4 sentences)",
  "validDays": 30
}

Guidelines:
- Generate 3-8 line items specific and realistic for UK electrical work
- Use realistic UK electrician market rates (£45-£75/hr labour typical; materials at trade prices)
- Include appropriate items such as: labour, cable (e.g. 2.5mm² T&E, 6mm² T&E, 6242Y), accessories (sockets, switches, back boxes), consumer unit components (RCBOs, MCBs), testing & certification (EIC or Minor Works), notification to building control where required (Part P)
- If photos are provided, identify visible fittings (e.g. brand/style of socket, condition of consumer unit, cable type) and price accordingly
- Include testing/certification as a separate line item where appropriate
- The customerSummary should be professional, reassuring, and mention safety/compliance
- All monetary values should be realistic for the UK market
- Separate labour and materials as distinct line items where appropriate`;

  try {
    const hasPhotos = photos && Array.isArray(photos) && photos.length > 0;
    const messageContent: any[] = hasPhotos
      ? [
          ...photos.map((b64: string) => ({
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: b64 },
          })),
          { type: "text", text: textPrompt },
        ]
      : [{ type: "text", text: textPrompt }];

    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5",
      max_tokens: 8192,
      messages: [{ role: "user", content: messageContent }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      return res.status(500).json({ error: "Unexpected response from AI" });
    }

    const jsonText = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const data = JSON.parse(jsonText);

    res.json({ ...data, quoteCount: reservedCount });
  } catch (err) {
    console.error("Quote generation error:", err);
    // Refund the reservation on failure so users aren't charged a quote slot
    // when generation fails.
    if (!isPro) {
      await db
        .update(users)
        .set({ quoteCount: sql`GREATEST(${users.quoteCount} - 1, 0)` })
        .where(eq(users.id, userId));
    }
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

export default router;
