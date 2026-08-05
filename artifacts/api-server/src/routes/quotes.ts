import { anthropic } from "@workspace/integrations-anthropic-ai";
import { Router } from "express";
import { db, users } from "@workspace/db";
import { eq, sql, and } from "drizzle-orm";
import { requireAuth, hasProAccess, hasEverHadProAccess, FREE_QUOTE_LIMIT, type AuthedRequest } from "../lib/requireAuth";

const router = Router();

router.post("/quotes/generate", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const [user] = await db.select().from(users).where(eq(users.id, userId)).limit(1);
  if (!user) return res.status(404).json({ error: "User not found" });

  const isPro = await hasProAccess(userId, user.stripeCustomerId);

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
    // Block ex-subscribers from falling back to the free allowance.
    // If they have ever had a Pro subscription (even a cancelled/expired one),
    // they must re-subscribe — there is no free-tier loophole.
    const wasEverPro = await hasEverHadProAccess(userId, user.stripeCustomerId);
    if (wasEverPro) {
      return res.status(402).json({
        error: "upgrade_required",
        message: "Your Pro subscription has ended. Resubscribe to continue generating quotes.",
        quoteCount: user.quoteCount,
        quoteLimit: FREE_QUOTE_LIMIT,
      });
    }

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

  const { trade, tradeLabel, tradePromptContext, tradeTypicalItems, jobType, customerName, customerAddress, description, measurements, notes, photos, labourRate, vatRate, vatRegistered, validDays } = req.body;

  const labourRateNum = Number.isFinite(Number(labourRate)) && Number(labourRate) > 0 ? Number(labourRate) : null;
  const effectiveVatRate = vatRegistered === false ? 0 : (Number.isFinite(Number(vatRate)) && Number(vatRate) >= 0 ? Number(vatRate) : 20);
  const effectiveValidDays = Number.isFinite(Number(validDays)) && Number(validDays) > 0 ? Number(validDays) : 30;
  const effectiveTrade = tradeLabel || "tradesperson";
  const effectiveTradeContext = tradePromptContext || "UK tradesperson. Comply with all relevant regulations and British Standards.";
  const effectiveTypicalItems = tradeTypicalItems || "labour, materials, equipment, consumables";

  const textPrompt = `You are an expert quoting assistant for UK tradespeople. Generate a detailed, professional quote for a ${effectiveTrade}. ${effectiveTradeContext}

Job Type: ${jobType}
Customer Name: ${customerName}
${customerAddress ? `Customer Address: ${customerAddress}` : ""}
Job Description: ${description}
${measurements ? `Measurements/Quantities: ${measurements}` : ""}
${notes ? `Additional Notes: ${notes}` : ""}
${labourRateNum ? `Tradesperson hourly labour rate: £${labourRateNum.toFixed(2)}/hour (USE THIS EXACT RATE for all labour line items)` : ""}
VAT handling: ${vatRegistered === false ? "Tradesperson is NOT VAT registered — set taxRate to 0 and taxAmount to 0." : `Tradesperson is VAT registered — apply ${effectiveVatRate}% VAT.`}
Quote validity: ${effectiveValidDays} days
${photos?.length ? `\nNote: ${photos.length} photo(s) have been provided. Please analyse them carefully to identify existing materials, fittings, conditions, makes/models, and any safety or scope-of-work concerns visible in the images. Use this to inform realistic pricing for a ${effectiveTrade}.` : ""}

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
  "taxRate": ${effectiveVatRate},
  "taxAmount": number (subtotal × ${(effectiveVatRate / 100).toFixed(2)}),
  "total": number (subtotal + taxAmount),
  "professionalSummary": "string (internal professional summary of the work including any regs/testing considerations, 2-3 sentences)",
  "customerSummary": "string (clear customer-facing description of what will be done, 2-4 sentences)",
  "validDays": ${effectiveValidDays}
}

Guidelines:
- Generate 3-8 line items specific and realistic for UK ${effectiveTrade} work
- ${labourRateNum ? `For LABOUR line items, use the rate £${labourRateNum.toFixed(2)}/hour exactly as provided above.` : `Use realistic UK ${effectiveTrade} labour rates for the current market.`}
- Materials at realistic UK trade prices
- Include appropriate items such as: ${effectiveTypicalItems}
- If photos are provided, identify visible materials, fittings, condition, and scope-of-work concerns and price accordingly
- Include any inspection, certification, or sign-off as a separate line item where appropriate
- The customerSummary should be professional, reassuring, and mention quality/compliance
- All monetary values should be realistic for the UK market
- Separate labour and materials as distinct line items where appropriate
- taxRate MUST be exactly ${effectiveVatRate}; taxAmount = subtotal × ${(effectiveVatRate / 100).toFixed(2)}; validDays MUST be ${effectiveValidDays}`;

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
