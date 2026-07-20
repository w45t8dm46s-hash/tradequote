import { db, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import Stripe from "stripe";

import { getStripeWebhookSecret, getUncachableStripeClient } from "./stripeClient";

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

async function updateUserSubscription({
  customerId,
  subscriptionId,
  clerkUserId,
  email,
}: {
  customerId?: string | null;
  subscriptionId?: string | null;
  clerkUserId?: string | null;
  email?: string | null;
}) {
  const updates: any = {};

  if (customerId) updates.stripeCustomerId = customerId;
  if (subscriptionId) updates.stripeSubscriptionId = subscriptionId;

  if (Object.keys(updates).length === 0) {
    console.warn("Stripe webhook ignored: no customer/subscription IDs to save.");
    return;
  }

  if (clerkUserId) {
    await db.update(users).set(updates).where(eq(users.id, clerkUserId));
    return;
  }

  if (customerId) {
    await db.update(users).set(updates).where(eq(users.stripeCustomerId, customerId));
  }

  if (email && customerId) {
    await db.update(users).set(updates).where(eq(users.email, email));
  }
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        "STRIPE WEBHOOK ERROR: Payload must be a Buffer. Ensure webhook route is registered BEFORE app.use(express.json())."
      );
    }

    const stripe = getUncachableStripeClient();
    const event = stripe.webhooks.constructEvent(payload, signature, getStripeWebhookSecret());

    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        await updateUserSubscription({
          customerId: asString(session.customer),
          subscriptionId: asString(session.subscription),
          clerkUserId: session.client_reference_id || session.metadata?.clerkUserId || null,
          email: session.customer_details?.email || session.customer_email || null,
        });

        break;
      }

      case "customer.subscription.created":
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;

        await updateUserSubscription({
          customerId: asString(subscription.customer),
          subscriptionId: subscription.id,
          clerkUserId: subscription.metadata?.clerkUserId || null,
        });

        break;
      }

      case "invoice.payment_succeeded":
      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;

        await updateUserSubscription({
          customerId: asString(invoice.customer),
          subscriptionId: asString((invoice as any).subscription),
          clerkUserId: null,
          email: invoice.customer_email || null,
        });

        break;
      }

      default:
        console.log(`Stripe webhook ignored: ${event.type}`);
        break;
    }
  }
}
