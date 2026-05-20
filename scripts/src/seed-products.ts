import { getUncachableStripeClient } from "./stripeClient";

const PRODUCT_NAME = "QuoteFlow Pro";
const PRICE_PENCE = 1499; // £14.99
const CURRENCY = "gbp";

async function main() {
  const stripe = await getUncachableStripeClient();
  console.log(`Seeding ${PRODUCT_NAME} (£${(PRICE_PENCE / 100).toFixed(2)}/month)...`);

  const existing = await stripe.products.search({
    query: `name:'${PRODUCT_NAME}' AND active:'true'`,
  });

  let productId: string;
  if (existing.data.length > 0) {
    productId = existing.data[0].id;
    console.log(`Product already exists: ${productId}`);
  } else {
    const product = await stripe.products.create({
      name: PRODUCT_NAME,
      description: "Unlimited AI-generated electrical quotes for UK electricians. BS 7671 / Part P compliant.",
    });
    productId = product.id;
    console.log(`Created product: ${productId}`);
  }

  // Look for an existing matching price
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 100 });
  const match = prices.data.find(
    (p) => p.unit_amount === PRICE_PENCE && p.currency === CURRENCY && p.recurring?.interval === "month",
  );
  if (match) {
    console.log(`Price already exists: ${match.id}`);
    return;
  }

  const price = await stripe.prices.create({
    product: productId,
    unit_amount: PRICE_PENCE,
    currency: CURRENCY,
    recurring: { interval: "month" },
  });
  console.log(`Created price: ${price.id}`);

  // Archive any other active monthly GBP prices on this product so the
  // server-side allowlist resolves to a single current price.
  for (const old of prices.data) {
    if (old.id === price.id) continue;
    if (old.currency !== CURRENCY) continue;
    if (old.recurring?.interval !== "month") continue;
    await stripe.prices.update(old.id, { active: false });
    console.log(`Archived old price: ${old.id} (${old.unit_amount})`);
  }
  console.log("Webhooks will sync this to the local database.");
}

main().catch((err) => {
  console.error("Seed failed:", err);
  process.exit(1);
});
