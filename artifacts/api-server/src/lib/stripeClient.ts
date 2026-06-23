import Stripe from "stripe";
import { StripeSync } from "stripe-replit-sync";

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

export function getStripeSync(): StripeSync {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  return new StripeSync({
    poolConfig: { connectionString: databaseUrl, max: 2 },
    stripeSecretKey: getStripeSecretKey(),
    stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET,
  });
}
