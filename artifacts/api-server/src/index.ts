import { runMigrations } from "stripe-replit-sync";
import app from "./app";
import { logger } from "./lib/logger";
import { getStripeSync } from "./lib/stripeClient";

const rawPort = process.env["PORT"];
if (!rawPort) {
  throw new Error("PORT environment variable is required but was not provided.");
}
const port = Number(rawPort);
if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error("DATABASE_URL is required");

  try {
    logger.info("Running Stripe migrations...");
    await runMigrations({ databaseUrl });

    const stripeSync = await getStripeSync();

    const domain = process.env.REPLIT_DOMAINS?.split(",")[0] || process.env.REPLIT_DEV_DOMAIN;
    if (domain) {
      const webhookUrl = `https://${domain}/api/stripe/webhook`;
      try {
        const { webhook } = await stripeSync.findOrCreateManagedWebhook(webhookUrl);
        logger.info({ webhookUrl: webhook?.url }, "Stripe webhook configured");
      } catch (err) {
        logger.warn({ err }, "Could not configure Stripe webhook (may need Stripe connection)");
      }
    }

    // Backfill in background — don't block server startup
    stripeSync
      .syncBackfill()
      .then(() => logger.info("Stripe backfill complete"))
      .catch((err) => logger.error({ err }, "Stripe backfill failed"));
  } catch (err) {
    logger.error({ err }, "Stripe init failed - server will still start");
  }
}

// Start the HTTP server first, then initialise Stripe in the background so that
// a missing/unconnected Stripe integration doesn't block the API from running.
app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }
  logger.info({ port }, "Server listening");
  initStripe().catch((err) => logger.error({ err }, "initStripe threw"));
});
