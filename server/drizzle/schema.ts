import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, jsonb, boolean, pgEnum } from "drizzle-orm/pg-core";

export const projects = pgTable("projects", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description").default(""),
  prompt: text("prompt").notNull(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const features = pgTable("features", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  name: text("name").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("pending"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const milestones = pgTable("milestones", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  featureId: varchar("feature_id").references(() => features.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("pending"),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const goals = pgTable("goals", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  milestoneId: varchar("milestone_id").references(() => milestones.id, { onDelete: "cascade" }).notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  status: text("status").notNull().default("pending"),
  priority: integer("priority").default(0),
  score: integer("score").default(0),
  orderIndex: integer("order_index").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  goalId: varchar("goal_id").references(() => goals.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  status: text("status").notNull().default("queued"),
  payload: jsonb("payload").notNull().default({}),
  result: jsonb("result"),
  error: text("error"),
  createdAt: timestamp("created_at").defaultNow(),
  startedAt: timestamp("started_at"),
  completedAt: timestamp("completed_at"),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  body: text("body").notNull(),
  type: text("type").notNull().default("text"),
  meta: jsonb("meta").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export const proofs = pgTable("proofs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  projectId: varchar("project_id").references(() => projects.id, { onDelete: "cascade" }).notNull(),
  taskId: varchar("task_id").references(() => tasks.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  description: text("description").default(""),
  uri: text("uri"),
  content: text("content"),
  meta: jsonb("meta").default({}),
  createdAt: timestamp("created_at").defaultNow(),
});

export type Project = typeof projects.$inferSelect;
export type Feature = typeof features.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;
export type Goal = typeof goals.$inferSelect;
export type Task = typeof tasks.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type Proof = typeof proofs.$inferSelect;

export type InsertProject = typeof projects.$inferInsert;
export type InsertFeature = typeof features.$inferInsert;
export type InsertMilestone = typeof milestones.$inferInsert;
export type InsertGoal = typeof goals.$inferInsert;
export type InsertTask = typeof tasks.$inferInsert;
export type InsertMessage = typeof messages.$inferInsert;
export type InsertProof = typeof proofs.$inferInsert;
