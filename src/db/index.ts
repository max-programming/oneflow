import { config } from "dotenv";

import { drizzle } from "drizzle-orm/postgres-js";
import { EnhancedQueryLogger } from "drizzle-query-logger";

import * as schema from "./schema.ts";
import { env } from "@/env.ts";

config();

export const db = drizzle(env.DATABASE_URL, {
  schema,
  casing: "snake_case",
  logger: new EnhancedQueryLogger(),
});
