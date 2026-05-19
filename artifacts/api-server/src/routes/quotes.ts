import { anthropic } from "@workspace/integrations-anthropic-ai";
import { Router } from "express";

const router = Router();

router.post("/quotes/generate", async (req, res) => {
  const { jobType, customerName, customerAddress, description, measurements, notes } = req.body;

  const prompt = `You are an expert quoting assistant for UK tradespeople. Generate a detailed, professional quote based on the following job information.

Job Type: ${jobType}
Customer Name: ${customerName}
${customerAddress ? `Customer Address: ${customerAddress}` : ""}
Job Description: ${description}
${measurements ? `Measurements/Quantities: ${measurements}` : ""}
${notes ? `Additional Notes: ${notes}` : ""}

Return ONLY a valid JSON object with this exact structure (no markdown, no explanation, just JSON):
{
  "lineItems": [
    {
      "description": "string (specific task or material)",
      "quantity": number,
      "unit": "string (e.g. hours, m², units, m, days)",
      "rate": number (price per unit in GBP, realistic UK market rates),
      "total": number (quantity × rate)
    }
  ],
  "subtotal": number (sum of all line item totals),
  "taxRate": 20,
  "taxAmount": number (subtotal × 0.20),
  "total": number (subtotal + taxAmount),
  "professionalSummary": "string (internal professional summary of the work, 2-3 sentences)",
  "customerSummary": "string (clear customer-facing description of what will be done, 2-4 sentences)",
  "validDays": 30
}

Guidelines:
- Generate 3-8 line items that are specific and realistic for ${jobType} work in the UK
- Use realistic UK market rates (materials + labour appropriately separated where needed)
- The customerSummary should be professional and reassuring
- All monetary values should be realistic for the UK market
- Include both labour and materials as separate line items where appropriate`;

  const message = await anthropic.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8192,
    messages: [{ role: "user", content: prompt }],
  });

  const block = message.content[0];
  if (block.type !== "text") {
    res.status(500).json({ error: "Unexpected response from AI" });
    return;
  }

  const jsonText = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
  const data = JSON.parse(jsonText);
  res.json(data);
});

export default router;
