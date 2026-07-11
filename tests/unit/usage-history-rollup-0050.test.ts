/**
 * Task 0050 / F-05-005 — usage_history → daily_usage_summary rollup idempotency
 * and crash-safe cleanup (transactional rollup + delete).
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const TEST_DATA_DIR = fs.mkdtempSync(path.join(os.tmpdir(), "omni-usage-rollup-0050-"));
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.DISABLE_SQLITE_AUTO_BACKUP = "true";

const core = await import("../../src/lib/db/core.ts");
const databaseSettings = await import("../../src/lib/db/databaseSettings.ts");
const cleanup = await import("../../src/lib/db/cleanup.ts");
const aggregateHistory = await import("../../src/lib/usage/aggregateHistory.ts");

type CountRow = { count: number };
type UsageSummaryRow = {
  provider: string;
  model: string;
  date: string;
  total_requests: number;
  total_input_tokens: number;
  total_output_tokens: number;
  total_cost: number;
};

function resetStorage() {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

function insertUsage(
  provider: string,
  model: string,
  timestamp: string,
  tokensIn: number,
  tokensOut: number
) {
  const db = core.getDbInstance();
  db.prepare(
    `INSERT INTO usage_history
       (provider, model, timestamp, tokens_input, tokens_output, success, latency_ms)
     VALUES (?, ?, ?, ?, ?, 1, 100)`
  ).run(provider, model, timestamp, tokensIn, tokensOut);
}

test.beforeEach(() => {
  resetStorage();
});

test.after(() => {
  core.resetDbInstance();
  fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
});

test("F-05-005: rolling up usage_history twice does not double totals", async () => {
  insertUsage("OpenAI", "GPT-Test", "2024-01-01T12:00:00.000Z", 100, 40);
  insertUsage("openai", "gpt-test", "2024-01-01T18:00:00.000Z", 50, 10);

  const first = await aggregateHistory.rollupUsageHistoryBeforeDate("2024-06-01");
  const second = await aggregateHistory.rollupUsageHistoryBeforeDate("2024-06-01");

  assert.equal(first.errors, 0);
  assert.equal(second.errors, 0);

  const db = core.getDbInstance();
  const rows = db
    .prepare("SELECT * FROM daily_usage_summary ORDER BY provider, model, date")
    .all() as UsageSummaryRow[];

  assert.equal(rows.length, 1, "provider/model lowercasing collapses to one summary row");
  assert.equal(rows[0].total_requests, 2);
  assert.equal(rows[0].total_input_tokens, 150);
  assert.equal(rows[0].total_output_tokens, 50);
});

test("F-05-005: cleanupUsageHistory rollup+delete is atomic (no orphan rollup without delete on success)", async () => {
  databaseSettings.updateDatabaseSettings({
    retention: {
      ...databaseSettings.getUserDatabaseSettings().retention,
      usageHistory: 30,
    },
  });

  insertUsage("openai", "gpt-test", "2024-01-01T12:00:00.000Z", 100, 40);
  insertUsage("openai", "gpt-test", new Date().toISOString(), 7, 3);

  const result = await cleanup.cleanupUsageHistory();
  assert.equal(result.errors, 0);
  assert.equal(result.deleted, 1);

  const db = core.getDbInstance();
  assert.equal(
    (db.prepare("SELECT COUNT(*) AS count FROM usage_history").get() as CountRow).count,
    1
  );

  const daily = db.prepare("SELECT * FROM daily_usage_summary").get() as UsageSummaryRow;
  assert.equal(daily.total_requests, 1);
  assert.equal(daily.total_input_tokens, 100);

  // Re-running cleanup must not inflate summary (source rows already deleted; replace is no-op).
  const second = await cleanup.cleanupUsageHistory();
  assert.equal(second.errors, 0);
  assert.equal(second.deleted, 0);

  const after = db.prepare("SELECT * FROM daily_usage_summary").get() as UsageSummaryRow;
  assert.equal(after.total_requests, 1);
  assert.equal(after.total_input_tokens, 100);
});

test("F-05-005: re-rollup after simulated crash (rows still present) keeps replace semantics", async () => {
  insertUsage("anthropic", "claude", "2024-02-01T08:00:00.000Z", 200, 80);
  insertUsage("anthropic", "claude", "2024-02-01T09:00:00.000Z", 100, 20);

  // Simulate rollup succeeding then crash before DELETE: re-run rollup only.
  await aggregateHistory.rollupUsageHistoryBeforeDate("2024-06-01");
  await aggregateHistory.rollupUsageHistoryBeforeDate("2024-06-01");
  await aggregateHistory.rollupUsageHistoryBeforeDate("2024-06-01");

  const db = core.getDbInstance();
  const daily = db.prepare("SELECT * FROM daily_usage_summary").get() as UsageSummaryRow;
  assert.equal(daily.total_requests, 2);
  assert.equal(daily.total_input_tokens, 300);
  assert.equal(daily.total_output_tokens, 100);

  // Source rows still present — cleanup can still delete without double-count on summary.
  databaseSettings.updateDatabaseSettings({
    retention: {
      ...databaseSettings.getUserDatabaseSettings().retention,
      usageHistory: 30,
    },
  });
  const cleanupResult = await cleanup.cleanupUsageHistory();
  assert.equal(cleanupResult.errors, 0);
  assert.equal(cleanupResult.deleted, 2);

  const after = db.prepare("SELECT * FROM daily_usage_summary").get() as UsageSummaryRow;
  assert.equal(after.total_requests, 2);
  assert.equal(after.total_input_tokens, 300);
});

test("F-05-005: usage_history is authoritative over quota_snapshots for overlapping summary keys", async () => {
  const db = core.getDbInstance();
  // Pre-seed a quota_snapshots-style summary row (as rollupDailyUsage would write).
  db.prepare(
    `INSERT INTO daily_usage_summary
       (provider, model, date, total_requests, total_input_tokens, total_output_tokens, total_cost)
     VALUES (?, ?, ?, ?, ?, ?, ?)`
  ).run("openai", "gpt-test", "2024-03-01", 99, 1, 1, 0.01);

  insertUsage("openai", "gpt-test", "2024-03-01T10:00:00.000Z", 500, 250);
  insertUsage("openai", "gpt-test", "2024-03-01T11:00:00.000Z", 100, 50);

  await aggregateHistory.rollupUsageHistoryBeforeDate("2024-06-01");

  const daily = db.prepare("SELECT * FROM daily_usage_summary").get() as UsageSummaryRow;
  assert.equal(daily.total_requests, 2, "usage_history rollup replaces quota-derived totals");
  assert.equal(daily.total_input_tokens, 600);
  assert.equal(daily.total_output_tokens, 300);
});
