const test = require("node:test");
const assert = require("node:assert/strict");
const { readFileSync } = require("node:fs");
const { join } = require("node:path");

test("production migration job syncs the pushed source before prisma migrate deploy", () => {
  const workflow = readFileSync(join(process.cwd(), ".github/workflows/haha.yml"), "utf8").replace(/\r\n/g, "\n");
  const migrationJob = workflow.split("\n  migrate:\n")[1]?.split("\n  build-push:\n")[0] ?? "";
  const syncAt = migrationJob.indexOf("git checkout origin/main -- prisma/schema.prisma prisma/migrations");
  const migrateAt = migrationJob.indexOf("prisma migrate deploy 2>/dev/null");
  assert.ok(migrationJob.includes("git fetch origin main"), "migration job must fetch the pushed repository commit");
  assert.notEqual(syncAt, -1, "migration job must sync schema and migrations from main");
  assert.notEqual(migrateAt, -1, "migration job must run prisma migrate deploy");
  assert.ok(syncAt < migrateAt, "schema/migration sync must happen before migrations are applied");
});
