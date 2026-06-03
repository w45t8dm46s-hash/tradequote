import { Router } from "express";
import { createClerkClient } from "@clerk/express";

const router = Router();

router.delete("/admin-temp/delete-user", async (req, res) => {
  const { token, email } = req.body as { token?: string; email?: string };
  if (token !== "qf-one-time-9x2k") {
    return res.status(403).json({ error: "forbidden" });
  }
  if (!email) return res.status(400).json({ error: "email required" });
  try {
    const clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
    const list = await clerk.users.getUserList({ emailAddress: [email] });
    const user = list.data?.[0];
    if (!user) return res.status(404).json({ error: "user not found" });
    await clerk.users.deleteUser(user.id);
    res.json({ deleted: true, userId: user.id });
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? "unknown error" });
  }
});

export default router;
