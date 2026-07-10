/**
 * Fusion combo strategy — parallel panel + judge synthesis.
 *
 * A fusion combo fans the prompt out to every panel model in parallel, then a
 * configurable judge model synthesizes one final answer from all panel responses.
 *
 *   - quorum-grace collection caps the straggler penalty (the slowest model
 *     otherwise dominates wall time);
 *   - anonymized sources prevent judge brand-bias ("Source N" rather than model name);
 *   - degrades to a direct answer on a single survivor, 503 on total failure.
 *
 * Per OpenRouter's Fusion design, the judge does NOT merge — it analyzes
 * (consensus / contradictions / partial coverage / unique insights / blind spots)
 * then writes one answer grounded in that analysis. Most of fusion's quality lift
 * comes from this synthesis step.
 *
 * Ported from upstream decolua/9router (Daniil Schovkunov), adapted JS → TS and
 * wired through OmniRoute's existing combo schema (combo.config.judgeModel /
 * combo.config.fusionTuning).
 */
import { errorResponse, sanitizeErrorMessage } from "../utils/error.ts";
import { extractTextContent } from "../translator/helpers/geminiHelper.ts";
import {
  normalizeComboModels,
  normalizeComboStep,
  type ComboStep,
} from "../../src/lib/combos/steps.ts";
import {
  MAX_COMBO_DEPTH,
  MAX_GLOBAL_ATTEMPTS,
} from "./combo/comboPredicates.ts";
import type {
  ComboCollectionLike,
  ComboLike,
  ComboLogger,
  ComboNestingContext,
  HandleComboChatOptions,
  HandleSingleModel,
} from "./combo/types.ts";

// Fusion tuning. Overridable per-combo via combo.config.fusionTuning.
export const FUSION_DEFAULTS = {
  minPanel: 2, // answers needed before stragglers get a grace window
  stragglerGraceMs: 8000, // wait this long for laggards once quorum is reached
  panelHardTimeoutMs: 90000, // absolute cap so one hung model can't stall forever
} as const;

export type FusionTuning = {
  minPanel?: number;
  stragglerGraceMs?: number;
  panelHardTimeoutMs?: number;
};

type Body = Record<string, unknown>;

/**
 * Extract assistant text from a non-stream completion across formats
 * (OpenAI chat, Claude messages, Gemini, OpenAI Responses). Returns "" if none.
 * Panel responses are already translated to the client format by chatCore, so the
 * leaf content → string step reuses the translator's own extractTextContent.
 */
export function extractPanelText(json: unknown): string {
  if (!json || typeof json !== "object") return "";
  const j = json as Record<string, unknown>;

  // OpenAI chat completion
  const choices = j.choices as Array<Record<string, unknown>> | undefined;
  const choice = choices?.[0];
  if (choice) {
    const msg = (choice.message ?? choice.delta ?? {}) as Record<string, unknown>;
    const t = extractTextContent(msg.content);
    if (t.trim()) return t;
    if (typeof choice.text === "string" && choice.text.trim()) return choice.text;
  }

  // Claude messages (text blocks share OpenAI's {type:"text"} shape)
  const claudeText = extractTextContent(j.content);
  if (claudeText.trim()) return claudeText;

  // Gemini (parts carry .text without a type discriminator)
  const candidates = j.candidates as Array<Record<string, unknown>> | undefined;
  const parts = (candidates?.[0]?.content as Record<string, unknown> | undefined)?.parts as
    | Array<{ text?: unknown }>
    | undefined;
  if (Array.isArray(parts)) {
    const t = parts.map((p) => (typeof p?.text === "string" ? p.text : "")).join("");
    if (t.trim()) return t;
  }

  // OpenAI Responses API
  const output = j.output as Array<Record<string, unknown>> | undefined;
  if (Array.isArray(output)) {
    const t = output
      .flatMap((o) =>
        Array.isArray(o.content)
          ? (o.content as Array<{ text?: unknown }>).map((c) =>
              typeof c?.text === "string" ? c.text : ""
            )
          : []
      )
      .join("");
    if (t.trim()) return t;
  }

  return "";
}

/**
 * Append a synthesized user turn to whichever message array the request format uses.
 * Preserves the original conversation + system prompt so the judge has full context.
 */
export function appendUserTurn(body: Body, text: string): Body {
  const next: Body = { ...body };
  if (Array.isArray(body.messages)) {
    next.messages = [...(body.messages as unknown[]), { role: "user", content: text }];
  } else if (Array.isArray(body.input)) {
    next.input = [...(body.input as unknown[]), { role: "user", content: text }];
  } else if (Array.isArray(body.contents)) {
    next.contents = [
      ...(body.contents as unknown[]),
      { role: "user", parts: [{ text }] },
    ];
  } else {
    next.messages = [{ role: "user", content: text }];
  }
  return next;
}

/**
 * Build the judge directive. Sources are anonymized ("Source N") so the judge
 * weighs substance, not the reputation of a model brand.
 */
export function buildJudgePrompt(answers: Array<{ text: string }>): string {
  const panel = answers.map((a, i) => `[Source ${i + 1}]\n${a.text}`).join("\n\n");

  return [
    `You are the JUDGE in a model-fusion panel. ${answers.length} expert models independently answered the user's most recent request. Their responses are below, anonymized by source.`,
    "",
    "Do NOT mention that multiple models were used, and do NOT refer to the sources. Produce ONE authoritative final answer addressed directly to the user.",
    "",
    "First, internally analyze the panel along these dimensions: consensus (points most sources agree on — treat as higher-confidence), contradictions (where they disagree — resolve with your own judgment), partial coverage, unique insights only one source surfaced, and blind spots every source missed. Then write the best possible final answer grounded in that analysis — more complete and correct than any single response, with no filler.",
    "",
    "=== PANEL RESPONSES ===",
    panel,
    "=== END PANEL RESPONSES ===",
    "",
    "Now write the final answer to the user's original request.",
  ].join("\n");
}

/**
 * Build the handoff prompt that gives the Acting unit the judge's review
 * (Epic 0004 / A3: append-user-turn). Acting is the final voice — it should
 * incorporate the review and respond to the user, not re-run a panel fusion.
 */
export function buildActingHandoffPrompt(reviewText: string): string {
  const review = typeof reviewText === "string" ? reviewText.trim() : "";
  return [
    "A fusion review panel independently analyzed the user's most recent request and produced the review below.",
    "You are the ACTING model: incorporate the review, then produce the final answer or continue the task for the user.",
    "Do NOT mention the fusion panel, the judge, or that a review was injected. Address the user directly.",
    "Prefer the review when it improves correctness or completeness; use your own judgment where the review is weak or incomplete.",
    "",
    "=== FUSION REVIEW ===",
    review || "(empty review)",
    "=== END FUSION REVIEW ===",
    "",
    "Continue from here with the best final response for the user.",
  ].join("\n");
}

type Sentinel = { __timeout?: true; __error?: unknown };

// Resolve a Response (or sentinel) within ms; the loser keeps running but is ignored.
function withTimeout(
  promise: Promise<Response>,
  ms: number
): Promise<Response | Sentinel> {
  return new Promise((resolve) => {
    const t = setTimeout(() => resolve({ __timeout: true }), ms);
    Promise.resolve(promise)
      .then((v) => {
        clearTimeout(t);
        resolve(v);
      })
      .catch((e) => {
        clearTimeout(t);
        resolve({ __error: e });
      });
  });
}

/**
 * Collect panel responses with quorum-grace: as soon as `minPanel` calls succeed,
 * start a short grace timer for the rest, then proceed with whatever arrived. This
 * caps the straggler penalty while still preferring a full panel when everyone is
 * fast. Bounded by a hard timeout.
 *
 * Returns a sparse array aligned to `calls` (undefined = not yet / dropped).
 */
export function collectPanel(
  calls: Array<Promise<Response | Sentinel>>,
  cfg: { minPanel: number; stragglerGraceMs: number; panelHardTimeoutMs: number }
): Promise<Array<Response | Sentinel | undefined>> {
  return new Promise((resolve) => {
    const out: Array<Response | Sentinel | undefined> = new Array(calls.length);
    let settled = 0;
    let ok = 0;
    let finished = false;
    let graceTimer: ReturnType<typeof setTimeout> | null = null;
    const finish = () => {
      if (finished) return;
      finished = true;
      clearTimeout(hardTimer);
      if (graceTimer) clearTimeout(graceTimer);
      resolve(out);
    };
    const hardTimer = setTimeout(finish, cfg.panelHardTimeoutMs);
    calls.forEach((p, i) => {
      Promise.resolve(p)
        .then((v) => {
          out[i] = v;
        })
        .catch((e) => {
          out[i] = { __error: e };
        })
        .finally(() => {
          settled++;
          const slot = out[i] as Response | undefined;
          if (slot && (slot as Response).ok) ok++;
          if (settled === calls.length) return finish();
          if (ok >= cfg.minPanel && !graceTimer) {
            graceTimer = setTimeout(finish, cfg.stragglerGraceMs);
          }
        });
    });
  });
}

export type HandleFusionChatOptions = {
  body: Body;
  models: string[];
  handleSingleModel: HandleSingleModel;
  log: ComboLogger;
  comboName?: string;
  judgeModel?: string | null;
  tuning?: FusionTuning | null;
};

/**
 * Resolved panel/judge unit for Fusion First-Class (Epic 0003 §5.3).
 * Resolved by resolveFusionUnits (Task 0011); dispatch lands in Tasks 0012–0013.
 */
export type ResolvedFusionUnit =
  | { kind: "model"; model: string; label?: string }
  | { kind: "combo-ref"; comboName: string; label?: string };

/**
 * V2 fusion options: panels + judge as ResolvedFusionUnit (model | combo-ref).
 * Live runtime API for multi-unit dispatch (Task 0012). Legacy string callers
 * continue through handleFusionChat → handleFusionChatV2.
 */
export type HandleFusionChatOptionsV2 = {
  body: Body;
  panels: ResolvedFusionUnit[];
  judge: ResolvedFusionUnit;
  /**
   * Optional acting unit (Epic 0004 / A1–A5). When set:
   * - after judge synthesizes a review, the review is appended and acting is
   *   dispatched with the original client stream/tools (acting is final voice);
   * - on single-survivor degrade, acting still owns the final response if set
   *   (survivor text is handed off as review context).
   * When absent, judge (or survivor) remains the final voice (Epic 0003 compat).
   */
  acting?: ResolvedFusionUnit | null;
  handleSingleModel: HandleSingleModel;
  handleComboChat?: (opts: HandleComboChatOptions) => Promise<Response>;
  allCombos?: ComboCollectionLike;
  nesting?: ComboNestingContext | null;
  log: ComboLogger;
  comboName?: string;
  tuning?: FusionTuning;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value);
}

function getCombosList(allCombos: ComboCollectionLike): ComboLike[] {
  const combos = Array.isArray(allCombos) ? allCombos : allCombos?.combos || [];
  return combos.filter(
    (combo): combo is ComboLike => isRecord(combo) && typeof combo.name === "string"
  );
}

function findComboByName(allCombos: ComboCollectionLike, name: string): ComboLike | null {
  return getCombosList(allCombos).find((combo) => combo.name === name) || null;
}

/** Human-readable label for logs (model id or combo:name). */
function fusionUnitLabel(unit: ResolvedFusionUnit): string {
  return unit.kind === "combo-ref" ? `combo:${unit.comboName}` : unit.model;
}

function fusionUnitNeedsComboChat(unit: ResolvedFusionUnit): boolean {
  return unit.kind === "combo-ref";
}

/**
 * Default nesting when the caller (combo.ts Task 0013) has not yet threaded
 * a ComboNestingContext. Mirrors combo.ts root nesting construction.
 */
function defaultFusionNesting(comboName?: string): ComboNestingContext {
  return {
    depth: 0,
    maxDepth: MAX_COMBO_DEPTH,
    visitedComboNames: comboName ? [comboName] : [],
    rootComboName: comboName ?? "",
    attemptBudget: { count: 0, limit: MAX_GLOBAL_ATTEMPTS },
  };
}

/**
 * Depth + cycle guards for nested combo-ref panels/judge.
 * Equivalent to runtimeUnits.buildChildNestingContext (not exported there).
 */
function buildFusionChildNesting(args: {
  context: ComboNestingContext;
  childComboName: string;
}): ComboNestingContext | Response {
  if (args.context.depth >= args.context.maxDepth) {
    return errorResponse(503, `Max combo nesting depth (${args.context.maxDepth}) exceeded`);
  }
  if (args.context.visitedComboNames.includes(args.childComboName)) {
    return errorResponse(503, `Circular combo reference detected: ${args.childComboName}`);
  }
  return {
    ...args.context,
    depth: args.context.depth + 1,
    visitedComboNames: [...args.context.visitedComboNames, args.childComboName],
  };
}

/**
 * Dispatch one fusion unit (panel or judge).
 * - kind model → handleSingleModel
 * - kind combo-ref → handleComboChat with child nesting (Decision D3: reuse combo failover)
 *
 * Fusion owns panelHardTimeout via withTimeout at the call site — child combos
 * must not stack an extra top-level fusion timeout.
 */
async function dispatchFusionUnit(args: {
  body: Body;
  unit: ResolvedFusionUnit;
  handleSingleModel: HandleSingleModel;
  handleComboChat?: (opts: HandleComboChatOptions) => Promise<Response>;
  allCombos?: ComboCollectionLike;
  nesting: ComboNestingContext;
  log: ComboLogger;
}): Promise<Response> {
  const { body, unit, handleSingleModel, handleComboChat, allCombos, nesting, log } = args;

  if (unit.kind === "model") {
    return handleSingleModel(body, unit.model);
  }

  // kind === "combo-ref"
  if (!handleComboChat) {
    return errorResponse(400, "Fusion combo-ref unit requires handleComboChat");
  }
  if (!allCombos) {
    return errorResponse(503, `Nested combo "${unit.comboName}" not found`);
  }
  const childCombo = findComboByName(allCombos, unit.comboName);
  if (!childCombo) {
    return errorResponse(503, `Nested combo "${unit.comboName}" not found`);
  }
  const childNesting = buildFusionChildNesting({
    context: nesting,
    childComboName: childCombo.name,
  });
  if (childNesting instanceof Response) return childNesting;

  log.debug?.(
    "FUSION",
    `Dispatching combo-ref unit combo:${unit.comboName} depth=${childNesting.depth}`
  );

  return handleComboChat({
    body,
    combo: childCombo,
    handleSingleModel,
    log,
    allCombos,
    nesting: childNesting,
  });
}

/**
 * Map a normalized ComboStep onto the fusion unit shape used by S1–S3.
 * Drops weight/id/provider fields that fusion dispatch does not need.
 */
function comboStepToFusionUnit(step: ComboStep): ResolvedFusionUnit {
  if (step.kind === "combo-ref") {
    return {
      kind: "combo-ref",
      comboName: step.comboName,
      ...(step.label ? { label: step.label } : {}),
    };
  }
  return {
    kind: "model",
    model: step.model,
    ...(step.label ? { label: step.label } : {}),
  };
}

/**
 * Resolve the fusion judge unit (Decision D1).
 * Precedence: data.judge → config.judgeModel → first panel.
 * Never infers judge from a panel step role — judge is a separate field.
 */
function resolveJudgeUnit(
  rawJudge: unknown,
  judgeModel: unknown,
  panels: ResolvedFusionUnit[],
  options: { comboName?: string; allCombos?: ComboCollectionLike }
): ResolvedFusionUnit {
  if (rawJudge !== undefined && rawJudge !== null) {
    const step = normalizeComboStep(rawJudge, {
      comboName: options.comboName,
      index: 0,
      allCombos: options.allCombos,
    });
    if (step) return comboStepToFusionUnit(step);
  }

  if (typeof judgeModel === "string" && judgeModel.trim()) {
    const step = normalizeComboStep(judgeModel.trim(), {
      comboName: options.comboName,
      index: 0,
      allCombos: options.allCombos,
    });
    if (step) return comboStepToFusionUnit(step);
  }

  if (panels.length > 0) return panels[0];
  // Empty panel + no explicit judge: typed placeholder; dispatch rejects empty panels.
  return { kind: "model", model: "" };
}

/**
 * Resolve optional top-level acting unit (Epic 0004 / A4).
 * Accepts the same comboModelEntry shapes as judge. Returns null when absent/invalid.
 */
function resolveActingUnit(
  rawActing: unknown,
  options: { comboName?: string; allCombos?: ComboCollectionLike }
): ResolvedFusionUnit | null {
  if (rawActing === undefined || rawActing === null) return null;
  const step = normalizeComboStep(rawActing, {
    comboName: options.comboName,
    index: 0,
    allCombos: options.allCombos,
  });
  if (!step) return null;
  const unit = comboStepToFusionUnit(step);
  // Empty model string is not a usable acting unit.
  if (unit.kind === "model" && !unit.model.trim()) return null;
  if (unit.kind === "combo-ref" && !unit.comboName.trim()) return null;
  return unit;
}

/**
 * Convert raw combo data (models + optional top-level judge / config.judgeModel
 * + optional top-level acting) into typed fusion units. No dispatch.
 *
 * Reuses normalizeComboModels / normalizeComboStep (Decision D2 comboModelEntry reuse).
 * Judge precedence: data.judge → config.judgeModel → first panel (Decision D1).
 * Acting: data.acting only (Decision A4 / A8 — never inferred from panels).
 */
export function resolveFusionUnits(
  combo: ComboLike,
  allCombos?: ComboCollectionLike
): {
  panels: ResolvedFusionUnit[];
  judge: ResolvedFusionUnit;
  acting: ResolvedFusionUnit | null;
} {
  const comboName = typeof combo.name === "string" ? combo.name : undefined;
  const steps = normalizeComboModels(combo.models, { comboName, allCombos });
  const panels = steps.map(comboStepToFusionUnit);

  const config =
    combo.config && typeof combo.config === "object" && !Array.isArray(combo.config)
      ? (combo.config as Record<string, unknown>)
      : null;

  const judge = resolveJudgeUnit(combo.judge, config?.judgeModel, panels, {
    comboName,
    allCombos,
  });

  const acting = resolveActingUnit(combo.acting, { comboName, allCombos });

  return { panels, judge, acting };
}

/**
 * Multi-unit fusion runtime (Task 0012 / Epic 0003 S2).
 *
 * Fans the prompt to every panel unit in parallel (model → handleSingleModel,
 * combo-ref → handleComboChat with nesting), then dispatches the judge the same
 * way. Panel body ownership (Decision D9): fusion builds panelBody once with
 * stream:false + tool_choice:"none" and tools KEPT; child combos receive that
 * body as-is and must not re-strip tools.
 *
 * Decision D3: combo-ref units reuse handleComboChat for failover — fusion does
 * not reimplement retry. Fusion owns panelHardTimeoutMs via withTimeout only.
 *
 * Degrades: 0 answers → 503, 1 answer → re-dispatch that unit with original body.
 */
/**
 * After panels produce prose (or a single survivor), optionally hand the review
 * to the acting unit as the final voice (Epic 0004 / A1, A3).
 * When acting is absent, returns the provided finalResponse as-is (legacy).
 */
async function finalizeWithActing(args: {
  body: Body;
  reviewText: string;
  acting: ResolvedFusionUnit | null | undefined;
  finalWithoutActing: () => Promise<Response>;
  handleSingleModel: HandleSingleModel;
  handleComboChat?: (opts: HandleComboChatOptions) => Promise<Response>;
  allCombos?: ComboCollectionLike;
  nesting: ComboNestingContext;
  log: ComboLogger;
}): Promise<Response> {
  if (!args.acting) {
    return args.finalWithoutActing();
  }

  const actingLabel = fusionUnitLabel(args.acting);
  if (fusionUnitNeedsComboChat(args.acting) && !args.handleComboChat) {
    return errorResponse(400, "Fusion combo-ref acting requires handleComboChat");
  }

  const actingBody = appendUserTurn(args.body, buildActingHandoffPrompt(args.reviewText));
  args.log.info("FUSION", `Handing review to acting unit ${actingLabel}`);
  return dispatchFusionUnit({
    body: actingBody,
    unit: args.acting,
    handleSingleModel: args.handleSingleModel,
    handleComboChat: args.handleComboChat,
    allCombos: args.allCombos,
    nesting: args.nesting,
    log: args.log,
  });
}

export async function handleFusionChatV2({
  body,
  panels,
  judge,
  acting,
  handleSingleModel,
  handleComboChat,
  allCombos,
  nesting,
  log,
  comboName,
  tuning,
}: HandleFusionChatOptionsV2): Promise<Response> {
  const panel = Array.isArray(panels) ? panels.filter(Boolean) : [];
  if (panel.length === 0) {
    return errorResponse(400, "Fusion combo has no models");
  }

  const actingUnit = acting ?? null;
  const needsComboChat =
    panel.some(fusionUnitNeedsComboChat) ||
    fusionUnitNeedsComboChat(judge) ||
    (actingUnit ? fusionUnitNeedsComboChat(actingUnit) : false);
  if (needsComboChat && !handleComboChat) {
    return errorResponse(
      400,
      "Fusion combo-ref panel/judge/acting requires handleComboChat"
    );
  }

  // A single-unit fusion has nothing to fuse — answer via that unit directly,
  // unless acting is set (then hand survivor text to acting as final voice).
  if (panel.length === 1) {
    const nestingCtx = nesting ?? defaultFusionNesting(comboName);
    if (!actingUnit) {
      return dispatchFusionUnit({
        body,
        unit: panel[0],
        handleSingleModel,
        handleComboChat,
        allCombos,
        nesting: nestingCtx,
        log,
      });
    }
    // Collect the single panel answer as review context, then hand to acting.
    const singleRes = await dispatchFusionUnit({
      body: { ...body, stream: false, tool_choice: "none" },
      unit: panel[0],
      handleSingleModel,
      handleComboChat,
      allCombos,
      nesting: nestingCtx,
      log,
    });
    let reviewText = "";
    if (singleRes.ok) {
      try {
        const json = await singleRes.clone().json();
        reviewText = extractPanelText(json);
      } catch {
        reviewText = "";
      }
    }
    return finalizeWithActing({
      body,
      reviewText: reviewText || "(panel produced no text)",
      acting: actingUnit,
      finalWithoutActing: async () =>
        dispatchFusionUnit({
          body,
          unit: panel[0],
          handleSingleModel,
          handleComboChat,
          allCombos,
          nesting: nestingCtx,
          log,
        }),
      handleSingleModel,
      handleComboChat,
      allCombos,
      nesting: nestingCtx,
      log,
    });
  }

  const cfg = {
    minPanel: tuning?.minPanel ?? FUSION_DEFAULTS.minPanel,
    stragglerGraceMs: tuning?.stragglerGraceMs ?? FUSION_DEFAULTS.stragglerGraceMs,
    panelHardTimeoutMs: tuning?.panelHardTimeoutMs ?? FUSION_DEFAULTS.panelHardTimeoutMs,
  };
  const minPanel = Math.min(Math.max(2, cfg.minPanel), panel.length);
  const nestingCtx = nesting ?? defaultFusionNesting(comboName);
  const panelLabels = panel.map(fusionUnitLabel);
  const judgeLabel = fusionUnitLabel(judge);
  const actingLabel = actingUnit ? fusionUnitLabel(actingUnit) : null;
  log.info(
    "FUSION",
    `Combo "${comboName ?? ""}" | panel=${panel.length} [${panelLabels.join(", ")}] | judge=${judgeLabel}${actingLabel ? ` | acting=${actingLabel}` : ""} | quorum=${minPanel}`
  );

  // 1. Fan out to the panel in parallel: non-streaming, tool_choice = "none".
  //    Keep tools in the body so panel models understand tool_call messages in
  //    the conversation history — without tool definitions those messages look
  //    like malformed context and models respond with ~130‑char refusals.
  //    Setting tool_choice to "none" prevents the panel from calling tools
  //    itself; the judge handles synthesis (and tool calls) from panel prose.
  //
  //    Panel body ownership: fusion constructs panelBody once. Child combo-ref
  //    panels receive this already-transformed body and MUST NOT re-strip tools.
  const { tool_choice: _tc, ...rest } = body;
  void _tc;
  const panelBody: Body = { ...rest, stream: false, tool_choice: "none" };
  const t0 = Date.now();
  const calls = panel.map((unit) =>
    withTimeout(
      dispatchFusionUnit({
        body: panelBody,
        unit,
        handleSingleModel,
        handleComboChat,
        allCombos,
        nesting: nestingCtx,
        log,
      }),
      cfg.panelHardTimeoutMs
    )
  );
  const settled = await collectPanel(calls, { ...cfg, minPanel });
  log.info("FUSION", `fan-out collected in ${Date.now() - t0}ms`);

  // 2. Collect successful answers (aligned to panel units).
  const answers: Array<{ unit: ResolvedFusionUnit; model: string; text: string }> = [];
  for (let i = 0; i < settled.length; i++) {
    const res = settled[i];
    const unit = panel[i];
    const label = fusionUnitLabel(unit);
    if (!res) {
      log.warn("FUSION", `Panel ${label} dropped (straggler/timeout)`);
      continue;
    }
    const sentinel = res as Sentinel;
    if (sentinel.__timeout) {
      log.warn("FUSION", `Panel ${label} timed out`);
      continue;
    }
    if (sentinel.__error) {
      log.warn("FUSION", `Panel ${label} threw`, {
        error: sanitizeErrorMessage(sentinel.__error as Error),
      });
      continue;
    }
    const resp = res as Response;
    if (!resp.ok) {
      log.warn("FUSION", `Panel ${label} failed`, { status: resp.status });
      continue;
    }
    try {
      const json = await resp.clone().json();
      const text = extractPanelText(json);
      if (text) {
        answers.push({ unit, model: label, text });
        log.info("FUSION", `Panel ${label} ok (${text.length} chars)`);
      } else {
        log.warn("FUSION", `Panel ${label} returned empty content`);
      }
    } catch (e) {
      log.warn("FUSION", `Panel ${label} unparseable`, {
        error: sanitizeErrorMessage(e as Error),
      });
    }
  }

  // 3. Degrade gracefully when the panel is too thin to fuse.
  if (answers.length === 0) {
    log.warn("FUSION", "All panel models failed");
    return errorResponse(503, "All fusion panel models failed");
  }
  if (answers.length === 1) {
    log.info(
      "FUSION",
      `Only ${answers[0].model} succeeded — ${actingUnit ? "handing to acting" : "answering directly"} (no multi-panel fusion)`
    );
    return finalizeWithActing({
      body,
      reviewText: answers[0].text,
      acting: actingUnit,
      finalWithoutActing: async () =>
        dispatchFusionUnit({
          body,
          unit: answers[0].unit,
          handleSingleModel,
          handleComboChat,
          allCombos,
          nesting: nestingCtx,
          log,
        }),
      handleSingleModel,
      handleComboChat,
      allCombos,
      nesting: nestingCtx,
      log,
    });
  }

  // 4. Judge analyzes + writes a synthesis (internal when acting is set).
  //    Judge body is non-streaming so we can extract text for the acting handoff.
  //    Without acting, judge streams/returns to the client (legacy Epic 0003).
  if (actingUnit) {
    const judgeBody: Body = {
      ...appendUserTurn(body, buildJudgePrompt(answers)),
      stream: false,
      tool_choice: "none",
    };
    log.info("FUSION", `Judging ${answers.length} answers with ${judgeLabel} (for acting handoff)`);
    const judgeRes = await dispatchFusionUnit({
      body: judgeBody,
      unit: judge,
      handleSingleModel,
      handleComboChat,
      allCombos,
      nesting: nestingCtx,
      log,
    });
    let reviewText = "";
    if (judgeRes.ok) {
      try {
        const json = await judgeRes.clone().json();
        reviewText = extractPanelText(json);
      } catch {
        reviewText = "";
      }
    }
    if (!reviewText) {
      // Judge failed — fall back to concatenating panel answers as review.
      reviewText = answers.map((a, i) => `[Source ${i + 1}]\n${a.text}`).join("\n\n");
      log.warn(
        "FUSION",
        `Judge ${judgeLabel} produced no text (status=${judgeRes.status}) — using panel texts as review for acting`
      );
    }
    return finalizeWithActing({
      body,
      reviewText,
      acting: actingUnit,
      finalWithoutActing: async () => judgeRes,
      handleSingleModel,
      handleComboChat,
      allCombos,
      nesting: nestingCtx,
      log,
    });
  }

  // Legacy path (no acting): judge is the final voice.
  const judgeBody = appendUserTurn(body, buildJudgePrompt(answers));
  log.info("FUSION", `Judging ${answers.length} answers with ${judgeLabel}`);
  return dispatchFusionUnit({
    body: judgeBody,
    unit: judge,
    handleSingleModel,
    handleComboChat,
    allCombos,
    nesting: nestingCtx,
    log,
  });
}

/**
 * Legacy string-only fusion entry point. Maps models/judgeModel → ResolvedFusionUnit
 * and delegates to handleFusionChatV2 so combo.ts callers stay unchanged until Task 0013.
 */
export async function handleFusionChat({
  body,
  models,
  handleSingleModel,
  log,
  comboName,
  judgeModel,
  tuning,
}: HandleFusionChatOptions): Promise<Response> {
  const panelModels = Array.isArray(models) ? models.filter(Boolean) : [];
  const panels: ResolvedFusionUnit[] = panelModels.map((model) => ({
    kind: "model" as const,
    model,
  }));
  const judge: ResolvedFusionUnit =
    judgeModel && judgeModel.trim()
      ? { kind: "model", model: judgeModel.trim() }
      : panels[0] ?? { kind: "model", model: "" };

  return handleFusionChatV2({
    body,
    panels,
    judge,
    handleSingleModel,
    log,
    comboName,
    tuning: tuning ?? undefined,
  });
}
