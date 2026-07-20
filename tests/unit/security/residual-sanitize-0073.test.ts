/**
 * Task 0073 — residual err.message / SSE sanitize sweep (F-SEC-W2-002…004).
 *
 * Covers:
 * - sanitizeErrorMessage strips stack frames + absolute paths (wire leaf helper)
 * - createErrorResponse / createErrorResponseFromUnknown details/message sanitize
 * - Must-fix route sources call sanitizeErrorMessage (or equivalent helpers)
 *   on client-facing catch paths (static source guard — no false zero-grep claim)
 */
import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const { sanitizeErrorMessage } = await import("../../../open-sse/utils/error.ts");
const { createErrorResponse, createErrorResponseFromUnknown } = await import(
  "../../../src/lib/api/errorResponse.ts"
);

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

// Source-extension absolute path + multi-line stack (matches sanitizeErrorMessage rules).
const LEAKY =
  "ENOENT: /tmp/secret-path/config.ts\n    at foo (/app/x.ts:1:1)";

function assertNoLeak(value: string, label: string): void {
  assert.ok(value, `${label} should be non-empty`);
  assert.ok(!value.includes("\n"), `${label} must not include multi-line stack: ${value}`);
  assert.ok(
    !value.includes("/tmp/secret-path/config.ts"),
    `${label} must not leak absolute source path: ${value}`
  );
  assert.ok(!value.includes("/app/x.ts"), `${label} must not leak stack path: ${value}`);
  assert.ok(!value.includes("at foo"), `${label} must not leak stack frame: ${value}`);
  assert.ok(
    value.includes("<path>") || value === "Internal error" || !value.includes(".ts"),
    `${label} should redact path or collapse stack: ${value}`
  );
}

// ── Helper behavior (representative wire leaf) ───────────────────────────────

test("sanitizeErrorMessage strips path+stack from leaky Error message (0073 fixture)", () => {
  const out = sanitizeErrorMessage(LEAKY);
  assertNoLeak(out, "sanitizeErrorMessage");
  // First line content survives with path redacted.
  assert.ok(out.includes("ENOENT") || out.includes("<path>"), `unexpected sanitize output: ${out}`);
});

test("createErrorResponseFromUnknown never returns stack path (0073)", async () => {
  const response = createErrorResponseFromUnknown(new Error(LEAKY));
  const body = (await response.json()) as { error?: { message?: string } };
  assert.equal(response.status, 500);
  assertNoLeak(String(body.error?.message ?? ""), "createErrorResponseFromUnknown.message");
});

test("createErrorResponse sanitizes details string leaf (exportAll/vacuum shape)", async () => {
  const response = createErrorResponse({
    status: 500,
    message: "Failed to create full export",
    details: LEAKY,
  });
  const body = (await response.json()) as {
    error?: { message?: string; details?: unknown };
  };
  assertNoLeak(String(body.error?.message ?? ""), "message");
  const details = body.error?.details;
  if (typeof details === "string") {
    assertNoLeak(details, "details");
  } else {
    const serialized = JSON.stringify(details ?? null);
    assert.ok(!serialized.includes("/tmp/secret-path"), `details leak: ${serialized}`);
    assert.ok(!serialized.includes("/app/x.ts"), `details stack leak: ${serialized}`);
  }
});

// ── Source guards for must-fix clusters ────────────────────────────────────

const MUST_FIX_FILES: ReadonlyArray<{ rel: string; requireSanitize: boolean }> = [
  // A — F-SEC-W2-002
  { rel: "src/app/api/system/version/route.ts", requireSanitize: true },
  // B — F-SEC-W2-004
  { rel: "src/app/api/db-backups/exportAll/route.ts", requireSanitize: true },
  { rel: "src/app/api/settings/database/vacuum/route.ts", requireSanitize: true },
  // C — F-SEC-W2-003 minimum named set
  { rel: "src/app/api/db/health/route.ts", requireSanitize: true },
  { rel: "src/app/api/assess/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/install/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/marketplace/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/marketplace/install/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/executions/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/[id]/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/skillssh/route.ts", requireSanitize: true },
  { rel: "src/app/api/skills/skillssh/install/route.ts", requireSanitize: true },
  { rel: "src/app/api/a2a/tasks/route.ts", requireSanitize: true },
  { rel: "src/app/api/a2a/status/route.ts", requireSanitize: true },
  { rel: "src/app/api/a2a/tasks/[id]/route.ts", requireSanitize: true },
  { rel: "src/app/api/a2a/tasks/[id]/cancel/route.ts", requireSanitize: true },
  { rel: "src/app/api/combos/test/route.ts", requireSanitize: true },
  { rel: "src/app/api/v1/agents/health/route.ts", requireSanitize: true },
  { rel: "src/app/api/v1/images/generations/route.ts", requireSanitize: true },
  { rel: "src/app/api/settings/mitm/route.ts", requireSanitize: true },
  { rel: "src/app/api/providers/agy-auth/import/route.ts", requireSanitize: true },
  { rel: "src/app/api/providers/agy-auth/apply-local/route.ts", requireSanitize: true },
  { rel: "src/app/api/tunnels/ngrok/route.ts", requireSanitize: true },
  { rel: "src/app/api/tunnels/cloudflared/route.ts", requireSanitize: true },
  { rel: "src/app/api/tunnels/tailscale/route.ts", requireSanitize: true },
  { rel: "src/app/api/tunnels/tailscale/check/route.ts", requireSanitize: true },
  // Spawn/install surfaces claimed converted in 0073 evidence (Hard Rule #12 stretch)
  { rel: "src/app/api/tunnels/tailscale/install/route.ts", requireSanitize: true },
  { rel: "src/app/api/tunnels/tailscale/start-daemon/route.ts", requireSanitize: true },
  { rel: "src/app/api/providers/agy-auth/import-bulk/route.ts", requireSanitize: true },
  { rel: "src/app/api/cli-tools/droid-settings/route.ts", requireSanitize: true },
  { rel: "src/app/api/cli-tools/smelt-settings/route.ts", requireSanitize: true },
  { rel: "src/app/api/cli-tools/cline-settings/route.ts", requireSanitize: true },
];

// Forbidden: client-facing raw error.message without sanitize wrapper on same expression.
// We flag the common anti-patterns that Wave 2 confirmed.
const FORBIDDEN_RAW_PATTERNS: ReadonlyArray<RegExp> = [
  /details:\s*error\.message/,
  /details:\s*error\s+instanceof\s+Error\s*\?\s*error\.message/,
  /message:\s*errMsg(?!\s*[,}])/, // loose; version is checked separately
  /send\(\{\s*step:\s*"error"[^}]*message:\s*err\?\.stderr/,
  /send\(\{\s*step:\s*"error"[^}]*message:\s*errMsg\s*\}\)/,
];

test("must-fix routes import sanitizeErrorMessage (or createErrorResponse helpers)", () => {
  for (const { rel, requireSanitize } of MUST_FIX_FILES) {
    const abs = path.join(REPO_ROOT, rel);
    assert.ok(fs.existsSync(abs), `missing file: ${rel}`);
    const src = fs.readFileSync(abs, "utf8");
    if (!requireSanitize) continue;
    const usesSanitize =
      src.includes("sanitizeErrorMessage") ||
      src.includes("createErrorResponseFromUnknown") ||
      src.includes("createErrorResponse(") ||
      src.includes("buildErrorBody(");
    assert.ok(usesSanitize, `${rel} must use a shared sanitizer helper`);
  }
});

test("version SSE error path sanitizes errMsg before send (F-SEC-W2-002)", () => {
  const abs = path.join(REPO_ROOT, "src/app/api/system/version/route.ts");
  const src = fs.readFileSync(abs, "utf8");
  assert.ok(src.includes("sanitizeErrorMessage"), "version route must import sanitizeErrorMessage");
  // Both catch sites must sanitize before send.
  const sendErrorMatches = src.match(/send\(\{\s*step:\s*"error"[^}]*message:\s*errMsg/g) || [];
  assert.ok(sendErrorMatches.length >= 2, "expected two SSE error send sites");
  // errMsg assignment must go through sanitizeErrorMessage.
  assert.match(
    src,
    /const errMsg\s*=\s*\n?\s*sanitizeErrorMessage\(/,
    "errMsg must be assigned from sanitizeErrorMessage(...)"
  );
  // Raw stderr must not be sent without sanitize.
  assert.ok(
    !/send\(\{[^}]*message:\s*err\?\.stderr/.test(src),
    "must not send raw err.stderr"
  );
});

test("exportAll and vacuum sanitize details leaf (F-SEC-W2-004)", () => {
  for (const rel of [
    "src/app/api/db-backups/exportAll/route.ts",
    "src/app/api/settings/database/vacuum/route.ts",
  ]) {
    const src = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    assert.ok(src.includes("sanitizeErrorMessage"), `${rel} missing sanitizeErrorMessage`);
    assert.ok(
      !/details:\s*error\.message/.test(src),
      `${rel} still has raw details: error.message`
    );
    assert.ok(
      /details:\s*sanitizeErrorMessage|sanitizeErrorMessage\([\s\S]*?\)[\s\S]*?details/.test(src) ||
        src.includes("const details = sanitizeErrorMessage"),
      `${rel} details must pass through sanitizeErrorMessage`
    );
  }
});

test("must-fix routes do not reintroduce raw Wave-2 anti-patterns", () => {
  for (const { rel } of MUST_FIX_FILES) {
    const src = fs.readFileSync(path.join(REPO_ROOT, rel), "utf8");
    for (const re of FORBIDDEN_RAW_PATTERNS) {
      // version route intentionally builds errMsg then send — skip the errMsg send pattern there
      // once errMsg is sanitized (covered by dedicated test).
      if (rel.endsWith("system/version/route.ts") && re.source.includes("message:\\s*errMsg")) {
        continue;
      }
      assert.ok(!re.test(src), `${rel} matches forbidden pattern ${re}`);
    }
  }
});

test("agents health provider error field is sanitized", () => {
  const src = fs.readFileSync(
    path.join(REPO_ROOT, "src/app/api/v1/agents/health/route.ts"),
    "utf8"
  );
  // checkProviderHealth catch must sanitize.
  assert.match(
    src,
    /error:\s*\n?\s*sanitizeErrorMessage\(/,
    "provider health error field must use sanitizeErrorMessage"
  );
});
