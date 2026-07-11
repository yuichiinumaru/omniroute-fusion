/**
 * Start-only fetch timeout helpers.
 *
 * Semantics (aligned with `FETCH_TIMEOUT_MS` in open-sse/config/constants.ts):
 * - The timer covers only the wait for **initial upstream response headers**.
 * - Once `fetch` resolves, the timer is cleared so the response body / SSE stream
 *   is NOT aborted by this budget.
 * - Stream stalls after headers are governed by STREAM_IDLE_TIMEOUT_MS /
 *   Undici bodyTimeout / readiness timeouts — not by FETCH_TIMEOUT_MS.
 *
 * Specialized executors must use {@link fetchWithStartTimeout} instead of
 * `AbortSignal.timeout(FETCH_TIMEOUT_MS)` merged into the body lifetime.
 */

export function createFetchStartTimeoutError(timeoutMs: number, url: string): Error {
  const timeoutError = new Error(`Fetch timeout after ${timeoutMs}ms on ${url}`);
  timeoutError.name = "TimeoutError";
  return timeoutError;
}

/**
 * True when an error (or its cause / abort reason) is a start-timeout TimeoutError.
 */
export function isFetchStartTimeoutError(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current: unknown = error;
  while (current && typeof current === "object" && !seen.has(current)) {
    seen.add(current);
    const err = current as { name?: string; message?: string; cause?: unknown; reason?: unknown };
    if (err.name === "TimeoutError") return true;
    if (typeof err.message === "string" && err.message.startsWith("Fetch timeout after")) {
      return true;
    }
    if (err.cause) {
      current = err.cause;
      continue;
    }
    if (err.reason) {
      current = err.reason;
      continue;
    }
    break;
  }
  return false;
}

function combineSignals(
  primary: AbortSignal | null | undefined,
  secondary: AbortSignal | null | undefined
): AbortSignal | null {
  if (primary && secondary) {
    // Node ≥22: prefer native any() (no listener leak on long-lived client signals).
    if (typeof AbortSignal.any === "function") {
      return AbortSignal.any([primary, secondary]);
    }
    const controller = new AbortController();
    const abortFrom = (source: AbortSignal) => {
      if (!controller.signal.aborted) controller.abort(source.reason);
    };
    if (primary.aborted) {
      abortFrom(primary);
      return controller.signal;
    }
    if (secondary.aborted) {
      abortFrom(secondary);
      return controller.signal;
    }
    primary.addEventListener("abort", () => abortFrom(primary), { once: true });
    secondary.addEventListener("abort", () => abortFrom(secondary), { once: true });
    return controller.signal;
  }
  return primary || secondary || null;
}

export type FetchWithStartTimeoutOptions = RequestInit & {
  /** Explicit timeout budget; 0 / negative disables start timeout. */
  timeoutMs: number;
  /**
   * Optional client abort signal. Merged with the start-timeout signal for the
   * duration of the headers wait only; neither aborts the body after resolve.
   */
  clientSignal?: AbortSignal | null;
};

/**
 * `fetch` with a start-only timeout. Clears the timer as soon as headers arrive
 * (or the call rejects). On timeout, rethrows a stable `TimeoutError` even when
 * undici surfaces a generic `AbortError`.
 */
export async function fetchWithStartTimeout(
  url: string,
  options: FetchWithStartTimeoutOptions
): Promise<Response> {
  const { timeoutMs, clientSignal, signal: optionSignal, ...requestOptions } = options;
  const externalSignal = clientSignal ?? optionSignal ?? null;

  const timeoutController = timeoutMs > 0 ? new AbortController() : null;
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  if (timeoutController) {
    timeoutId = setTimeout(() => {
      timeoutController.abort(createFetchStartTimeoutError(timeoutMs, url));
    }, timeoutMs);
  }

  const combinedSignal = combineSignals(externalSignal, timeoutController?.signal ?? null);

  const optionsWithSignal = combinedSignal
    ? { ...requestOptions, signal: combinedSignal }
    : requestOptions;

  try {
    return await fetch(url, optionsWithSignal);
  } catch (error) {
    // Prefer a stable TimeoutError classification when our start timer fired.
    // Native fetch often rejects with AbortError / DOMException even when the
    // abort reason was TimeoutError (F-02-005).
    if (timeoutController?.signal.aborted) {
      const reason = timeoutController.signal.reason;
      const clientAborted = externalSignal?.aborted === true;
      if (!clientAborted && isFetchStartTimeoutError(reason)) {
        throw reason instanceof Error
          ? reason
          : createFetchStartTimeoutError(timeoutMs, url);
      }
      if (!clientAborted && reason instanceof Error && reason.name === "TimeoutError") {
        throw reason;
      }
    }
    if (isFetchStartTimeoutError(error)) {
      throw error instanceof Error ? error : createFetchStartTimeoutError(timeoutMs, url);
    }
    throw error;
  } finally {
    if (timeoutId) clearTimeout(timeoutId);
  }
}
