import { pgTable, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const sessions = pgTable("sessions", {
    id: uuid("id").primaryKey().defaultRandom(),
    name: varchar("name", { length: 100 }).notNull(),
    code: varchar("code", { length: 6 }).unique().notNull(),
    status: varchar("status", { length: 10 }).default("OPEN").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
    closedAt: timestamp("closed_at"),
});
