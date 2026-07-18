/**
 * F-04-001 — pure classification for non-throwing chat soft-results vs circuit breaker.
 *
 * `handleChatCore` returns `{ success:false, status }` without throwing. The chat path
 * must not treat that as `breaker.execute()` success. Outcome hooks are decided here
 * so HALF_OPEN probes re-open on provider-level soft-fails and never heal on soft 5xx.
 *
 * Kept free of DB / module side-effects for unit testing.
 */

/** Provider-level statuses that trip the whole-provider circuit breaker. */
export const PROVIDER_BREAKER_FAILURE_STATUSES: ReadonlySet<number> = new Set([
  408, 500, 502, 503, 504,
]);

export type SoftChatBreakerOutcome = "success" | "failure" | "none";

export type SoftChatBreakerOutcomeArgs = {
  success: boolean;
  status: number;
  /** Live breaker state after lazy refresh (CLOSED | DEGRADED | OPEN | HALF_OPEN). */
  breakerState: string;
  isCombo: boolean;
  /**
   * When true, account rotation will continue — only a HALF_OPEN failed probe
   * is recorded here; terminal accounting runs when rotation ends.
   */
  willRetryAnotherAccount: boolean;
  forceLiveComboTest?: boolean;
};

/**
 * Classify how a soft (non-throwing) chat result should update the provider breaker.
 *
 * Rules (match chat.ts historical branches, consolidated):
 * - forceLiveComboTest → none
 * - success → success (_onSuccess)
 * - HALF_OPEN + any soft non-success → failure (failed probe; combo + non-combo).
 *   Must run **before** the provider-status filter: `tryReserveExecution` already
 *   burned a probe slot; leaving HALF_OPEN with halfOpenAllowed=0 after a soft 429/401
 *   would permanently block traffic until manual reset (no OPEN→HALF_OPEN timer applies).
 * - non-provider status (CLOSED/DEGRADED) → none (account cooldown/lockout owns 401/429)
 * - willRetryAnotherAccount + not HALF_OPEN → none (keep rotating accounts)
 * - terminal non-combo provider-level → failure
 * - terminal combo provider-level → none (combo records via recordProviderFailure)
 */
export function classifySoftChatBreakerOutcome(
  args: SoftChatBreakerOutcomeArgs
): SoftChatBreakerOutcome {
  if (args.forceLiveComboTest) return "none";
  if (args.success) return "success";
  // Failed HALF_OPEN probe — re-open regardless of HTTP status (F-04-001 / F-03-008).
  if (args.breakerState === "HALF_OPEN") return "failure";
  if (!PROVIDER_BREAKER_FAILURE_STATUSES.has(Number(args.status))) return "none";
  if (args.willRetryAnotherAccount) return "none";
  if (!args.isCombo) return "failure";
  return "none";
}
