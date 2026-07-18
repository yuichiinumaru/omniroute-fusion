/**
 * Status vocabulary — micro-adoption from visual-reference STATE_VOCABULARY
 * (healthy / degraded / offline / …) mapped onto OmniRoute Badge + health tones.
 *
 * NOT a second design system: tones resolve to existing Badge variants and
 * semantic Tailwind utilities already used across the dashboard. Brand default
 * is dark-only coreCyan (`#00FFCC` / `text-primary`); `info` / `active` tones
 * follow the primary token (Task 0052).
 *
 * Glow is opt-in via `glowClass` and must stay limited to health / circuit-
 * breaker / critical status surfaces — never global layout chrome.
 */

/** Semantic tone used by Badge, StatCard accents, and health chips. */
export type StatusTone = "success" | "warning" | "danger" | "neutral" | "info";

/** Badge.variant values that `statusToBadgeVariant` may return. */
export type StatusBadgeVariant =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "error"
  | "info";

export type StatusGlow = "none" | "soft";

export type StatusVocabularyEntry = Readonly<{
  id: string;
  label: string;
  tone: StatusTone;
  /** Maps 1:1 onto shared Badge `variant`. */
  badgeVariant: StatusBadgeVariant;
  /** Text/icon utility classes (light + dark aware via Tailwind). */
  textClass: string;
  borderClass: string;
  bgClass: string;
  /** Soft box-shadow utility; empty when glow is none. */
  glowClass: string;
  glow: StatusGlow;
}>;

/** Soft glow utility classes — defined as proper CSS in globals.css to avoid
 * Tailwind v4 arbitrary value parsing issues with var() containing hyphens.
 * (`status-glow-success` exists in CSS for completeness; no vocab entry uses it yet.) */
const GLOW_SOFT_WARNING = "status-glow-warning";
const GLOW_SOFT_DANGER = "status-glow-danger";
const GLOW_SOFT_INFO = "status-glow-info";

/**
 * Canonical status ids → visual contract.
 * Aliases (ok, down, error, …) are resolved in `resolveStatusVocabulary`.
 *
 * Typed with `satisfies` so keys stay nominal (`StatusVocabularyId`) while
 * each entry still matches `StatusVocabularyEntry` (no property stripping).
 */
export const STATUS_VOCABULARY = {
  healthy: {
    id: "healthy",
    label: "Healthy",
    tone: "success",
    badgeVariant: "success",
    textClass: "text-green-600 dark:text-green-400",
    borderClass: "border-green-500/20",
    bgClass: "bg-green-500/10",
    glowClass: "",
    glow: "none",
  },
  degraded: {
    id: "degraded",
    label: "Degraded",
    tone: "warning",
    badgeVariant: "warning",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/20",
    bgClass: "bg-amber-500/10",
    glowClass: GLOW_SOFT_WARNING,
    glow: "soft",
  },
  offline: {
    id: "offline",
    label: "Offline",
    tone: "danger",
    badgeVariant: "error",
    textClass: "text-red-600 dark:text-red-400",
    borderClass: "border-red-500/20",
    bgClass: "bg-red-500/10",
    glowClass: "",
    glow: "none",
  },
  unknown: {
    id: "unknown",
    label: "Unknown",
    tone: "neutral",
    badgeVariant: "default",
    textClass: "text-text-muted",
    borderClass: "border-border",
    bgClass: "bg-black/5 dark:bg-white/10",
    glowClass: "",
    glow: "none",
  },
  info: {
    id: "info",
    label: "Info",
    tone: "info",
    badgeVariant: "info",
    textClass: "text-primary",
    borderClass: "border-primary/20",
    bgClass: "bg-primary/10",
    glowClass: "",
    glow: "none",
  },
  warning: {
    id: "warning",
    label: "Warning",
    tone: "warning",
    badgeVariant: "warning",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/20",
    bgClass: "bg-amber-500/10",
    glowClass: GLOW_SOFT_WARNING,
    glow: "soft",
  },
  error: {
    id: "error",
    label: "Error",
    tone: "danger",
    badgeVariant: "error",
    textClass: "text-red-600 dark:text-red-400",
    borderClass: "border-red-500/20",
    bgClass: "bg-red-500/10",
    glowClass: GLOW_SOFT_DANGER,
    glow: "soft",
  },
  /** Circuit breaker OPEN — critical; soft glow allowed on health surfaces only. */
  circuit_open: {
    id: "circuit_open",
    label: "Circuit Open",
    tone: "danger",
    badgeVariant: "error",
    textClass: "text-red-600 dark:text-red-400",
    borderClass: "border-red-500/30",
    bgClass: "bg-red-500/10",
    glowClass: GLOW_SOFT_DANGER,
    glow: "soft",
  },
  circuit_half_open: {
    id: "circuit_half_open",
    label: "Circuit Half-Open",
    tone: "warning",
    badgeVariant: "warning",
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/20",
    bgClass: "bg-amber-500/10",
    glowClass: GLOW_SOFT_WARNING,
    glow: "soft",
  },
  circuit_closed: {
    id: "circuit_closed",
    label: "Circuit Closed",
    tone: "success",
    badgeVariant: "success",
    textClass: "text-green-600 dark:text-green-400",
    borderClass: "border-green-500/20",
    bgClass: "bg-green-500/10",
    glowClass: "",
    glow: "none",
  },
  active: {
    id: "active",
    label: "Active",
    tone: "info",
    badgeVariant: "info",
    textClass: "text-primary",
    borderClass: "border-primary/20",
    bgClass: "bg-primary/10",
    glowClass: GLOW_SOFT_INFO,
    glow: "soft",
  },
  pending: {
    id: "pending",
    label: "Pending",
    tone: "warning",
    badgeVariant: "warning",
    // Amber track (same as Badge `warning` / degraded) — not yellow.
    textClass: "text-amber-600 dark:text-amber-400",
    borderClass: "border-amber-500/20",
    bgClass: "bg-amber-500/10",
    glowClass: "",
    glow: "none",
  },
  disabled: {
    id: "disabled",
    label: "Disabled",
    tone: "neutral",
    badgeVariant: "default",
    textClass: "text-text-muted",
    borderClass: "border-border",
    bgClass: "bg-black/5 dark:bg-white/10",
    glowClass: "",
    glow: "none",
  },
} as const satisfies Readonly<Record<string, StatusVocabularyEntry>>;

/** Nominal key set for STATUS_VOCABULARY (aliases must target these only). */
export type StatusVocabularyId = keyof typeof STATUS_VOCABULARY;

/** Normalize free-form health / breaker strings onto vocabulary keys. */
const STATUS_ALIASES: Readonly<Record<string, StatusVocabularyId>> = {
  ok: "healthy",
  success: "healthy",
  up: "healthy",
  closed: "circuit_closed",
  half_open: "circuit_half_open",
  halfopen: "circuit_half_open",
  "half-open": "circuit_half_open",
  open: "circuit_open",
  down: "offline",
  unavailable: "offline",
  failed: "error",
  failure: "error",
  warn: "warning",
  idle: "disabled",
  locked: "warning",
  unknown: "unknown",
  null: "unknown",
  undefined: "unknown",
};

/**
 * Resolve a free-form status string to a vocabulary entry.
 * Unknown ids fall back to `unknown` (neutral) — never throw.
 * Circuit breaker states often arrive UPPERCASE (`OPEN` / `HALF_OPEN` / `CLOSED`);
 * they are lowercased then alias-mapped (no separate UPPERCASE branch).
 */
export function resolveStatusVocabulary(
  status: string | null | undefined
): StatusVocabularyEntry {
  if (status == null || status === "") {
    return STATUS_VOCABULARY.unknown;
  }
  const raw = String(status).trim();
  const key = raw.toLowerCase().replace(/\s+/g, "_");

  if (Object.prototype.hasOwnProperty.call(STATUS_VOCABULARY, key)) {
    return STATUS_VOCABULARY[key as StatusVocabularyId];
  }
  if (Object.prototype.hasOwnProperty.call(STATUS_ALIASES, key)) {
    return STATUS_VOCABULARY[STATUS_ALIASES[key]];
  }

  return STATUS_VOCABULARY.unknown;
}

/** Map a status string to a shared Badge variant (backward-compatible API surface). */
export function statusToBadgeVariant(
  status: string | null | undefined
): StatusBadgeVariant {
  return resolveStatusVocabulary(status).badgeVariant;
}

/**
 * Classes for a status chip surface (bg + border + text).
 * Does **not** include glow — callers opt in via `statusGlowClass`.
 */
export function statusSurfaceClasses(status: string | null | undefined): string {
  const entry = resolveStatusVocabulary(status);
  return `${entry.bgClass} ${entry.borderClass} ${entry.textClass}`;
}

/**
 * Soft glow utility for health/breaker surfaces only.
 * Returns empty string when the vocabulary marks glow as none.
 */
export function statusGlowClass(
  status: string | null | undefined,
  enabled = true
): string {
  if (!enabled) return "";
  return resolveStatusVocabulary(status).glowClass;
}

/** Tone → StatCard accent bar utility (shared with metric tiles). */
export const STATUS_TONE_ACCENT_CLASS: Readonly<Record<StatusTone, string>> = {
  success: "bg-green-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  neutral: "bg-gray-400 dark:bg-gray-600",
  info: "bg-primary",
};
