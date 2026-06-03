import { Router } from "express";
import { createClerkClient } from "@clerk/express";

const router = Router();

function getClerk() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

router.post("/auth/auto-verify", async (req, res) => {
  const { email } = req.body as { email?: string };
  if (!email) return res.status(400).json({ error: "email required" });

  try {
    const clerk = getClerk();
    const list = await clerk.users.getUserList({ emailAddress: [email] });
    const user = list.data?.[0];
    if (!user) return res.status(404).json({ error: "user not found" });

    const emailAddr = user.emailAddresses.find((e: any) => e.emailAddress === email);
    if (!emailAddr) return res.status(404).json({ error: "email address not found" });

    if (emailAddr.verification?.status === "verified") {
      return res.json({ success: true, already: true });
    }

    await (clerk.emailAddresses as any).updateEmailAddress(emailAddr.id, {
      verified: true,
      primary: true,
    });

    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown", code: e?.errors?.[0]?.code });
  }
});

export default router;
