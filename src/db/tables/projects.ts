import { date, pgTable, text, timestamp, uuid } from "drizzle-orm/pg-core";
import { users } from "./auth";

export type ProjectStatusEnum =
  | "in-progress"
  | "waiting-to-start"
  | "completed"
  | "cancelled"
  | "on-hold";

export const projects = pgTable("projects", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text(),
  status: text()
    .notNull()
    .$type<ProjectStatusEnum>()
    .default("waiting-to-start"),
  startDate: date(),
  deadlineDate: date(),
  customerId: uuid()
    .notNull()
    .references(() => customers.id),
  tags: text().array().default([]),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projectTasks = pgTable("project_tasks", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid()
    .notNull()
    .references(() => projects.id),
  name: text().notNull(),
  description: text(),
  startDate: date().notNull(),
  dueDate: date().notNull(),
  assigneeId: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const customers = pgTable("customers", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projectMembers = pgTable("project_members", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid()
    .notNull()
    .references(() => projects.id),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});
