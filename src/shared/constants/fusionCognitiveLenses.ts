/**
 * EPIC-22 — Fusion cognitive lens catalog (SSoT).
 *
 * Operator-configured system framing for fusion panel fan-out.
 * Lenses are **not** provider `reasoning_effort` (no low/medium/high/adaptive).
 * Runtime inject is task 0109; this module is pure catalog + resolve helpers only.
 *
 * Fingerprints (`[omniroute-lens:<id>]`) are part of the public test contract —
 * change them only together with `tests/unit/fusion-cognitive-diversity.test.ts`.
 */

/** Closed Phase-1 panel lens ids (EPIC-22 D catalog). */
export const FUSION_COGNITIVE_LENS_IDS = [
  "first-principles",
  "adversarial",
  "security",
  "systems",
  "implementation",
  "skeptical-evidence",
  "custom",
] as const;

export type FusionCognitiveLensId = (typeof FUSION_COGNITIVE_LENS_IDS)[number];

/** Preset lenses only (excludes `custom`, which requires operator prose). */
export type FusionCognitivePresetLensId = Exclude<FusionCognitiveLensId, "custom">;

/** Closed Phase-1 judge mode ids (EPIC-22). Default runtime behavior = synthesize. */
export const FUSION_JUDGE_MODE_IDS = [
  "synthesize",
  "dialectical",
  "security-review",
  "pick-best",
] as const;

export type FusionJudgeModeId = (typeof FUSION_JUDGE_MODE_IDS)[number];

/**
 * Max operator prose on a fusion panel step (`systemAddon`).
 * Shared by Zod write path and Fusion editor UI (client-safe catalog).
 */
export const FUSION_SYSTEM_ADDON_MAX_CHARS = 4000;

/** Stable token embedded in each preset inject string for anti-bullshit tests. */
export function fusionLensFingerprint(id: FusionCognitiveLensId): string {
  return `[omniroute-lens:${id}]`;
}

/** Stable token for judge-mode directive tests (0109). */
export function fusionJudgeFingerprint(id: FusionJudgeModeId): string {
  return `[omniroute-judge:${id}]`;
}

const PRESET_LENS_TEXT: Readonly<Record<FusionCognitivePresetLensId, string>> = {
  "first-principles": [
    "Think from first principles. Strip inherited framing and restated assumptions;",
    "rebuild the problem from fundamentals before proposing solutions.",
    "Name which premises you accept vs discard.",
    fusionLensFingerprint("first-principles"),
  ].join(" "),
  adversarial: [
    "Act as a rigorous devil's advocate. Surface failure modes, edge cases,",
    "weak claims, and ways the proposal could be wrong or incomplete.",
    "Prefer concrete counter-examples over generic skepticism.",
    fusionLensFingerprint("adversarial"),
  ].join(" "),
  security: [
    "Review through a threat-minded security lens. Call out trust boundaries,",
    "abuse cases, auth/authz gaps, secret exposure, and exploitability.",
    "Prefer safer recommendations when tradeoffs are unclear.",
    fusionLensFingerprint("security"),
  ].join(" "),
  systems: [
    "Reason as a systems thinker. Trace second- and third-order effects,",
    "feedback loops, incentives, and unintended consequences across the stack.",
    "Make tradeoffs explicit.",
    fusionLensFingerprint("systems"),
  ].join(" "),
  implementation: [
    "Answer as a concrete builder. Prefer steps, interfaces, file/module seams,",
    "and what would actually land in a PR over abstract advice.",
    "Flag missing details that would block implementation.",
    fusionLensFingerprint("implementation"),
  ].join(" "),
  "skeptical-evidence": [
    "Separate fact, inference, and missing evidence. Flag what is unproven,",
    "what depends on unstated assumptions, and what would change your conclusion",
    "if false. Do not overclaim confidence.",
    fusionLensFingerprint("skeptical-evidence"),
  ].join(" "),
};

const JUDGE_MODE_DIRECTIVE: Readonly<Record<FusionJudgeModeId, string>> = {
  synthesize: [
    "Judge mode: synthesize. Merge consensus, resolve contradictions with judgment,",
    "preserve unique insights, and cover blind spots into one authoritative answer.",
    fusionJudgeFingerprint("synthesize"),
  ].join(" "),
  dialectical: [
    "Judge mode: dialectical. Force explicit tension between conflicting sources",
    "before synthesis — state the clash, then resolve into one final answer.",
    fusionJudgeFingerprint("dialectical"),
  ].join(" "),
  "security-review": [
    "Judge mode: security-review. Prioritize risk, exploitability, and safer",
    "recommendations over fluency when sources disagree.",
    fusionJudgeFingerprint("security-review"),
  ].join(" "),
  "pick-best": [
    "Judge mode: pick-best. Select one source's answer (cite Source N) rather than",
    "merging prose. Prefer the most correct and complete source.",
    fusionJudgeFingerprint("pick-best"),
  ].join(" "),
};

// Membership via Set avoids `as readonly string[]` casts on `.includes` (tuple
// readonly includes is not assignable from free `string` under strict checks).
const FUSION_COGNITIVE_LENS_ID_SET: ReadonlySet<string> = new Set(FUSION_COGNITIVE_LENS_IDS);
const FUSION_JUDGE_MODE_ID_SET: ReadonlySet<string> = new Set(FUSION_JUDGE_MODE_IDS);

export function isFusionCognitiveLensId(x: string): x is FusionCognitiveLensId {
  return FUSION_COGNITIVE_LENS_ID_SET.has(x);
}

export function isFusionJudgeModeId(x: string): x is FusionJudgeModeId {
  return FUSION_JUDGE_MODE_ID_SET.has(x);
}

function trimAddon(systemAddon?: string | null): string {
  if (typeof systemAddon !== "string") return "";
  return systemAddon.trim();
}

/**
 * Resolve model-facing system text for a fusion panel unit.
 *
 * Behavior (documented contract — see tests):
 * - `undefined` / empty / **unknown** mode → empty string when no addon; addon alone
 *   when addon is non-empty and mode is omit/empty (D4: addon may stand alone).
 * - Unknown **non-empty** mode id → empty string (ignore addon). Zod (0108) rejects
 *   unknowns at write time; pure resolve degrades to no-op inject.
 * - `custom` without non-empty addon → empty (no inject).
 * - `custom` + addon → trimmed addon only.
 * - Preset → catalog text; preset + addon → `preset + "\\n\\n" + addon`.
 */
export function resolvePanelLensText(
  mode: string | undefined | null,
  systemAddon?: string | null
): string {
  const addon = trimAddon(systemAddon);
  const raw = typeof mode === "string" ? mode.trim() : "";

  if (!raw) {
    return addon;
  }

  if (!isFusionCognitiveLensId(raw)) {
    return "";
  }

  if (raw === "custom") {
    return addon;
  }

  const preset = PRESET_LENS_TEXT[raw];
  if (!addon) return preset;
  return `${preset}\n\n${addon}`;
}

/**
 * Resolve pure judge-mode directive text for 0109 `buildJudgePrompt` variants.
 *
 * - omit / empty / unknown → default **synthesize** directive (matches current
 *   fusion judge spirit; fingerprint still present for tests).
 * - known id → matching directive string (includes `[omniroute-judge:<id>]`).
 */
export function resolveJudgeModeDirective(mode?: string | null): string {
  const raw = typeof mode === "string" ? mode.trim() : "";
  if (!raw || !isFusionJudgeModeId(raw)) {
    return JUDGE_MODE_DIRECTIVE.synthesize;
  }
  return JUDGE_MODE_DIRECTIVE[raw];
}

/** Default judge mode when config omits the field. */
export const FUSION_JUDGE_MODE_DEFAULT: FusionJudgeModeId = "synthesize";
