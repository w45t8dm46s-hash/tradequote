import { Router } from "express";
import { createClerkClient } from "@clerk/express";

const TOKEN = "qf-one-time-9x2k";
const router = Router();

async function getClerk() {
  return createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
}

// Force-verify a user's email so they can sign in without receiving the code
router.post("/admin-temp/verify-email", async (req, res) => {
  const { token, email } = req.body as { token?: string; email?: string };
  if (token !== TOKEN) return res.status(403).json({ error: "forbidden" });
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const clerk = await getClerk();
    const list = await clerk.users.getUserList({ emailAddress: [email] });
    const user = list.data?.[0];
    if (!user) return res.status(404).json({ error: "user not found" });
    const emailAddr = user.emailAddresses.find((e: any) => e.emailAddress === email);
    if (!emailAddr) return res.status(404).json({ error: "email address object not found" });
    const updated = await (clerk.emailAddresses as any).updateEmailAddress(emailAddr.id, {
      verified: true,
      primary: true,
    });
    res.json({ success: true, userId: user.id, status: updated?.verification?.status ?? "updated" });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown", code: e?.errors?.[0]?.code });
  }
});

// Delete a user account
router.delete("/admin-temp/delete-user", async (req, res) => {
  const { token, email } = req.body as { token?: string; email?: string };
  if (token !== TOKEN) return res.status(403).json({ error: "forbidden" });
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const clerk = await getClerk();
    const list = await clerk.users.getUserList({ emailAddress: [email] });
    const user = list.data?.[0];
    if (!user) return res.status(404).json({ error: "user not found" });
    await clerk.users.deleteUser(user.id);
    res.json({ deleted: true, userId: user.id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown" });
  }
});

export default router;
