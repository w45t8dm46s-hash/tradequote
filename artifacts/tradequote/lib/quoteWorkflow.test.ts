import test from "node:test";
import assert from "node:assert/strict";

// @ts-ignore -- Node test runner requires the explicit TypeScript extension.
import { buildSafeAiWordingPrompt, getAiWordingUnavailableMessage } from "./quoteWorkflow.ts";

test("buildSafeAiWordingPrompt blocks price and scope-changing edits", () => {
  const prompt = buildSafeAiWordingPrompt("Replace this with better wording", "Plumbing quote");

  assert.equal(prompt.context.includes("Do not add prices"), true);
  assert.equal(prompt.context.includes("Do not change quantities"), true);
  assert.equal(prompt.context.includes("Do not change materials"), true);
  assert.equal(prompt.context.includes("Do not change guarantees"), true);
  assert.equal(prompt.context.includes("Do not change certification"), true);
  assert.equal(prompt.context.includes("Do not change timescales"), true);
});

test("getAiWordingUnavailableMessage returns the fallback message", () => {
  assert.equal(getAiWordingUnavailableMessage(), "AI wording is unavailable. Your original wording has been kept.");
});
