/**
 * Heal false-positive `no_refresh_token` marks on static credentials.
 *
 * Dual-mode bug class (Epic 0006): health sweep applied provider-level
 * `supportsTokenRefresh` without connection auth-mode, marking gemini AI Studio
 * keys and qoder PATs as expired. Stuck rows do not self-heal because the sweep
 * only marks when testStatus is empty/active.
 *
 * Safety:
 * - Uses domain getProviderConnections / updateProviderConnection (decrypted
 *   credentials) — never raw SQL on encrypted api_key ciphertext.
 * - Eligibility via connectionAuthMode SSoT (`isFalsePositiveNoRefreshToken`).
 * - Never heals legitimate OAuth #5326 rows (oauth + no_refresh_token).
 * - Never clears unrelated error codes (banned, refresh_failed, …).
 * - Idempotent: second run heals 0 rows.
 */

import {
  getProviderConnections,
  updateProviderConnection,
} from "@/lib/db/providers";
import { isFalsePositiveNoRefreshToken } from "@/shared/utils/connectionAuthMode";

export type HealFalsePositiveNoRefreshResult = {
  /** Number of connections updated on this run. */
  healed: number;
  /** Connection ids that were healed (no secrets). */
  healedIds: string[];
  /** Candidates inspected (for observability). */
  examined: number;
};

/**
 * Restore provider connections incorrectly marked `no_refresh_token` when the
 * connection is not OAuth-refreshable and still has a static credential.
 *
 * @returns counts only — never logs secret material
 */
export async function healFalsePositiveNoRefreshConnections(): Promise<HealFalsePositiveNoRefreshResult> {
  const connections = (await getProviderConnections({})) as Array<Record<string, unknown>>;
  const healedIds: string[] = [];

  for (const conn of connections) {
    if (!isFalsePositiveNoRefreshToken(conn as Parameters<typeof isFalsePositiveNoRefreshToken>[0])) {
      continue;
    }

    const id = typeof conn.id === "string" ? conn.id : "";
    if (!id) continue;

    await updateProviderConnection(id, {
      testStatus: "active",
      lastError: null,
      lastErrorAt: null,
      lastErrorType: null,
      lastErrorSource: null,
      errorCode: null,
    });
    healedIds.push(id);
  }

  return {
    healed: healedIds.length,
    healedIds,
    examined: connections.length,
  };
}
