import { Router } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, userRecords } from "@workspace/db";
import { requireAuth, type AuthedRequest } from "../lib/requireAuth";

const router = Router();

async function ensureUserRecordsTable() {
  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS user_records (
      id text PRIMARY KEY,
      user_id text NOT NULL,
      entity_type text NOT NULL,
      payload jsonb NOT NULL,
      created_at timestamp DEFAULT now() NOT NULL,
      updated_at timestamp DEFAULT now() NOT NULL
    )
  `);
}

void ensureUserRecordsTable();

function getEntityKey(entityType: string): string {
  return `${entityType}`;
}

router.get("/me/records/:entityType", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entityType = req.params.entityType;

  const rows = await db
    .select()
    .from(userRecords)
    .where(and(eq(userRecords.userId, userId), eq(userRecords.entityType, getEntityKey(entityType))))
    .orderBy(desc(userRecords.updatedAt));

  res.json(rows.map((row) => ({ ...row, payload: row.payload })));
});

router.post("/me/records/:entityType", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entityType = req.params.entityType;
  const payload = req.body;
  const id = payload?.id;

  if (!id) return res.status(400).json({ error: "Missing record id" });

  const [row] = await db
    .insert(userRecords)
    .values({
      id: `${userId}:${entityType}:${id}`,
      userId,
      entityType: getEntityKey(entityType),
      payload,
    })
    .onConflictDoUpdate({
      target: userRecords.id,
      set: { payload, updatedAt: new Date() },
    })
    .returning();

  res.json(row);
});

router.put("/me/records/:entityType/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entityType = req.params.entityType;
  const recordId = req.params.id;
  const payload = req.body;

  const [row] = await db
    .insert(userRecords)
    .values({
      id: `${userId}:${entityType}:${recordId}`,
      userId,
      entityType: getEntityKey(entityType),
      payload,
    })
    .onConflictDoUpdate({
      target: userRecords.id,
      set: { payload, updatedAt: new Date() },
    })
    .returning();

  res.json(row);
});

router.delete("/me/records/:entityType/:id", requireAuth, async (req, res) => {
  const userId = (req as AuthedRequest).userId;
  const entityType = req.params.entityType;
  const recordId = req.params.id;

  await db
    .delete(userRecords)
    .where(and(eq(userRecords.userId, userId), eq(userRecords.entityType, getEntityKey(entityType)), eq(userRecords.id, `${userId}:${entityType}:${recordId}`)));

  res.json({ ok: true });
});

export default router;
