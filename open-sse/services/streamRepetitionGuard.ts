/**
 * Stream Repetition Guard
 *
 * RATIONALE & ALGORITHM DOCUMENTATION:
 * Certain LLM models (e.g., Dahl provider with kimi-k2.6) occasionally enter infinite
 * content-generation loops, emitting identical text blocks repeatedly until request timeout or memory crash.
 *
 * This module provides a per-request streaming repetition detector.
 *
 * Algorithm & Safeguards:
 * 1. Sliding Window & Thresholding:
 *    - Ignores chunks shorter than `minChunkLength` (default: 50 characters). This prevents false positives on
 *      short repeated phrases, punctuation, or whitespace-only deltas (e.g. "\n\n", " ", "the").
 * 2. Consecutive Matching:
 *    - Tracks consecutive identical content chunks of length >= `minChunkLength`.
 *    - When `historySize` (default: 3) consecutive identical chunks arrive, `check()` returns "repetition_detected".
 * 3. Tool-call Stream Safety:
 *    - Tool call argument streams grow incrementally in small fragments (<50 chars) or distinct parameter values.
 *      The minimum length threshold (50 chars) and exact matching ensure legitimate tool-call deltas pass cleanly.
 * 4. Feature Toggle & Opt-in Policy:
 *    - The repetition guard is controlled by combo-level `enableRepetitionGuard` setting (default: false).
 *      Opt-in default-off policy prevents unexpected intervention on legitimate models.
 */

export interface RepetitionGuardOptions {
  minChunkLength?: number;
  historySize?: number;
}

export interface RepetitionGuard {
  check(chunk: string): "ok" | "repetition_detected";
  reset(): void;
}

export function createRepetitionGuard(options: RepetitionGuardOptions = {}): RepetitionGuard {
  const minChunkLength = options.minChunkLength ?? 50;
  const historySize = options.historySize ?? 3;

  let lastChunk: string | null = null;
  let consecutiveCount = 0;

  return {
    check(chunk: string): "ok" | "repetition_detected" {
      if (typeof chunk !== "string" || chunk.length < minChunkLength) {
        return "ok";
      }

      if (lastChunk === chunk) {
        consecutiveCount++;
      } else {
        lastChunk = chunk;
        consecutiveCount = 1;
      }

      if (consecutiveCount >= historySize) {
        return "repetition_detected";
      }

      return "ok";
    },

    reset() {
      lastChunk = null;
      consecutiveCount = 0;
    },
  };
}
