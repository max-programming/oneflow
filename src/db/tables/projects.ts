import {
  date,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from "drizzle-orm/pg-core";
import { users } from "./auth";

export const projectStatusEnum = pgEnum("project_status", [
  "in-progress",
  "waiting-to-start",
  "completed",
  "cancelled",
  "on-hold",
]);
export type ProjectStatusEnum = (typeof projectStatusEnum.enumValues)[number];

export const taskStatusEnum = pgEnum("task_status", [
  "waiting-to-start",
  "in-progress",
  "stuck",
  "done",
]);
export type TaskStatusEnum = (typeof taskStatusEnum.enumValues)[number];

export const projects = pgTable("projects", {
  id: serial().primaryKey(),
  name: text().notNull(),
  description: text(),
  status: projectStatusEnum().notNull().default("waiting-to-start"),
  managerId: integer()
    .notNull()
    .references(() => users.id),
  startDate: date(),
  deadlineDate: date(),
  customerId: integer()
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
  id: serial().primaryKey(),
  projectId: integer()
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

export const projectTaskAssignees = pgTable(
  "project_task_assignees",
  {
    taskId: integer()
      .notNull()
      .references(() => projectTasks.id),
    userId: integer()
      .notNull()
      .references(() => users.id),
    createdAt: timestamp().notNull().defaultNow(),
    updatedAt: timestamp()
      .notNull()
      .defaultNow()
      .$onUpdate(() => new Date()),
  },
  (table) => [primaryKey({ columns: [table.taskId, table.userId] })],
);

export const projectTaskTimesheets = pgTable("project_task_timesheets", {
  id: serial().primaryKey(),
  projectId: integer()
    .notNull()
    .references(() => projects.id),
  taskId: integer()
    .notNull()
    .references(() => projectTasks.id),
  userId: integer()
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
  id: serial().primaryKey(),
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
