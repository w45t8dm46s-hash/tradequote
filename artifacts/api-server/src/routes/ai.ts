import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../lib/requireAuth";

const router = Router();

function firstText(content: any): string {
  if (!Array.isArray(content)) return "";
  const item = content.find((part) => part?.type === "text" && typeof part?.text === "string");
  return item?.text ?? "";
}

router.post("/ai/improve-wording", requireAuth, async (req: AuthedRequest, res) => {
  try {
    const text = String(req.body?.text ?? "").trim();
    const context = String(req.body?.context ?? "").trim();

    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }

    if (text.length > 3000) {
      return res.status(400).json({ error: "Text is too long. Please shorten it first." });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY;

    if (!apiKey) {
      return res.status(503).json({ error: "AI wording is not configured yet." });
    }

    const prompt = [
      "Rewrite the following UK trade quote wording so it sounds professional, clear and customer-facing.",
      "Do not add prices.",
      "Do not invent guarantees, certification, timescales, safety claims or materials that were not mentioned.",
      "Do not make the wording overly salesy.",
      "Keep it concise and suitable for a quote scope of works.",
      context ? `Context: ${context}` : "",
      "",
      "Original wording:",
      text,
    ].filter(Boolean).join("\n");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "anthropic-version": "2023-06-01",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({
        model: process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest",
        max_tokens: 500,
        temperature: 0.2,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      const message = data?.error?.message || data?.message || "AI wording request failed.";
      return res.status(response.status).json({ error: message });
    }

    const improvedText = firstText(data.content).trim();

    if (!improvedText) {
      return res.status(500).json({ error: "AI did not return improved wording." });
    }

    return res.json({ improvedText });
  } catch (error: any) {
    console.error("Improve wording failed", error);
    return res.status(500).json({ error: error?.message || "Failed to improve wording." });
  }
});

export default router;
