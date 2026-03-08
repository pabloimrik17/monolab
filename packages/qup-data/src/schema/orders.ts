import { pgTable, text, timestamp, uuid, varchar } from "drizzle-orm/pg-core";
import { sessions } from "./sessions.ts";

export const orders = pgTable("orders", {
    id: uuid("id").primaryKey().defaultRandom(),
    sessionId: uuid("session_id")
        .references(() => sessions.id)
        .notNull(),
    guestName: varchar("guest_name", { length: 50 }).notNull(),
    status: varchar("status", { length: 15 }).default("PENDING").notNull(),
    notes: text("notes"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
