var __defProp = Object.defineProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// portable/db.ts
import { AsyncLocalStorage } from "node:async_hooks";
import { Pool } from "pg";
import { drizzle } from "drizzle-orm/node-postgres";
import { sql } from "drizzle-orm";

// portable/schema.ts
var schema_exports = {};
__export(schema_exports, {
  appUsers: () => appUsers,
  evaluations: () => evaluations,
  organizationSettings: () => organizationSettings,
  settings: () => settings,
  subjects: () => subjects
});
import { pgTable, text, boolean, jsonb, uniqueIndex, index } from "drizzle-orm/pg-core";
var subjects = pgTable("subjects", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  documentKey: text("document_key").notNull(),
  taxId: text("tax_id").notNull(),
  subjectName: text("subject_name").notNull(),
  subjectType: text("subject_type").notNull(),
  address: text("address").notNull().default(""),
  email: text("email").notNull().default(""),
  phone: text("phone").notNull().default(""),
  activity: text("activity").notNull().default(""),
  pepStatus: boolean("pep_status").notNull().default(false),
  pepDetails: text("pep_details").notNull().default(""),
  clientCriteriaIds: jsonb("client_criteria_ids").$type().notNull().default([]),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull()
}, (t) => [uniqueIndex("subjects_owner_document").on(t.ownerId, t.documentKey), index("subjects_owner_name").on(t.ownerId, t.subjectName)]);
var evaluations = pgTable("evaluations", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  subjectId: text("subject_id").references(() => subjects.id),
  createdAt: text("created_at").notNull(),
  record: jsonb("record").$type().notNull()
}, (t) => [index("evaluations_owner").on(t.ownerId), index("evaluations_subject").on(t.subjectId)]);
var settings = pgTable("risk_settings", {
  ownerId: text("owner_id").primaryKey(),
  criteria: jsonb("criteria").$type().notNull(),
  factorWeights: jsonb("factor_weights").$type().notNull(),
  thresholds: jsonb("thresholds").$type().notNull(),
  updatedAt: text("updated_at").notNull()
});
var organizationSettings = pgTable("organization_settings", {
  ownerId: text("owner_id").primaryKey(),
  organization: jsonb("organization").$type().notNull(),
  updatedAt: text("updated_at").notNull()
});
var appUsers = pgTable("app_users", {
  id: text("id").primaryKey(),
  ownerId: text("owner_id").notNull(),
  email: text("email").notNull(),
  name: text("name").notNull(),
  role: text("role").$type().notNull(),
  active: boolean("active").notNull().default(true),
  grants: jsonb("grants").$type().notNull(),
  updatedAt: text("updated_at").notNull()
}, (t) => [uniqueIndex("app_users_email").on(t.email)]);

// portable/db.ts
var path = process.env.GESPLAFT_TEST_DATABASE;
if (!path && !process.env.DATABASE_URL) throw Error("DATABASE_URL no configurada.");
var pool = path ? null : new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
var embedded = path ? new (await import("@electric-sql/pglite")).PGlite(path === "memory" ? "memory://" : path) : null;
var root = embedded ? (await import("drizzle-orm/pglite")).drizzle(embedded, { schema: schema_exports }) : drizzle(pool, { schema: schema_exports });
var context = new AsyncLocalStorage();
async function sqlQuery(text2, params = []) {
  const active = context.getStore();
  if (active) {
    const statement = sql.empty();
    text2.split(/\$(\d+)/).forEach((v, i) => statement.append(i % 2 ? sql`${params[Number(v) - 1]}` : sql.raw(v)));
    return (await active.execute(statement)).rows;
  }
  return embedded ? (await embedded.query(text2, params)).rows : (await pool.query(text2, params)).rows;
}
function getDb() {
  const db = context.getStore() || root;
  return Object.assign(db, { batch: async (queries) => {
    const run = async (tx) => {
      for (const q of queries) await tx.execute(q.getSQL());
    };
    if (context.getStore()) return run(db);
    return root.transaction((tx) => run(tx));
  } });
}
async function withWriteTransaction(fn) {
  return root.transaction(async (tx) => {
    if (!embedded) await tx.execute(sql`select pg_advisory_xact_lock(1489152314)`);
    return context.run(tx, async () => {
      const r = await fn();
      if (r.status >= 400) throw r;
      return r;
    });
  });
}
async function closeDb() {
  if (pool) await pool.end();
  if (embedded) await embedded.close();
}

export {
  __export,
  subjects,
  evaluations,
  settings,
  organizationSettings,
  appUsers,
  sqlQuery,
  getDb,
  withWriteTransaction,
  closeDb
};
