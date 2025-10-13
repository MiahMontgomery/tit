import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default("No description"),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("Active"),
  elevenLabsApiKey: text("eleven_labs_api_key"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const features = pgTable("features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  description: text("description"),
  status: text("status").notNull().default("pending"), // pending, in-progress, completed
  createdAt: timestamp("created_at").defaultNow(),
});

export const milestoneState = pgEnum("milestone_state", ["PLANNED", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]);
export const goalState = pgEnum("goal_state", ["PLANNED", "IN_PROGRESS", "REVIEW", "DONE", "BLOCKED"]);

export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  featureId: varchar("feature_id").references(() => features.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  state: milestoneState("state").default("PLANNED"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  milestoneId: varchar("milestone_id").references(() => milestones.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  state: goalState("state").default("PLANNED"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});


export const logs = pgTable("logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  action: text("action").notNull(),
  description: text("description").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const deliverables = pgTable("deliverables", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  name: text("name").notNull(),
  content: text("content").notNull(),
  type: text("type").notNull(), // 'code', 'document', 'design', etc.
  status: text("status").notNull().default("draft"), // draft, review, approved
  createdAt: timestamp("created_at").defaultNow(),
});

export const salesData = pgTable("sales_data", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  messagesSent: integer("messages_sent").default(0),
  contentCreated: integer("content_created").default(0),
  income: integer("income").default(0), // in cents
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const outputItems = pgTable("output_items", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  type: text("type").notNull(), // 'screenshot', 'video', 'file', 'code', 'link', 'content'
  title: text("title").notNull(),
  description: text("description"),
  content: text("content"),
  url: text("url"),
  thumbnail: text("thumbnail"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'rejected', 'processing'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertProjectSchema = createInsertSchema(projects).pick({
  name: true,
  description: true,
}).extend({
  prompt: z.string().optional(),
  elevenLabsApiKey: z.string().optional(),
});


export const insertFeatureSchema = createInsertSchema(features).pick({
  projectId: true,
  name: true,
  description: true,
});

export type InsertProject = z.infer<typeof insertProjectSchema>;
export type InsertFeature = z.infer<typeof insertFeatureSchema>;

export type Project = typeof projects.$inferSelect;
export type Feature = typeof features.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type InsertMilestone = typeof milestones.$inferInsert;
export type InsertGoal = typeof goals.$inferInsert;
export type Log = typeof logs.$inferSelect;
export type Deliverable = typeof deliverables.$inferSelect;
export type SalesData = typeof salesData.$inferSelect;
export type OutputItem = typeof outputItems.$inferSelect;

// Messages for Input Tab
export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  content: text("content").notNull(),
  sender: text("sender").notNull(), // 'user' | 'assistant'
  type: text("type").notNull().default("text"), // 'text' | 'action' | 'screenshot' | 'code' | 'file' | 'execution'
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type Message = typeof messages.$inferSelect;

export const insertMessageSchema = createInsertSchema(messages).pick({
  projectId: true,
  content: true,
  sender: true,
});

export type InsertMessage = z.infer<typeof insertMessageSchema>;

// Checkpoints for Rollback System
export const checkpoints = pgTable("checkpoints", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  runId: varchar("run_id").notNull(),
  label: text("label").default('checkpoint'),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Checkpoint = typeof checkpoints.$inferSelect;

// Run states enum
export const runStateEnum = pgEnum('run_state', [
  'INTAKE', 'PLAN', 'SELECT_TASK', 'CODEGEN', 'TEST', 'BUILD', 
  'DEPLOY_PREVIEW', 'EVAL', 'REVIEW', 'TEARDOWN', 'DONE', 'FAILED'
]);

// Runs table
export const runs = pgTable("runs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  state: runStateEnum("state").notNull(),
  currentTaskId: varchar("current_task_id"),
  budgetTokens: integer("budget_tokens").default(0),
  budgetUsd: integer("budget_usd").default(0),
  spentTokens: integer("spent_tokens").default(0),
  spentUsd: integer("spent_usd").default(0),
  rateLimitWindow: integer("rate_limit_window").default(60),
  rateLimitMax: integer("rate_limit_max").default(10),
  lastActions: jsonb("last_actions").$type<number[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type Run = typeof runs.$inferSelect;
export type InsertRun = typeof runs.$inferInsert;

// Attempts table
export const attempts = pgTable("attempts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  runId: varchar("run_id").notNull(),
  state: runStateEnum("state").notNull(),
  status: varchar("status").notNull(), // 'ok'|'error'|'skipped'
  message: text("message"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Attempt = typeof attempts.$inferSelect;
export type InsertAttempt = typeof attempts.$inferInsert;

// API tokens table for PAT authentication
export const apiTokens = pgTable("api_tokens", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  projectId: varchar("project_id").references(() => projects.id),
  role: varchar("role").default('user'),
  tokenHash: varchar("token_hash").notNull().unique(),
  revokedAt: timestamp("revoked_at"),
  createdAt: timestamp("created_at").defaultNow(),
});
export type ApiToken = typeof apiTokens.$inferSelect;
export type InsertApiToken = typeof apiTokens.$inferInsert;

// Proofs table for storing proof data
export const proofs = pgTable("proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id).notNull(),
  runId: varchar("run_id").notNull(),
  type: varchar("type").notNull(), // 'log', 'code', 'test', 'build', 'deploy'
  ref: text("ref"), // file path or reference
  summary: text("summary").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});
export type Proof = typeof proofs.$inferSelect;
export type InsertProof = typeof proofs.$inferInsert;

// Tasks table for dependency-aware task management
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").notNull(),
  title: text("title").notNull(),
  state: text("state").notNull().$type<'PLANNED'|'IN_PROGRESS'|'REVIEW'|'DONE'|'BLOCKED'>().default('PLANNED'),
  priority: integer("priority").default(0),
  dependsOn: jsonb("depends_on").$type<string[]>().default(sql`'[]'::jsonb`),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});
export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;
