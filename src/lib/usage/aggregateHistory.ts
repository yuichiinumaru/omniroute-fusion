/**
 * Aggregation utility functions for usage data summarization.
 * Rolls up usage_history (and quota_snapshots) into daily summary tables.
 *
 * ## Authority for `daily_usage_summary` (F-05-005 / Task 0050)
 *
 * | Writer | Source | Semantics | When to use |
 * |--------|--------|-----------|-------------|
 * | **`rollupUsageHistoryBeforeDate`** | `usage_history` (per-request) | **Authoritative** for request/token analytics. ON CONFLICT **replaces** recomputed totals for the date range. Used by retention cleanup. |
 * | **`rollupDailyUsage`** | `quota_snapshots` | Secondary / backfill only. ON CONFLICT replaces from snapshots — **not** request-accurate and must not be mixed with the cleanup path for the same (provider, model, date) without understanding that the last writer wins. |
 *
 * Cleanup must run rollup + DELETE of source rows in a **single transaction** so a crash
 * cannot leave additive re-aggregation of the same raw rows.
 *
 * @module lib/usage/aggregateHistory
 */

import { getDbInstance } from "../db/core";
import { getUserDatabaseSettings } from "../db/databaseSettings";

interface AggregationResult {
  processed: number;
  inserted: number;
  errors: number;
}

/**
 * Roll up quota_snapshots into daily_usage_summary table.
 * Aggregates by provider, model, and date.
 *
 * Secondary writer — see module authority note. Prefer usage_history rollup for
 * retention/analytics totals.
 *
 * @param fromDate - Start date (YYYY-MM-DD format)
 * @param toDate - End date (YYYY-MM-DD format)
 * @returns Aggregation result with counts
 */
export async function rollupDailyUsage(
  fromDate: string,
  toDate: string
): Promise<AggregationResult> {
  const db = getDbInstance();

  const result: AggregationResult = {
    processed: 0,
    inserted: 0,
    errors: 0,
  };

  try {
    // Aggregate quota_snapshots by provider, model, and date.
    // LOWER() keeps dual-writer keys aligned with usage_history rollup (Task 0050 N2).
    const aggregateQuery = `
      INSERT INTO daily_usage_summary (provider, model, date, total_requests, total_input_tokens, total_output_tokens, total_cost)
      SELECT 
        LOWER(provider) as provider,
        LOWER(COALESCE(json_extract(raw_data, '$.model'), 'unknown')) as model,
        DATE(created_at) as date,
        COUNT(*) as total_requests,
        COALESCE(SUM(CAST(json_extract(raw_data, '$.input_tokens') AS INTEGER)), 0) as total_input_tokens,
        COALESCE(SUM(CAST(json_extract(raw_data, '$.output_tokens') AS INTEGER)), 0) as total_output_tokens,
        COALESCE(SUM(CAST(json_extract(raw_data, '$.cost') AS REAL)), 0.0) as total_cost
      FROM quota_snapshots
      WHERE DATE(created_at) >= ? AND DATE(created_at) <= ?
      GROUP BY LOWER(provider), LOWER(COALESCE(json_extract(raw_data, '$.model'), 'unknown')), DATE(created_at)
      ON CONFLICT(provider, model, date) DO UPDATE SET
        total_requests = excluded.total_requests,
        total_input_tokens = excluded.total_input_tokens,
        total_output_tokens = excluded.total_output_tokens,
        total_cost = excluded.total_cost
    `;

    const stmt = db.prepare(aggregateQuery);
    const runResult = stmt.run(fromDate, toDate);

    result.processed = runResult.changes;
    result.inserted = runResult.changes;

    console.log(`[Aggregation] Daily rollup: ${result.inserted} rows for ${fromDate} to ${toDate}`);
  } catch (err: any) {
    console.error("[Aggregation] Daily rollup error:", err);
    result.errors++;
  }

  return result;
}

/**
 * Roll up quota_snapshots into hourly_usage_summary table.
 * Aggregates by provider, model, and hour.
 *
 * @param fromDate - Start datetime (YYYY-MM-DD HH:MM:SS format)
 * @param toDate - End datetime (YYYY-MM-DD HH:MM:SS format)
 * @returns Aggregation result with counts
 */
export async function rollupHourlyQuota(
  fromDate: string,
  toDate: string
): Promise<AggregationResult> {
  const db = getDbInstance();

  const result: AggregationResult = {
    processed: 0,
    inserted: 0,
    errors: 0,
  };

  try {
    // Aggregate quota_snapshots by provider, model, and hour.
    // LOWER() mirrors daily rollup dual-writer key parity (Task 0050 N2).
    const aggregateQuery = `
      INSERT INTO hourly_usage_summary (provider, model, date_hour, total_requests, total_input_tokens, total_output_tokens, total_cost)
      SELECT
        LOWER(provider) as provider,
        LOWER(COALESCE(json_extract(raw_data, '$.model'), 'unknown')) as model,
        datetime(strftime('%Y-%m-%d %H:00:00', created_at)) as date_hour,
        COUNT(*) as total_requests,
        COALESCE(SUM(CAST(json_extract(raw_data, '$.input_tokens') AS INTEGER)), 0) as total_input_tokens,
        COALESCE(SUM(CAST(json_extract(raw_data, '$.output_tokens') AS INTEGER)), 0) as total_output_tokens,
        COALESCE(SUM(CAST(json_extract(raw_data, '$.cost') AS REAL)), 0.0) as total_cost
      FROM quota_snapshots
      WHERE created_at >= ? AND created_at <= ?
      GROUP BY LOWER(provider), LOWER(COALESCE(json_extract(raw_data, '$.model'), 'unknown')), datetime(strftime('%Y-%m-%d %H:00:00', created_at))
      ON CONFLICT(provider, model, date_hour) DO UPDATE SET
        total_requests = excluded.total_requests,
        total_input_tokens = excluded.total_input_tokens,
        total_output_tokens = excluded.total_output_tokens,
        total_cost = excluded.total_cost
    `;

    const stmt = db.prepare(aggregateQuery);
    const runResult = stmt.run(fromDate, toDate);

    result.processed = runResult.changes;
    result.inserted = runResult.changes;

    console.log(
      `[Aggregation] Hourly rollup: ${result.inserted} rows for ${fromDate} to ${toDate}`
    );
  } catch (err: any) {
    console.error("[Aggregation] Hourly rollup error:", err);
    result.errors++;
  }

  return result;
}

/**
 * Synchronous usage_history → daily_usage_summary rollup (throws on SQL errors).
 * ON CONFLICT replaces recomputed totals so re-running with the same source rows
 * is idempotent (F-05-005). Prefer {@link rollupAndDeleteUsageHistoryBeforeDate}
 * for cleanup so rollup + delete share one transaction.
 *
 * @param beforeDate - ISO timestamp/date boundary. Rows strictly before this value are rolled up.
 */
export function rollupUsageHistoryBeforeDateSync(beforeDate: string): AggregationResult {
  const db = getDbInstance();
  const result: AggregationResult = {
    processed: 0,
    inserted: 0,
    errors: 0,
  };

  // Replace (not add) so a crash between rollup and delete cannot double-count
  // when the same raw rows are rolled again. Authority: usage_history is the
  // authoritative source for request/token summary rows (see module docs).
  const aggregateQuery = `
    INSERT INTO daily_usage_summary (provider, model, date, total_requests, total_input_tokens, total_output_tokens, total_cost)
    SELECT
      LOWER(provider) as provider,
      LOWER(model) as model,
      DATE(timestamp) as date,
      COUNT(*) as total_requests,
      COALESCE(SUM(tokens_input), 0) as total_input_tokens,
      COALESCE(SUM(tokens_output), 0) as total_output_tokens,
      0.0 as total_cost
    FROM usage_history
    WHERE timestamp < ?
      AND provider IS NOT NULL AND provider != ''
      AND model IS NOT NULL AND model != ''
    GROUP BY LOWER(provider), LOWER(model), DATE(timestamp)
    ON CONFLICT(provider, model, date) DO UPDATE SET
      total_requests = excluded.total_requests,
      total_input_tokens = excluded.total_input_tokens,
      total_output_tokens = excluded.total_output_tokens,
      total_cost = excluded.total_cost
  `;

  const runResult = db.prepare(aggregateQuery).run(beforeDate);
  result.processed = runResult.changes;
  result.inserted = runResult.changes;

  console.log(
    `[Aggregation] usage_history rollup: ${result.inserted} rows for dates before ${beforeDate}`
  );

  return result;
}

/**
 * Roll up usage_history into daily_usage_summary before raw rows are deleted.
 * This is the **authoritative** rollup — sourced from actual per-request token data,
 * not from quota_snapshots. Should be called before cleanupUsageHistory() deletes rows
 * (prefer the transactional helper for cleanup).
 *
 * ON CONFLICT **replaces** recomputed totals so re-running for the same source set is
 * idempotent (F-05-005). Do not use additive SUM here — that permanently inflates
 * analytics when cleanup crashes after rollup but before DELETE.
 *
 * @param beforeDate - ISO timestamp/date boundary. Rows strictly before this value are rolled up.
 * @returns Aggregation result with counts
 */
export async function rollupUsageHistoryBeforeDate(beforeDate: string): Promise<AggregationResult> {
  try {
    return rollupUsageHistoryBeforeDateSync(beforeDate);
  } catch (err: unknown) {
    console.error("[Aggregation] usage_history rollup error:", err);
    return { processed: 0, inserted: 0, errors: 1 };
  }
}

/**
 * Crash-safe rollup + delete of usage_history rows older than `beforeDate`.
 * Both steps run in a single SQLite transaction (F-05-005).
 */
export function rollupAndDeleteUsageHistoryBeforeDate(beforeDate: string): {
  rollup: AggregationResult;
  deleted: number;
} {
  const db = getDbInstance();
  return db.transaction(() => {
    const rollup = rollupUsageHistoryBeforeDateSync(beforeDate);
    const deleted = db.prepare("DELETE FROM usage_history WHERE timestamp < ?").run(beforeDate)
      .changes;
    return { rollup, deleted };
  })();
}

/**
 * Get the cutoff date for raw data based on retention settings.
 * Data older than this should be aggregated and cleaned up.
 *
 * @returns ISO date string (YYYY-MM-DD)
 */
export async function getRawDataCutoffDate(): Promise<string> {
  const rawDataRetentionDays = getUserDatabaseSettings().aggregation.rawDataRetentionDays;

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - rawDataRetentionDays);

  return cutoffDate.toISOString().split("T")[0];
}

/**
 * Check if aggregation is enabled in settings.
 */
export async function isAggregationEnabled(): Promise<boolean> {
  return getUserDatabaseSettings().aggregation.enabled;
}
