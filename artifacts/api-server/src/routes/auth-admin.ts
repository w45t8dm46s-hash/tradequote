import { Router } from "express";
import { createClerkClient } from "@clerk/express";

const router = Router();

function getClerk() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

async function findUserByEmail(clerk: ReturnType<typeof getClerk>, email: string) {
  const list = await clerk.users.getUserList({ emailAddress: [email] });
  return list.data?.[0] ?? null;
}

async function ensureEmailVerified(clerk: ReturnType<typeof getClerk>, user: any, email: string) {
  const emailAddr = user.emailAddresses.find((e: any) => e.emailAddress === email);
  if (!emailAddr) return;
  if (emailAddr.verification?.status === "verified") return;
  await (clerk.emailAddresses as any).updateEmailAddress(emailAddr.id, {
    verified: true,
    primary: true,
  });
}

// Verify email + create a one-time sign-in token that bypasses ALL factors (MFA, TOTP, email OTP)
router.post("/auth/sign-in-token", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const clerk = getClerk();
    const user = await findUserByEmail(clerk, email);
    if (!user) return res.status(404).json({ error: "user not found" });

    await ensureEmailVerified(clerk, user, email);

    const tokenObj = await (clerk.signInTokens as any).createSignInToken({
      userId: user.id,
      expiresInSeconds: 90,
    });

    res.json({ token: tokenObj.token });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown", code: e?.errors?.[0]?.code });
  }
});

// Legacy auto-verify endpoint (kept for backward compatibility)
router.post("/auth/auto-verify", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const clerk = getClerk();
    const user = await findUserByEmail(clerk, email);
    if (!user) return res.status(404).json({ error: "user not found" });

    await ensureEmailVerified(clerk, user, email);
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown", code: e?.errors?.[0]?.code });
  }
});

export default router;
