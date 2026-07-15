import Stripe from "stripe";

const STRIPE_API_VERSION = "2025-08-27.basil" as const;

function getStripeSecretKey(): string {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY environment variable is not set. " +
      "Add it in your Render dashboard under Environment → Environment Variables."
    );
  }
  return key;
}

export function stripeEnabled(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

export function getUncachableStripeClient(): Stripe {
  return new Stripe(getStripeSecretKey(), { apiVersion: STRIPE_API_VERSION });
}

export function getStripeWebhookSecret(): string {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    throw new Error(
      "STRIPE_WEBHOOK_SECRET environment variable is not set. " +
      "Add the whsec_ value from your Stripe webhook destination in Render."
    );
  }
  return secret;
}
