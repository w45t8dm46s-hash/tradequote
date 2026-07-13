import { jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const userRecords = pgTable("user_records", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  entityType: text("entity_type").notNull(),
  payload: jsonb("payload").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export type UserRecord = typeof userRecords.$inferSelect;
