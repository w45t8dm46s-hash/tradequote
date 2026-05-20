import { anthropic } from "@workspace/integrations-anthropic-ai";
import { Router } from "express";

const router = Router();

router.post("/quotes/generate", async (req, res) => {
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
      res.status(500).json({ error: "Unexpected response from AI" });
      return;
    }

    const jsonText = block.text.trim().replace(/^```json\n?/, "").replace(/\n?```$/, "");
    const data = JSON.parse(jsonText);
    res.json(data);
  } catch (err) {
    console.error("Quote generation error:", err);
    res.status(500).json({ error: "Failed to generate quote" });
  }
});

router.post("/follow-up", async (req, res) => {
  const { customerName, jobType, status, scheduledDate, notes } = req.body;

  const dateStr = scheduledDate
    ? new Date(scheduledDate).toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" })
    : null;

  const contextMap: Record<string, string> = {
    scheduled: `The job is scheduled for ${dateStr ?? "an upcoming date"}. Write a friendly confirmation/reminder message.`,
    "in-progress": `The job is currently in progress. Write a professional update message to the customer.`,
    completed: `The job has been completed. Write a thank-you message and ask for a review.`,
    cancelled: `The job was cancelled. Write a polite message checking if they'd like to reschedule.`,
  };

  const prompt = `You are a professional UK electrician writing a short follow-up message to a customer.

Customer Name: ${customerName}
Job Type: ${jobType}
Job Status: ${status}
${dateStr ? `Scheduled Date: ${dateStr}` : ""}
${notes ? `Notes: ${notes}` : ""}

Context: ${contextMap[status] ?? "Write a professional follow-up message."}

Write a short, friendly, professional text message (3-5 sentences) that sounds natural from an electrician. Use British English. Address the customer by first name. Do NOT include a subject line. Do NOT use formal letter formatting. Just write the message body.`;

  try {
    const message = await anthropic.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 500,
      messages: [{ role: "user", content: prompt }],
    });

    const block = message.content[0];
    if (block.type !== "text") {
      res.status(500).json({ error: "Unexpected response" });
      return;
    }

    res.json({ message: block.text.trim() });
  } catch (err) {
    console.error("Follow-up generation error:", err);
    res.status(500).json({ error: "Failed to generate follow-up message" });
  }
});

export default router;
