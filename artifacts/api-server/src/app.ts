import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import { clerkMiddleware } from "@clerk/express";
import { publishableKeyFromHost } from "@clerk/shared/keys";
import {
  CLERK_PROXY_PATH,
  clerkProxyMiddleware,
  getClerkProxyHost,
} from "./middlewares/clerkProxyMiddleware";
import router from "./routes";
import { WebhookHandlers } from "./lib/webhookHandlers";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// 1. Clerk proxy (production only) — must be before body parsers
app.use(CLERK_PROXY_PATH, clerkProxyMiddleware());

// 2. Stripe webhook — must use raw body, registered BEFORE express.json()
app.post(
  "/api/stripe/webhook",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];
    if (!signature) {
      res.status(400).json({ error: "Missing stripe-signature" });
      return;
    }
    try {
      const sig = Array.isArray(signature) ? signature[0] : signature;
      if (!Buffer.isBuffer(req.body)) {
        console.error("Stripe webhook: req.body is not a Buffer");
        res.status(500).json({ error: "Webhook processing error" });
        return;
      }
      await WebhookHandlers.processWebhook(req.body as Buffer, sig);
      res.status(200).json({ received: true });
    } catch (error: any) {
      console.error("Webhook error:", error?.message || error);
      res.status(400).json({ error: "Webhook processing error" });
    }
  },
);

// 3. CORS + body parsers
// Restrict CORS to trusted origins only. In dev we allow the Replit dev/expo
// domains; in production we allow the deployed REPLIT_DOMAINS.
const allowedOrigins = new Set<string>();
allowedOrigins.add("https://quoteforge.uk");
allowedOrigins.add("https://www.quoteforge.uk");
allowedOrigins.add("https://quoteforge-webapp.onrender.com");

// Explicit list for Render / custom deployments (comma-separated URLs or hostnames)
for (const entry of (process.env.ALLOWED_ORIGINS?.split(",") ?? [])) {
  const trimmed = entry.trim();
  if (!trimmed) continue;
  allowedOrigins.add(trimmed.startsWith("http") ? trimmed : `https://${trimmed}`);
}
// APP_DOMAIN / RENDER_EXTERNAL_URL for Render deployments
if (process.env.APP_DOMAIN) allowedOrigins.add(`https://${process.env.APP_DOMAIN.replace(/^https?:\/\//, "").replace(/\/$/, "")}`);
if (process.env.RENDER_EXTERNAL_URL) allowedOrigins.add(process.env.RENDER_EXTERNAL_URL.replace(/\/$/, ""));
// Replit fallbacks (no-op on Render where these vars are absent)
for (const d of (process.env.REPLIT_DOMAINS?.split(",") ?? [])) {
  if (d) allowedOrigins.add(`https://${d.trim()}`);
}
if (process.env.REPLIT_DEV_DOMAIN) allowedOrigins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
if (process.env.REPLIT_EXPO_DEV_DOMAIN) allowedOrigins.add(`https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`);

app.use(
  cors({
    credentials: true,
    origin: (origin, cb) => {
      // Allow same-origin / server-to-server requests (no Origin header).
      if (!origin) return cb(null, true);
      if (allowedOrigins.has(origin)) return cb(null, true);
      return cb(new Error(`CORS: origin ${origin} not allowed`));
    },
  }),
);
app.use(express.json({ limit: "20mb" }));
app.use(express.urlencoded({ extended: true, limit: "20mb" }));

// 4. Clerk auth middleware
app.use(
  clerkMiddleware((req) => ({
    publishableKey: publishableKeyFromHost(
      getClerkProxyHost(req) ?? "",
      process.env.CLERK_PUBLISHABLE_KEY,
    ),
  })),
);

app.use("/api", router);

export default app;
