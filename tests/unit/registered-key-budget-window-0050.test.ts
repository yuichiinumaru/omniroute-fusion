/**
 * Task 0050 / F-05-004 — registered-key budget window reset correctness.
 *
 * Reproduces: day/hour boundary still denies on pre-reset counters after the
 * SQL reset UPDATE, and increment path never resets windows.
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omni-rk-budget-0050-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.DISABLE_SQLITE_AUTO_BACKUP = "true";

const core = await import("../../src/lib/db/core.ts");
const registeredKeys = await import("../../src/lib/db/registeredKeys.ts");

function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

function yesterdayDay(): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

function previousHour(): string {
  const d = new Date(Date.now() - 60 * 60 * 1000);
  return d.toISOString().slice(0, 13);
}

function forceStaleBudgetCounters(
  id: string,
  opts: { dailyUsed: number; hourlyUsed: number; lastResetDay: string; lastResetHour: string }
) {
  const db = core.getDbInstance();
  db.prepare(
    `
    UPDATE registered_keys
    SET daily_used = ?,
        hourly_used = ?,
        last_reset_day = ?,
        last_reset_hour = ?
    WHERE id = ?
  `
  ).run(opts.dailyUsed, opts.hourlyUsed, opts.lastResetDay, opts.lastResetHour, id);
}

test.beforeEach(() => {
  resetStorage();
});

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("F-05-004: exhausted yesterday is allowed on first request of new day (validate)", () => {
  const issued = registeredKeys.issueRegisteredKey({
    name: "Day boundary key",
    dailyBudget: 2,
    hourlyBudget: 100,
  });
  assert.ok("rawKey" in issued && !("idempotencyConflict" in issued));

  forceStaleBudgetCounters(issued.id, {
    dailyUsed: 2,
    hourlyUsed: 2,
    lastResetDay: yesterdayDay(),
    lastResetHour: previousHour(),
  });

  // Pre-fix: false deny — validate resets SQL counters but compares stale in-memory values.
  const validated = registeredKeys.validateRegisteredKey(issued.rawKey);
  assert.ok(validated !== null, "key exhausted yesterday must be allowed after day window reset");
  assert.equal(validated.dailyUsed, 0, "returned counters must reflect post-reset values");
  assert.equal(validated.hourlyUsed, 0);

  const loaded = registeredKeys.getRegisteredKey(issued.id);
  assert.ok(loaded);
  assert.equal(loaded.dailyUsed, 0);
  assert.equal(loaded.hourlyUsed, 0);
});

test("F-05-004: exhausted last hour is allowed after hour window reset (validate)", () => {
  const issued = registeredKeys.issueRegisteredKey({
    name: "Hour boundary key",
    dailyBudget: 100,
    hourlyBudget: 1,
  });
  assert.ok("rawKey" in issued && !("idempotencyConflict" in issued));

  const today = new Date().toISOString().slice(0, 10);
  forceStaleBudgetCounters(issued.id, {
    dailyUsed: 5,
    hourlyUsed: 1,
    lastResetDay: today,
    lastResetHour: previousHour(),
  });

  const validated = registeredKeys.validateRegisteredKey(issued.rawKey);
  assert.ok(validated !== null, "hourly budget must reset at hour boundary");
  assert.equal(validated.hourlyUsed, 0);
  assert.equal(validated.dailyUsed, 5, "same-day daily counter is preserved on hour-only reset");
});

test("F-05-004: increment resets day window before bumping counters", () => {
  const issued = registeredKeys.issueRegisteredKey({
    name: "Increment day reset",
    dailyBudget: 2,
    hourlyBudget: 100,
  });
  assert.ok("rawKey" in issued && !("idempotencyConflict" in issued));

  forceStaleBudgetCounters(issued.id, {
    dailyUsed: 2,
    hourlyUsed: 2,
    lastResetDay: yesterdayDay(),
    lastResetHour: previousHour(),
  });

  registeredKeys.incrementRegisteredKeyUsage(issued.id);

  const loaded = registeredKeys.getRegisteredKey(issued.id);
  assert.ok(loaded);
  assert.equal(loaded.dailyUsed, 1, "increment after day reset must start at 1, not 3");
  assert.equal(loaded.hourlyUsed, 1);

  const validated = registeredKeys.validateRegisteredKey(issued.rawKey);
  assert.ok(validated !== null, "still under daily budget after single post-reset increment");
});

test("F-05-004: still-exhausted same day remains denied", () => {
  const issued = registeredKeys.issueRegisteredKey({
    name: "Still exhausted",
    dailyBudget: 2,
    hourlyBudget: 100,
  });
  assert.ok("rawKey" in issued && !("idempotencyConflict" in issued));

  registeredKeys.incrementRegisteredKeyUsage(issued.id);
  registeredKeys.incrementRegisteredKeyUsage(issued.id);
  assert.equal(registeredKeys.validateRegisteredKey(issued.rawKey), null);
});
