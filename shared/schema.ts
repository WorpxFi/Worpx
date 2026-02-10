import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  numeric,
  jsonb,
  pgEnum,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const chainEnum = pgEnum("chain", [
  "base",
  "ethereum",
  "polygon",
  "solana",
]);

export const channelStatusEnum = pgEnum("channel_status", [
  "opening",
  "active",
  "closing",
  "settled",
  "disputed",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "confirmed",
  "failed",
  "reverted",
]);

export const agents = pgTable("agents", {
  id: varchar("id", { length: 64 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  ownerAddress: text("owner_address").notNull(),
  chain: chainEnum("chain").notNull().default("base"),
  endpoint: text("endpoint"),
  publicKey: text("public_key").notNull(),
  capabilities: text("capabilities").array().default(sql`'{}'::text[]`),
  metadata: jsonb("metadata").$type<Record<string, unknown>>(),
  active: boolean("active").notNull().default(true),
  registeredAt: timestamp("registered_at").notNull().defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: varchar("id", { length: 64 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  fromAgentId: varchar("from_agent_id", { length: 64 })
    .notNull()
    .references(() => agents.id),
  toAgentId: varchar("to_agent_id", { length: 64 })
    .notNull()
    .references(() => agents.id),
  chain: chainEnum("chain").notNull(),
  token: text("token").notNull(),
  amount: numeric("amount", { precision: 36, scale: 18 }).notNull(),
  status: transactionStatusEnum("status").notNull().default("pending"),
  txHash: text("tx_hash"),
  channelId: varchar("channel_id", { length: 64 }).references(
    () => channels.id
  ),
  memo: text("memo"),
  createdAt: timestamp("created_at").notNull().defaultNow(),
  confirmedAt: timestamp("confirmed_at"),
});

export const channels = pgTable("channels", {
  id: varchar("id", { length: 64 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  initiatorId: varchar("initiator_id", { length: 64 })
    .notNull()
    .references(() => agents.id),
  counterpartyId: varchar("counterparty_id", { length: 64 })
    .notNull()
    .references(() => agents.id),
  chain: chainEnum("chain").notNull(),
  token: text("token").notNull().default("USDC"),
  depositAmount: numeric("deposit_amount", { precision: 36, scale: 18 }).notNull(),
  status: channelStatusEnum("status").notNull().default("opening"),
  nonce: integer("nonce").notNull().default(0),
  ttl: integer("ttl").notNull().default(3600),
  openedAt: timestamp("opened_at").notNull().defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const skills = pgTable("skills", {
  id: varchar("id", { length: 64 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  version: text("version").notNull().default("1.0.0"),
  description: text("description").notNull(),
  authorId: varchar("author_id", { length: 64 })
    .notNull()
    .references(() => agents.id),
  category: text("category").notNull(),
  chains: text("chains").array().default(sql`'{}'::text[]`),
  pricePerCall: numeric("price_per_call", { precision: 18, scale: 6 }),
  schema: jsonb("schema").$type<Record<string, unknown>>(),
  totalExecutions: integer("total_executions").notNull().default(0),
  avgLatencyMs: integer("avg_latency_ms"),
  published: boolean("published").notNull().default(false),
  createdAt: timestamp("created_at").notNull().defaultNow(),
});

export const skillExecutions = pgTable("skill_executions", {
  id: varchar("id", { length: 64 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  skillId: varchar("skill_id", { length: 64 })
    .notNull()
    .references(() => skills.id),
  callerAgentId: varchar("caller_agent_id", { length: 64 })
    .notNull()
    .references(() => agents.id),
  channelId: varchar("channel_id", { length: 64 }).references(
    () => channels.id
  ),
  params: jsonb("params").$type<Record<string, unknown>>(),
  result: jsonb("result").$type<Record<string, unknown>>(),
  latencyMs: integer("latency_ms"),
  paymentAmount: numeric("payment_amount", { precision: 18, scale: 6 }),
  success: boolean("success"),
  executedAt: timestamp("executed_at").notNull().defaultNow(),
});

export const insertAgentSchema = createInsertSchema(agents).omit({
  id: true,
  registeredAt: true,
});
export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
  confirmedAt: true,
});
export const insertChannelSchema = createInsertSchema(channels).omit({
  id: true,
  nonce: true,
  openedAt: true,
  closedAt: true,
});
export const insertSkillSchema = createInsertSchema(skills).omit({
  id: true,
  totalExecutions: true,
  avgLatencyMs: true,
  createdAt: true,
});
export const insertSkillExecutionSchema = createInsertSchema(
  skillExecutions
).omit({
  id: true,
  executedAt: true,
});

export type Agent = typeof agents.$inferSelect;
export type InsertAgent = z.infer<typeof insertAgentSchema>;
export type Transaction = typeof transactions.$inferSelect;
export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Channel = typeof channels.$inferSelect;
export type InsertChannel = z.infer<typeof insertChannelSchema>;
export type Skill = typeof skills.$inferSelect;
export type InsertSkill = z.infer<typeof insertSkillSchema>;
export type SkillExecution = typeof skillExecutions.$inferSelect;
export type InsertSkillExecution = z.infer<typeof insertSkillExecutionSchema>;
