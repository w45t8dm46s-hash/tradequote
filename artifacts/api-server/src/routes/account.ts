import { clerkClient } from "@clerk/express";
import { db, userRecords, users } from "@workspace/db";
import { eq } from "drizzle-orm";
import { Router } from "express";

import { requireAuth, type AuthedRequest } from "../lib/requireAuth";
import { getUncachableStripeClient, stripeEnabled } from "../lib/stripeClient";

const router = Router();

router.delete("/account", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;

  try {
    const [user] = await db
      .select({ stripeCustomerId: users.stripeCustomerId })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (user?.stripeCustomerId && stripeEnabled()) {
      try {
        await getUncachableStripeClient().customers.del(user.stripeCustomerId);
      } catch (error: any) {
        if (error?.code !== "resource_missing") throw error;
      }
    }

    await db.transaction(async (tx) => {
      await tx.delete(userRecords).where(eq(userRecords.userId, userId));
      await tx.delete(users).where(eq(users.id, userId));
    });

    await clerkClient.users.deleteUser(userId);

    return res.status(204).send();
  } catch (error) {
    console.error("Delete account error:", error);
    return res.status(500).json({
      error: "Could not delete account. Please try again.",
    });
  }
});

export default router;
