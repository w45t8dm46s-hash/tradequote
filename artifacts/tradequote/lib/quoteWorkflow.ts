export function buildSafeAiWordingPrompt(text: string, context: string) {
  return {
    text,
    context: [
      context,
      "Improve the customer-facing wording only.",
      "Do not add prices, totals, quantities, materials, guarantees, certification or timescales.",
      "Do not change quantities.",
      "Do not change materials.",
      "Do not change guarantees.",
      "Do not change certification.",
      "Do not change timescales.",
      "Preserve the original meaning while improving clarity and tone.",
    ].join(" "),
  };
}

export function getAiWordingUnavailableMessage() {
  return "AI wording is unavailable. Your original wording has been kept.";
}
