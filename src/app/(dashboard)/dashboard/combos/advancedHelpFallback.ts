/**
 * Advanced-config field help fallback (English canonical copy).
 *
 * Source of truth: `src/i18n/messages/en.json` → `combos.advancedHelp.*`.
 * The page prefers the active locale via `getI18nOrFallback()` and only falls
 * back to these constants when the key is missing. The retry-control strings
 * here must stay byte-identical to `en.json` — `tests/unit/combo-retry-control-labels.test.ts`
 * asserts parity for `maxRetries` / `maxSetRetries` (and their delay siblings)
 * so a change to one surface without the other fails CI.
 */
export const ADVANCED_FIELD_HELP_FALLBACK = {
  maxRetries:
    "maxRetries applies to one combo target (single model). N = N extra attempts after the first (N+1 total on that target); only transient errors are retried, never token-limit 429s. Default 1.",
  retryDelay: "Initial wait between retries. Higher values reduce burst pressure.",
  concurrencyPerModel:
    "Round-robin combo/model limit: max simultaneous requests sent to each model target. This is separate from any provider account-only cap.",
  queueTimeout:
    "How long a request can wait for a round-robin model slot before timing out. This queue is separate from any account-only concurrency cap.",
  stickyLimit:
    "Round-robin sticky batch size: consecutive successful requests sent to one target before rotating to the next. Empty inherits the global Sticky Limit setting; 1 disables batching (pure one-request rotation).",
  stickyWeightedLimit:
    "Weighted sticky batch size: consecutive successful requests sent to the selected weighted target before drawing again. Empty or 1 keeps the current per-request weighted draw.",
  failoverBeforeRetry:
    "When enabled, a 429 from the upstream triggers immediate target failover instead of retrying the same URL first.",
  targetTimeoutMs:
    "Optional combo target timeout. Empty inherits the current request timeout; larger values are capped to that timeout.",
  maxSetRetries:
    "maxSetRetries applies to the whole target set after every target fails. N = N extra full-set passes after the first (N+1 total); targets excluded in an earlier pass are re-evaluated on each pass. Default 0 (no set-level retry).",
  setRetryDelayMs:
    "Delay between set-level retry attempts, giving transient issues time to resolve.",
  nestedComboMode:
    "How references to other combos are handled. Flatten expands a combo ref into this combo's target list (legacy). Execute treats a combo ref as a black-box target: the parent strategy selects the child combo, then the child runs its own strategy and retries.",
};
