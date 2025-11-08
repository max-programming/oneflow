import {
  date,
  pgEnum,
  pgTable,
  text,
  timestamp,
  uuid,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export type ProjectStatusEnum =
  | "in-progress"
  | "waiting-to-start"
  | "completed"
  | "cancelled"
  | "on-hold";

export type TaskStatusEnum =
  | "waiting-to-start"
  | "in-progress"
  | "stuck"
  | "done";

export const taskStatusEnum = pgEnum("task_status", [
  "waiting-to-start",
  "in-progress",
  "stuck",
  "done",
]);

export const projects = pgTable("projects", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  description: text(),
  status: text()
    .notNull()
    .$type<ProjectStatusEnum>()
    .default("waiting-to-start"),
  managerId: uuid()
    .notNull()
    .references(() => users.id),
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
  deletedAt: timestamp(),
});

export const projectTasks = pgTable("project_tasks", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid()
    .notNull()
    .references(() => projects.id),
  name: text().notNull(),
  description: text(),
  status: taskStatusEnum().notNull().default("waiting-to-start"),
  startDate: date().notNull(),
  dueDate: date().notNull(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});

export const projectTaskAssignees = pgTable("project_task_assignees", {
  id: uuid().primaryKey().defaultRandom(),
  taskId: uuid()
    .notNull()
    .references(() => projectTasks.id),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const projectTaskTimesheets = pgTable("project_task_timesheets", {
  id: uuid().primaryKey().defaultRandom(),
  projectId: uuid()
    .notNull()
    .references(() => projects.id),
  taskId: uuid()
    .notNull()
    .references(() => projectTasks.id),
  userId: uuid()
    .notNull()
    .references(() => users.id),
  startTime: timestamp().notNull(),
  endTime: timestamp().notNull(),
  notes: text(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const customers = pgTable("customers", {
  id: uuid().primaryKey().defaultRandom(),
  name: text().notNull(),
  email: text().notNull().unique(),
  phone: text().notNull().unique(),
  createdAt: timestamp().notNull().defaultNow(),
  updatedAt: timestamp()
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
  deletedAt: timestamp(),
});
