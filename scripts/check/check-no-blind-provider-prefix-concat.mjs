#!/usr/bin/env node
/**
 * CI grep guard — Task 0176 (canonical alias normalization).
 *
 * Fails the build when a NEW site under the input-boundary surfaces blindly
 * concatenates a provider id with a model id (`${providerId}/${...}` or
 * `${provider}/${...}`) to build a dispatch model id WITHOUT going through
 * `normalizeModelForSelectedProvider` (`src/shared/utils/providerModelId.ts`).
 *
 * Scope (input boundaries only — see docs/tasks/01-open/0176):
 *   src/lib/api/ open-sse/handlers/ open-sse/executors/ open-sse/services/
 *
 * Existing sites are classified by SEMANTIC CATEGORY and allowlisted below.
 * A site that matches the forbidden literal but belongs to a legitimate
 * category (log string, media-composite market id, cache/route key, parse
 * prefix check, call-log record) is NOT a violation. Anything else is.
 *
 * Scoping to the whole codebase would produce false positives (logs, payload
 * canonicalization sites, internal ids) and erode trust in the guard.
 *
 * Usage:
 *   node scripts/check/check-no-blind-provider-prefix-concat.mjs        # soft report
 *   node scripts/check/check-no-blind-provider-prefix-concat.mjs --strict  # exit 1 on violation
 *   node scripts/check/check-no-blind-provider-prefix-concat.mjs --json     # machine-readable
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");

const ARGS = new Set(process.argv.slice(2));
const STRICT = ARGS.has("--strict");
const JSON_OUT = ARGS.has("--json");

// ---------------------------------------------------------------------------
// Input-boundary surfaces only (per Task 0176).
// ---------------------------------------------------------------------------
const SURFACES = [
  "src/lib/api/",
  "open-sse/handlers/",
  "open-sse/executors/",
  "open-sse/services/",
];

// Forbidden literal shapes: `${X}/${` where X is a provider identifier.
const FORBIDDEN = /\$\{(canonicalProviderId|providerId|provider|alias|ctx\.provider)\}\/\s*\$\{/;
const FORBIDDEN_BARE = /\$\{(canonicalProviderId|providerId|provider|alias|ctx\.provider)\}\//;

// Files where `${provider}/${model}` IS the native market composite model id
// (e.g. `fal-ai/flux`, `stability-ai/ultra`) or a call-log record of that id —
// these go upstream AS the model id, they do not re-prefix a bare model.
const MEDIA_COMPOSITE_FILES = new Set([
  "open-sse/handlers/imageGeneration.ts",
  "open-sse/handlers/imageGeneration/providers/comfyUI.ts",
  "open-sse/handlers/imageGeneration/providers/haiper.ts",
  "open-sse/handlers/imageGeneration/providers/hyperbolic.ts",
  "open-sse/handlers/imageGeneration/providers/ideogram.ts",
  "open-sse/handlers/imageGeneration/providers/imagen3.ts",
  "open-sse/handlers/imageGeneration/providers/leonardo.ts",
  "open-sse/handlers/imageGeneration/providers/sdWebUI.ts",
  "open-sse/handlers/musicGeneration.ts",
  "open-sse/handlers/videoGeneration.ts",
  "open-sse/handlers/embeddings.ts",
  "open-sse/handlers/rerank.ts",
]);

// Lines whose surrounding context marks them as logs, call-log records,
// cache/route keys, parse prefix checks, or diagnostic strings. These are the
// legitimate shapes the guard must NOT flag.
const LOG_CTX = /(?:log|ctx\.log|logger|pino)(?:\?\.|\.)\s*(?:info|warn|debug|error|trace)(?:\?\.|\.)\s*\(/;
const RECORD_CTX = /(?:saveCallLog|persistAttemptLogs|console\.(?:info|warn|error|log))\s*\(/;
const KEY_CTX = /(?:routeId|historicalKey|dedupRequestBody|providerKey|executionKey|stepId|hash|hint|prefix)\s*[:=]/;
const PARSE_CTX = /\.(?:startsWith|endsWith|indexOf|slice|split|includes|replace)\(/;
const DIAG_CTX = /(?:reason|message|error(?:Msg|Message)?)\s*[:=]|new Error\(/;

function walk(dirs, files) {
  for (const dir of dirs) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) continue;
    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
      const rel = path.join(dir, entry.name);
      if (entry.isDirectory()) walk([rel], files);
      else if (entry.name.endsWith(".ts") && !entry.name.includes(".test.")) files.push(rel);
    }
  }
}

const files = [];
walk(SURFACES, files);

const findings = [];
for (const file of files.sort()) {
  const source = fs.readFileSync(path.join(ROOT, file), "utf8");
  const lines = source.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!FORBIDDEN_BARE.test(line)) continue;

    // The helper itself is the canonical owner of prefix logic.
    if (file === "src/shared/utils/providerModelId.ts") continue;

    const lo = lines.slice(Math.max(0, i - 8), i).join("\n");
    const hi = lines.slice(i + 1, i + 5).join("\n");
    const ctx = `${lo}\n${line}\n${hi}`;

    let kind = null;
    let reason = "";
    if (MEDIA_COMPOSITE_FILES.has(file)) {
      kind = "media-composite";
      reason = "native market composite id or its call-log record (e.g. fal-ai/flux)";
    } else if (LOG_CTX.test(ctx)) {
      kind = "log";
      reason = "diagnostic log/telemetry string";
    } else if (RECORD_CTX.test(ctx)) {
      kind = "call-log";
      reason = "call-log / attempt-log record";
    } else if (KEY_CTX.test(ctx)) {
      kind = "internal-key";
      reason = "cache/route/dedup key or execution key";
    } else if (PARSE_CTX.test(ctx)) {
      kind = "parse";
      reason = "prefix checks / string parsing (not dispatch construction)";
    } else if (DIAG_CTX.test(ctx)) {
      kind = "diagnostic";
      reason = "error/reason/diagnostic string";
    } else if (FORBIDDEN.test(line)) {
      kind = "VIOLATION";
      reason = "blind provider-prefix concatenation — use normalizeModelForSelectedProvider";
    } else {
      // Bare `${provider}/` without a following `${...}` — likely a prefix
      // constant. Only flag when it feeds a model-assembly site (line ends
      // with `=`, or assigns to a model-ish variable).
      if (/(?:=|return|=>)\s*$/.test(line.trim()) || /modelStr|fullModel|modelId/.test(line)) {
        kind = "VIOLATION";
        reason = "suspicious provider-prefix concatenation — audit";
      }
    }

    findings.push({ file, line: i + 1, code: line.trim(), pattern: FORBIDDEN_BARE.source, kind, reason });
  }
}

const violations = findings.filter((f) => f.kind === "VIOLATION");

if (JSON_OUT) {
  console.log(JSON.stringify({ findings, violations: violations.length, strict: STRICT }, null, 2));
} else {
  for (const f of findings.sort((a, b) => (a.kind === "VIOLATION" ? -1 : 1))) {
    const tag = f.kind === "VIOLATION" ? "FAIL" : "ok  ";
    console.log(`${tag} ${f.file}:${f.line} [${f.kind}] ${f.reason}`);
    console.log(`      ${f.code}`);
  }
  console.log(`\n${findings.length} prefixed sites scanned; ${violations.length} violations.`);
}

if (violations.length > 0) {
  if (STRICT) {
    console.error("\n✖ Blind provider/model concatenation found — route through normalizeModelForSelectedProvider.");
    process.exit(1);
  }
  console.warn("\n⚠ violations found (soft mode). Pass --strict in CI to fail.");
}
process.exit(0);
