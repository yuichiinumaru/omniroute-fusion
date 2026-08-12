import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
  ABSORPTION_SCHEMA_VERSION,
  CLASSIFICATIONS,
  RISK_LEVELS,
  SUGGESTED_ACTIONS,
  buildReport,
  formatTriageMarkdown,
  runCli,
} from "../../bin/cli/provider-absorption.mjs";

// ── Fixture builders (canonical Task 0152 diff shape only — no provider sources) ──

function makeDiff(overrides = {}) {
  return {
    metadata: {
      schemaVersion: 1,
      forkRoot: ".",
      referenceRoot: "references/diegosouzapw-omniroute",
      generatedAt: "2026-08-11T12:00:00.000Z",
      snapshotCaveat:
        "The reference directory (references/diegosouzapw-omniroute) is a static snapshot, not live upstream.",
      caveat: "Static snapshot (will be redacted below).",
    },
    summary: {
      forkTotal: 242,
      referenceTotal: 299,
      forkOnly: 0,
      referenceOnly: 0,
      common: 172,
      changed: 0,
    },
    classifications: { fork_only: [], reference_only: [], common: [], changed: [] },
    ...overrides,
  };
}

function makeChangedRow(id, overrides = {}) {
  const { catalogDiff = null, registryDiff = null, modelDiff = { added: [], removed: [], modified: [] } } = overrides;
  const fork = {
    id,
    inCatalog: true,
    inRegistry: true,
    isOrphan: false,
    isCatalogOnly: false,
    catalog: { id, name: id, category: "api-key" },
    registry: {
      id,
      alias: null,
      format: "openai",
      executor: "default",
      authType: "apikey",
      baseUrl: null,
      passthroughModels: false,
      models: [],
    },
  };
  const reference = JSON.parse(JSON.stringify(fork));
  return { id, fork, reference, catalogDiff, registryDiff, modelDiff };
}

function makeBucketRow(id, kind) {
  const catalog = { id, name: id, category: "api-key" };
  const registry = {
    id,
    alias: null,
    format: "openai",
    executor: "default",
    authType: "apikey",
    baseUrl: null,
    passthroughModels: false,
    models: [],
  };
  if (kind === "catalog-only") {
    return { id, inCatalog: true, inRegistry: false, isOrphan: false, isCatalogOnly: true, catalog, registry: null };
  }
  if (kind === "registry-only") {
    return { id, inCatalog: false, inRegistry: true, isOrphan: true, isCatalogOnly: false, catalog: null, registry };
  }
  return { id, inCatalog: true, inRegistry: true, isOrphan: false, isCatalogOnly: false, catalog, registry };
}

function writeDiffToScratch(prefix, diff) {
  const dir = mkdtempSync(join(tmpdir(), `omni-absorb-${prefix}-`));
  const file = join(dir, "diff.json");
  writeFileSync(file, JSON.stringify(diff), "utf-8");
  return { dir, file };
}

function fingerprintTree(root) {
  const out = [];
  const walk = (dir, rel) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    )) {
      const full = join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) walk(full, relPath);
      else if (entry.isFile()) {
        const st = statSync(full);
        out.push(`${relPath}:${st.size}:${st.mtimeMs}`);
      }
    }
  };
  walk(root, root);
  return out;
}

const stripGeneratedAt = (text) =>
  text.replace(/"generatedAt":\s*"[^"]+"/g, '"generatedAt":"<ISO>"');


// ── Classification taxonomy ───────────────────────────────────────────────

test("metadata-only changes classify as metadata-only with low risk and ignore action", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("alibaba", {
      catalogDiff: {
        name: { fork: "Alibaba", reference: "Alibaba Cloud Model Studio" },
        website: { fork: "https://old.example", reference: "https://new.example" },
      },
    }),
  ];
  const report = buildReport(diff);
  assert.equal(report.differences.length, 1);
  const row = report.differences[0];
  assert.equal(row.id, "alibaba");
  assert.equal(row.classification, "metadata-only");
  assert.equal(row.risk, "low");
  assert.equal(row.suggestedAction, "ignore");
  assert.equal(row.manualReviewRequired, false);
  assert.ok(row.confidence >= 0.8, `metadata confidence should be high, got ${row.confidence}`);
  assert.ok(row.evidencePaths.includes("$.classifications.changed[?].catalogDiff.name"));
});

test("model-only additions/removals are separated from provider identity changes", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("agy", {
      modelDiff: {
        added: [{ id: "model-x", name: "Model X", contextLength: 128000 }],
        removed: [{ id: "model-y", name: "Model Y", contextLength: 64000 }],
        modified: [],
      },
    }),
  ];
  const report = buildReport(diff);
  const row = report.differences[0];
  assert.equal(row.classification, "model-only");
  assert.equal(row.risk, "low");
  assert.equal(row.suggestedAction, "inspect");
  assert.deepEqual(row.tags, ["model-only"]);
  assert.ok(row.tags.every((t) => t !== "provider-addition-candidate"));
  assert.ok(row.evidencePaths.includes("$.classifications.changed[?].modelDiff.added"));
  assert.ok(row.evidencePaths.includes("$.classifications.changed[?].modelDiff.removed"));
});

test("a combined model + executor change classifies executor-format-change and keeps the model-only tag", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("nebius", {
      registryDiff: { executor: { fork: "default", reference: "vertex" } },
      modelDiff: { added: [{ id: "model-z" }], removed: [], modified: [] },
    }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "executor-format-change");
  assert.ok(row.tags.includes("model-only"), "model changes must remain visible as a tag");
  assert.equal(row.risk, "high");
  assert.equal(row.manualReviewRequired, true);
});

test("an upstream-only provider with only catalog metadata is a manual-review candidate, never auto-applied", () => {
  const diff = makeDiff();
  diff.classifications.reference_only = [makeBucketRow("adobe-firefly", "catalog-only")];
  diff.classifications.changed = [];
  const report = buildReport(diff);
  const row = report.differences[0];
  assert.equal(row.classification, "provider-addition-candidate");
  assert.equal(row.risk, "medium");
  assert.equal(row.suggestedAction, "create-implementation-task");
  assert.equal(row.manualReviewRequired, true);
  assert.ok(row.evidencePaths.includes("$.classifications.reference_only[?]"));
  // The report must never claim the provider is safe to absorb automatically.
  assert.ok(!JSON.stringify(report).includes("auto-apply"), "report must not contain an auto-apply claim");
});

test("fork-only rows classify as provider-removal-candidate with manual review", () => {
  const diff = makeDiff();
  diff.classifications.fork_only = [makeBucketRow("cablyai", "registry-only")];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "provider-removal-candidate");
  assert.equal(row.suggestedAction, "create-implementation-task");
  assert.equal(row.manualReviewRequired, true);
});

test("executor change is high risk and requires manual review", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("xai", { registryDiff: { executor: { fork: "default", reference: "openai-compatible" } } }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "executor-format-change");
  assert.equal(row.risk, "high");
  assert.equal(row.manualReviewRequired, true);
});

test("target format change is high risk and requires manual review", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("pollinations", { registryDiff: { format: { fork: "openai", reference: "anthropic" } } }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "executor-format-change");
  assert.equal(row.risk, "high");
});

test("OAuth authType change classifies security-sensitive with high risk", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("kiro", { registryDiff: { authType: { fork: "apikey", reference: "oauth" } } }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "security-sensitive");
  assert.ok(row.tags.includes("auth-change"));
  assert.equal(row.risk, "high");
  assert.equal(row.suggestedAction, "create-security-auth-review");
  assert.equal(row.manualReviewRequired, true);
});

test("plain authType change (apikey to optional) classifies security-sensitive with high risk", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("ovhcloud", { registryDiff: { authType: { fork: "apikey", reference: "optional" } } }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "security-sensitive");
  assert.equal(row.risk, "high");
  assert.equal(row.suggestedAction, "create-security-auth-review");
  assert.equal(row.manualReviewRequired, true);
  assert.ok(row.tags.includes("auth-change"));
});

test("baseUrl host change classifies security-sensitive without echoing the URL", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("liquid", {
      registryDiff: { baseUrl: { fork: "https://api.old-host.example/v1", reference: "https://api.new-host.example/v1" } },
    }),
  ];
  const report = buildReport(diff);
  const row = report.differences[0];
  assert.equal(row.classification, "security-sensitive");
  assert.equal(row.risk, "high");
  assert.equal(row.suggestedAction, "create-security-auth-review");
  const text = JSON.stringify(report) + formatTriageMarkdown(report);
  assert.ok(!text.includes("old-host.example"), "URL must not be echoed");
  assert.ok(!text.includes("new-host.example"), "URL must not be echoed");
});

test("security-sensitive beats executor-format-change when both apply", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("siliconflow", {
      registryDiff: {
        authType: { fork: "apikey", reference: "web-cookie" },
        executor: { fork: "default", reference: "curl" },
      },
    }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "security-sensitive");
  assert.ok(row.tags.includes("executor-format-change"));
});

test("alias change retains old/new ids and the source evidence path", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("qwen", {
      catalogDiff: { alias: { fork: "qwen-old", reference: "qwen-new" } },
    }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "alias-change");
  assert.deepEqual(row.oldIds, ["qwen-old"]);
  assert.deepEqual(row.newIds, ["qwen-new"]);
  assert.ok(row.evidencePaths.includes("$.classifications.changed[?].catalogDiff.alias"));
  assert.equal(row.suggestedAction, "update-allowlist");
  assert.equal(row.manualReviewRequired, true);
});

test("registry presence-only diff is unresolved with low confidence", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("mystery-provider", {
      registryDiff: { presence: { fork: true, reference: false } },
    }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "unresolved-manual-review");
  assert.ok(row.confidence <= 0.5, `presence-only confidence must be low, got ${row.confidence}`);
  assert.equal(row.manualReviewRequired, true);
});

test("unknown diff field is unresolved and never silently ignored", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("future-provider", {
      registryDiff: { mysteriousField: { fork: "a", reference: "b" } },
    }),
  ];
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "unresolved-manual-review");
  assert.ok(row.reasons.join(" ").includes("mysteriousField"));
  assert.ok(row.evidencePaths.includes("$.classifications.changed[?].registryDiff.mysteriousField"));
});

// ── Provenance: stale snapshot & unresolved ───────────────────────────────

test("stale snapshot (old generatedAt) classifies rows stale-snapshot and lowers confidence", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("agy", {
      modelDiff: { added: [{ id: "model-x" }], removed: [], modified: [] },
    }),
  ];
  diff.metadata.generatedAt = "2024-01-01T00:00:00.000Z"; // ~950 days old

  const fresh = buildReport(makeDiffFromSameRow());
  const stale = buildReport(diff, { maxAgeDays: 30 });

  const freshRow = fresh.differences[0];
  const staleRow = stale.differences[0];
  assert.equal(stale.metadata.stale.detected, true);
  assert.equal(staleRow.classification, "stale-snapshot", "stale rows must be classified stale-snapshot");
  assert.ok(staleRow.confidence < freshRow.confidence, "stale provenance must lower confidence");
  assert.ok(staleRow.tags.includes("model-only"), "content category must remain visible as a tag");

  function makeDiffFromSameRow() {
    const d2 = makeDiff();
    d2.classifications.changed = [
      makeChangedRow("agy", { modelDiff: { added: [{ id: "model-x" }], removed: [], modified: [] } }),
    ];
    return d2;
  }
});

test("missing generatedAt marks provenance unresolved and lowers confidence", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("agy", {
      modelDiff: { added: [{ id: "model-x" }], removed: [], modified: [] } }),
  ];
  delete diff.metadata.generatedAt;
  const report = buildReport(diff);
  assert.equal(report.metadata.stale.unresolvedProvenance, true);
  assert.ok(report.metadata.stale.detected);
  assert.ok(report.differences[0].confidence <= 0.5, "unresolved provenance must lower confidence");
  assert.ok(
    report.differences[0].reasons.join(" ").toLowerCase().includes("provenance"),
    "missing provenance must be called out in the reasons"
  );
});

test("fresh snapshot keeps content classification and full confidence", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("agy", { modelDiff: { added: [{ id: "model-x" }], removed: [], modified: [] } }),
  ];
  const report = buildReport(diff);
  assert.equal(report.metadata.stale.detected, false);
  assert.equal(report.metadata.stale.unresolvedProvenance, false);
  assert.equal(report.differences[0].classification, "model-only");
});

// ── Fail-closed input handling ────────────────────────────────────────────

test("missing diff file fails closed with empty stdout and diagnostic on stderr", async () => {
  const result = await runCli(["--diff-json", "/definitely/not/a/real/diff-file.json"]);
  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  assert.ok(result.stderr.includes("Error:"));
});

test("malformed diff JSON fails closed without echoing content", async () => {
  const { dir, file } = writeDiffToScratch("malformed", {});
  try {
    writeFileSync(file, "{ this is not json !!!", "utf-8");
    const result = await runCli(["--diff-json", file]);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.includes("not valid JSON"));
    assert.ok(!result.stderr.includes("this is not json"), "malformed content must not be echoed");
  } finally {
    rmScratch(dir);
  }
});

test("wrong diff shape fails closed with a sanitized diagnostic", async () => {
  const { dir, file } = writeDiffToScratch("shape", { ok: true });
  try {
    const result = await runCli(["--diff-json", file]);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.includes("diff") || result.stderr.includes("schema"));
  } finally {
    rmScratch(dir);
  }
});

test("unsupported schemaVersion fails closed instead of being consumed silently", async () => {
  const diff = makeDiff();
  diff.metadata.schemaVersion = 99;
  const { dir, file } = writeDiffToScratch("version", diff);
  try {
    const result = await runCli(["--diff-json", file]);
    assert.equal(result.exitCode, 1);
    assert.ok(result.stderr.includes("schemaVersion"));
  } finally {
    rmScratch(dir);
  }
});

test("empty diff (no differences) produces a valid zero-difference report", async () => {
  const diff = makeDiff();
  diff.classifications.common = [{ id: "openai" }, { id: "anthropic" }];
  const report = buildReport(diff);
  assert.equal(report.summary.totalDifferences, 0);
  assert.equal(report.summary.commonIgnored, 2);
  assert.deepEqual(report.differences, []);
  const json = JSON.stringify(report);
  assert.ok(json.includes('"byClassification"'), "summary must carry the classification histogram");
});

// ── CLI flags & read-only guarantees ──────────────────────────────────────

test("--diff-json requires a value and never swallows the next flag", async () => {
  for (const args of [["--diff-json"], ["--diff-json", "--format"]]) {
    const result = await runCli(args);
    assert.equal(result.exitCode, 1);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.includes("--diff-json"));
  }
});

test("write/apply/mutate flags are forbidden and rejected as read-only violations", async () => {
  for (const flag of ["--apply", "--write", "--mutate", "--create-task", "--create-tasklist"]) {
    const result = await runCli([flag]);
    assert.equal(result.exitCode, 1, `${flag} must be rejected`);
    assert.equal(result.stdout, "");
    assert.ok(result.stderr.toLowerCase().includes("read-only"), `${flag} diagnostic must state read-only`);
  }
});

test("stdin input is supported via --diff-json -", async () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("agy", { modelDiff: { added: [{ id: "model-x" }], removed: [], modified: [] } }),
  ];
  const result = await runCli(["--diff-json", "-"], { stdin: JSON.stringify(diff) });
  assert.equal(result.exitCode, 0, result.stderr);
  const report = JSON.parse(result.stdout);
  assert.equal(report.differences[0].classification, "model-only");
});

test("CLI never writes files: scratch tree fingerprint unchanged across json and markdown runs", async () => {
  const diff = makeDiff();
  diff.classifications.reference_only = [makeBucketRow("adobe-firefly", "catalog-only")];
  diff.classifications.changed = [
    makeChangedRow("agi", { registryDiff: { authType: { fork: "apikey", reference: "oauth" } } }),
  ];
  const { dir, file } = writeDiffToScratch("readonly", diff);
  try {
    const before = fingerprintTree(dir);
    for (const fmt of ["json", "markdown"]) {
      const result = await runCli(["--diff-json", file, "--format", fmt]);
      assert.equal(result.exitCode, 0, result.stderr);
    }
    const after = fingerprintTree(dir);
    assert.deepEqual(after, before, "the CLI must not create or mutate any file");
  } finally {
    rmScratch(dir);
  }
});

// ── Determinism & redaction ───────────────────────────────────────────────

test("output is deterministic and sorted apart from generatedAt", async () => {
  const diff = makeDiff();
  diff.classifications.reference_only = [
    makeBucketRow("zeta", "catalog-only"),
    makeBucketRow("alpha", "catalog-only"),
  ];
  diff.classifications.changed = [
    makeChangedRow("mike", { registryDiff: { executor: { fork: "default", reference: "vertex" } } }),
    makeChangedRow("bravo", {
      catalogDiff: { name: { fork: "Bravo", reference: "Bravo Cloud" } },
    }),
  ];
  const { dir, file } = writeDiffToScratch("determinism", diff);
  try {
    const r1 = await runCli(["--diff-json", file]);
    const r2 = await runCli(["--diff-json", file]);
    assert.equal(r1.exitCode, 0);
    const normalized1 = stripGeneratedAt(r1.stdout);
    const normalized2 = stripGeneratedAt(r2.stdout);
    assert.equal(normalized1, normalized2, "two runs must be byte-identical apart from generatedAt");
    const report = JSON.parse(r1.stdout);
    const ids = report.differences.map((d) => d.id);
    const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert.deepEqual(ids, sorted, "difference rows must be sorted byte-stable by id");
    for (const d of report.differences) {
      const arrs = [d.tags, d.reasons, d.evidencePaths, d.oldIds, d.newIds];
      for (const arr of arrs) {
        const copy = [...arr].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
        assert.deepEqual(arr, copy, `row ${d.id} arrays must be sorted`);
      }
    }
  } finally {
    rmScratch(dir);
  }
});

test("token-shaped and cookie-shaped values are redacted from json and markdown output", async () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("secret-provider", {
      registryDiff: {
        baseUrl: {
          fork: "https://user:sk-secret-token-abc123@api.example.com/v1",
          reference: "https://api.example.com/v1",
        },
      },
    }),
  ];
  diff.metadata.caveat = "Snapshot hint: eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U is a JWT-shaped value.";
  diff.classifications.reference_only = [
    {
      id: "cookie-provider",
      inCatalog: true,
      inRegistry: false,
      isOrphan: false,
      isCatalogOnly: true,
      catalog: { id: "cookie-provider", name: "Cookied Provider", category: "web-cookie" },
      registry: null,
    },
  ];
  const { dir, file } = writeDiffToScratch("redact", diff);
  try {
    const jsonResult = await runCli(["--diff-json", file]);
    const mdResult = await runCli(["--diff-json", file, "--format", "markdown"]);
    for (const result of [jsonResult, mdResult]) {
      assert.equal(result.exitCode, 0, result.stderr);
      const text = result.stdout;
      assert.ok(!text.includes("sk-secret-token-abc123"), "api-key-shaped secret must not appear");
      assert.ok(!text.includes("eyJhbGciOiJIUzI1NiJ9"), "JWT-shaped value must not appear");
      assert.ok(!text.includes("dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"), "JWT signature must not appear");
      assert.ok(!text.includes("api.example.com"), "URL must not be echoed");
    }
    const report = JSON.parse(jsonResult.stdout);
    assert.ok(report.metadata.redaction.redactionsApplied >= 1, "redaction counter must be positive");
    assert.ok(report.metadata.redaction.inputTokenShapedValues >= 1, "input scan must detect token-shaped values");
    assert.ok(report.metadata.redaction.withheldValueEmissions >= 1, "baseUrl delta must be withheld from output");
  } finally {
    rmScratch(dir);
  }
});

test("metadata-only rows carry a non-empty tags array (contract gap regression)", () => {
  // SAFETY: a pure catalog-metadata change (no model/registry/security/executor
  // touch) must still emit tags.length > 0. Before the fix this row left `tags`
  // empty, violating the documented schema contract that every difference row
  // carries at least one content-category tag. This is the exact gap the general
  // "full documented schema contract" test missed because it never exercised a
  // metadata-only row.
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("baidu", {
      catalogDiff: {
        website: { fork: "https://old.example", reference: "https://new.example" },
      },
    }),
  ];
  const report = buildReport(diff);
  const row = report.differences[0];
  assert.equal(row.classification, "metadata-only");
  assert.equal(row.risk, "low");
  assert.equal(row.suggestedAction, "ignore");
  assert.ok(Array.isArray(row.tags), "tags must be an array");
  assert.ok(row.tags.length > 0, "metadata-only row must carry at least one tag");
  assert.ok(
    row.tags.includes("metadata-only"),
    `metadata-only row tag must reflect content category, got ${JSON.stringify(row.tags)}`
  );
});

test("every difference row carries the full documented schema contract", () => {
  const diff = makeDiff();
  diff.classifications.reference_only = [makeBucketRow("alpha", "catalog-only")];
  diff.classifications.fork_only = [makeBucketRow("beta", "registry-only")];
  diff.classifications.changed = [
    makeChangedRow("gamma", { registryDiff: { authType: { fork: "apikey", reference: "oauth" } } }),
    makeChangedRow("delta", { catalogDiff: { alias: { fork: "d-old", reference: "d-new" } } }),
    makeChangedRow("epsilon", {
      modelDiff: { added: [{ id: "m1" }], removed: [], modified: [] },
    }),
  ];
  const report = buildReport(diff);
  for (const row of report.differences) {
    assert.ok(typeof row.id === "string" && row.id.length > 0, "row.id");
    assert.ok(CLASSIFICATIONS.includes(row.classification), `classification ${row.classification}`);
    assert.ok(RISK_LEVELS.includes(row.risk), `risk ${row.risk}`);
    assert.ok(typeof row.confidence === "number" && row.confidence >= 0 && row.confidence <= 1);
    assert.ok(Array.isArray(row.reasons) && row.reasons.length > 0, "reasons");
    assert.ok(Array.isArray(row.evidencePaths) && row.evidencePaths.length > 0, "evidencePaths");
    assert.ok(SUGGESTED_ACTIONS.includes(row.suggestedAction), `suggestedAction ${row.suggestedAction}`);
    assert.ok(typeof row.manualReviewRequired === "boolean");
    assert.ok(Array.isArray(row.tags) && row.tags.length > 0, "tags");
    assert.ok(row.provenance.bucket, "provenance.bucket");
    assert.equal(row.provenance.snapshot, true, "reference evidence is a static snapshot");
    assert.ok(Array.isArray(row.provenance.sourceRoots), "provenance.sourceRoots");
    assert.ok(Array.isArray(row.oldIds) && Array.isArray(row.newIds), "oldIds/newIds arrays");
  }
  const gamma = report.differences.find((d) => d.id === "gamma");
  assert.equal(gamma.risk, "high");
  const delta = report.differences.find((d) => d.id === "delta");
  assert.equal(delta.classification, "alias-change");
  const epsilon = report.differences.find((d) => d.id === "epsilon");
  assert.equal(epsilon.classification, "model-only");
  const alpha = report.differences.find((d) => d.id === "alpha");
  assert.equal(alpha.classification, "provider-addition-candidate");
  const beta = report.differences.find((d) => d.id === "beta");
  assert.equal(beta.classification, "provider-removal-candidate");
});

test("markdown report includes snapshot caveat, summary table, and per-row detail", async () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("agy", {
      registryDiff: { authType: { fork: "apikey", reference: "oauth" } },
      modelDiff: { added: [{ id: "model-x" }], removed: [], modified: [] },
    }),
  ];
  const { dir, file } = writeDiffToScratch("md", diff);
  try {
    const result = await runCli(["--diff-json", file, "--format", "markdown"]);
    assert.equal(result.exitCode, 0, result.stderr);
    assert.ok(result.stdout.includes("static snapshot"));
    assert.ok(result.stdout.includes("security-sensitive"));
    assert.ok(result.stdout.includes("Suggested Action"));
    assert.ok(result.stdout.includes("create-security-auth-review"));
    assert.ok(result.stdout.includes("model-only"));
  } finally {
    rmScratch(dir);
  }
});

test("schema version constant matches the consumed 0152 contract", () => {
  assert.equal(ABSORPTION_SCHEMA_VERSION, 1);
  assert.equal(ABSORPTION_SCHEMA_VERSION, JSON.parse(JSON.stringify({ v: 1 })).v);
});

test("real fork/reference smoke: snapshot caveat, non-empty report, classification histogram sums to differences", () => {
  const fixture = "tmp/agent-work/0153/real-0152-diff.json";
  if (!existsSync(fixture)) {
    return; // Skip if the staged smoke fixture is missing.
  }
  const diff = JSON.parse(readFileSync(fixture, "utf-8"));
  const report = buildReport(diff);
  assert.ok(report.metadata.snapshotCaveat.includes("static snapshot"),
    "real smoke must carry the snapshot caveat");
  assert.ok(report.summary.totalDifferences > 0, "real smoke must produce a non-empty report");
  assert.ok(report.differences.length === report.summary.totalDifferences);
  const sum = Object.values(report.summary.byClassification).reduce((a, b) => a + b, 0);
  assert.equal(sum, report.summary.totalDifferences,
    "classification histogram must sum to the total differences");
  // Real fixtures must never produce a literal "auto-apply" assertion in any row.
  for (const d of report.differences) {
    assert.ok(!d.suggestedAction.includes("apply"), `no auto-apply suggested action: ${d.id}`);
    assert.ok(typeof d.provenance.snapshot === "boolean");
    assert.ok(d.provenance.sourceRoots.length === 2);
  }
});

// ── F1 regression/sabotage: required metadata redaction (snapshotCaveat) ──

test("F1: Bearer token in required metadata.snapshotCaveat is redacted from JSON and Markdown output", () => {
  // SABOTAGE: a required provenance field carries a token-shaped value. Before
  // the fix, validateDiff extracted snapshotCaveat from the original (unredacted)
  // diff and the report emitted the literal token. The fix redacts metadata
  // BEFORE extraction.
  const diff = makeDiff();
  diff.metadata.snapshotCaveat = "snapshot Bearer super-secret-token-12345";
  const report = buildReport(diff);
  const json = JSON.stringify(report);
  const md = formatTriageMarkdown(report);
  assert.ok(!report.metadata.snapshotCaveat.includes("super-secret-token-12345"),
    "snapshotCaveat must not leak the token");
  assert.ok(!json.includes("super-secret-token-12345"), "token must not appear in JSON");
  assert.ok(!md.includes("super-secret-token-12345"), "token must not appear in Markdown");
  // The caveat must remain useful (the non-token prefix survives inline scrub).
  assert.ok(report.metadata.snapshotCaveat.includes("snapshot"),
    "non-token provenance text must be preserved");
  assert.ok(report.metadata.redaction.inputTokenShapedValues >= 1,
    "token-shaped value must be counted");
});

test("F1: urlCredentials-shaped referenceRoot is sanitized before emission", () => {
  const diff = makeDiff();
  diff.metadata.referenceRoot = "https://user:sk-secret-token-abc123@api.example.com/ref";
  const report = buildReport(diff);
  const json = JSON.stringify(report);
  assert.ok(!json.includes("sk-secret-token-abc123"),
    "token-shaped referenceRoot must not leak");
  assert.ok(!report.metadata.referenceRoot.includes("sk-secret-token-abc123"));
});

// ── F2 regression: source-file evidence preservation ──

test("F2: changed row preserves redacted catalog/registry sourceFile evidence", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("agy", { catalogDiff: { name: { fork: "A", reference: "A2" } } }),
  ];
  // Inject sourceFile into fork/reference nested catalog+registry (0152 shape).
  diff.classifications.changed[0].fork.catalog.sourceFile = "src/shared/constants/providers/oauth.ts";
  diff.classifications.changed[0].fork.registry.sourceFile = "open-sse/config/providers/registry/agy/index.ts";
  diff.classifications.changed[0].reference.catalog.sourceFile = "references/diegosouzapw-omniroute/src/shared/constants/providers/oauth.ts";
  diff.classifications.changed[0].reference.registry.sourceFile = "references/diegosouzapw-omniroute/open-sse/config/providers/registry/agy/index.ts";
  const report = buildReport(diff);
  const row = report.differences[0];
  assert.ok(Array.isArray(row.evidenceFiles), "evidenceFiles must be an array");
  assert.ok(row.evidenceFiles.length > 0, "changed row must carry source-file evidence");
  assert.ok(row.evidenceFiles.includes("src/shared/constants/providers/oauth.ts"));
  assert.ok(row.evidenceFiles.includes("open-sse/config/providers/registry/agy/index.ts"));
  // Source-file values must NOT leak secrets (token-shaped path segments redacted).
  assert.ok(row.evidenceFiles.every((f) => !f.includes("sk-secret-token-abc123")));
});

test("F2: alias change preserves old/new ids AND the source evidence path", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("qwen", { catalogDiff: { alias: { fork: "qwen-old", reference: "qwen-new" } } }),
  ];
  diff.classifications.changed[0].fork.catalog.sourceFile = "src/shared/constants/providers/oauth.ts";
  diff.classifications.changed[0].reference.catalog.sourceFile = "references/diegosouzapw-omniroute/src/shared/constants/providers/oauth.ts";
  const row = buildReport(diff).differences[0];
  assert.equal(row.classification, "alias-change");
  assert.deepEqual(row.oldIds, ["qwen-old"]);
  assert.deepEqual(row.newIds, ["qwen-new"]);
  assert.ok(row.evidenceFiles.includes("src/shared/constants/providers/oauth.ts"),
    "alias row must preserve the catalog source path");
});

// ── F3 regression: explicit auth/OAuth/security-sensitive taxonomy ──

test("F3: every security-sensitive row carries an explicit security-sensitive tag", () => {
  const diff = makeDiff();
  diff.classifications.changed = [
    makeChangedRow("kiro", { registryDiff: { authType: { fork: "apikey", reference: "oauth" } } }),
    makeChangedRow("liquid", { registryDiff: { baseUrl: { fork: "https://old.example/v1", reference: "https://new.example/v1" } } }),
  ];
  const report = buildReport(diff);
  for (const row of report.differences) {
    assert.equal(row.classification, "security-sensitive");
    assert.ok(row.tags.includes("security-sensitive"),
      `row ${row.id} must carry security-sensitive tag, got ${JSON.stringify(row.tags)}`);
  }
  // auth rows carry auth-change; baseUrl-only rows do NOT (taxonomy is explicit).
  const kiro = report.differences.find((d) => d.id === "kiro");
  const liquid = report.differences.find((d) => d.id === "liquid");
  assert.ok(kiro.tags.includes("auth-change"), "auth row must carry auth-change");
  assert.ok(!liquid.tags.includes("auth-change"), "baseUrl-only row must NOT carry auth-change");
  assert.ok(liquid.tags.includes("baseUrl-change"), "baseUrl row must carry baseUrl-change");
});

// ── F4 regression: stale provenance interpolation + consistent bucket policy ──

test("F4: stale unresolved provenance renders no literal ${} placeholder in Markdown", () => {
  // SABOTAGE: the unresolved-stale branch used a double-quoted string, so
  // ${meta.stale.maxAgeDays} rendered literally instead of interpolating.
  const diff = makeDiff();
  diff.metadata.generatedAt = "not-a-valid-date";
  diff.classifications.changed = [
    makeChangedRow("z", { catalogDiff: { name: { fork: "Z", reference: "Z2" } } }),
  ];
  const report = buildReport(diff);
  const md = formatTriageMarkdown(report);
  assert.ok(md.includes("Stale Provenance"), "stale provenance line must be present");
  assert.ok(!md.includes("${meta.stale.maxAgeDays}"),
    "no literal ${} placeholder may appear");
  assert.ok(md.includes(`${report.metadata.stale.maxAgeDays}-day cap`),
    "maxAgeDays value must be interpolated");
});

test("F4: stale bucket rows reclassify to stale-snapshot (consistent with changed rows)", () => {
  // The stale policy must be deterministic across all buckets: a stale snapshot
  // reclassifies EVERY row (changed or presence-only) to stale-snapshot.
  const diff = makeDiff();
  diff.metadata.generatedAt = "2020-01-01T00:00:00.000Z"; // ~2400 days old
  diff.classifications.reference_only = [makeBucketRow("new-prov", "catalog-only")];
  diff.classifications.fork_only = [makeBucketRow("old-prov", "registry-only")];
  const report = buildReport(diff, { maxAgeDays: 90 });
  const addRow = report.differences.find((d) => d.id === "new-prov");
  const remRow = report.differences.find((d) => d.id === "old-prov");
  assert.equal(addRow.classification, "stale-snapshot",
    "stale reference_only must reclassify to stale-snapshot");
  assert.equal(remRow.classification, "stale-snapshot",
    "stale fork_only must reclassify to stale-snapshot");
  assert.ok(addRow.manualReviewRequired && remRow.manualReviewRequired);
});

// ── F6 regression/sabotage: absolute path normalization ──

test("F6: absolute forkRoot/referenceRoot normalize to safe [external] form in JSON and Markdown", () => {
  // REGRESSION: an absolute host path in metadata roots must never be emitted
  // verbatim. It must collapse to a deterministic [external]/<basename> form.
  const diff = makeDiff();
  diff.metadata.forkRoot = "/home/sephiroth/work/omniroute";
  diff.metadata.referenceRoot = "/tmp/reference";
  const report = buildReport(diff);
  const json = JSON.stringify(report);
  const md = formatTriageMarkdown(report);
  // Roots are normalized, not leaked.
  assert.equal(report.metadata.forkRoot, "[external]/omniroute");
  assert.equal(report.metadata.referenceRoot, "[external]/reference");
  assert.deepEqual(report.differences.length, 0);
  // No host-specific absolute prefix may appear anywhere in either output.
  for (const text of [json, md]) {
    assert.ok(!text.includes("/home/"), "must not leak /home/ paths");
    assert.ok(!text.includes("/tmp/"), "must not leak /tmp/ paths");
    assert.ok(!text.includes("\\"), "must not leak backslash paths");
    assert.ok(!/[A-Za-z]:[\\/]/.test(text), "must not leak Windows drive-letter paths");
  }
  // provenance.sourceRoots mirrors the normalized display roots.
  // (No differences here, but metadata roots are the source of truth.)
});

test("F6: absolute source-file paths relativize under known roots or map to [external]", () => {
  // REGRESSION: a source file under a known root strips to repo-relative; a
  // source file outside every known root maps to [external]/<basename>.
  const diff = makeDiff();
  diff.metadata.forkRoot = "/home/sephiroth/work/omniroute";
  diff.metadata.referenceRoot = "/tmp/reference";
  diff.classifications.changed = [
    makeChangedRow("agy", { catalogDiff: { name: { fork: "A", reference: "A2" } } }),
  ];
  // Under forkRoot → repo-relative.
  diff.classifications.changed[0].fork.catalog.sourceFile =
    "/home/sephiroth/work/omniroute/src/shared/constants/providers/oauth.ts";
  // Outside every known root → [external].
  diff.classifications.changed[0].fork.registry.sourceFile =
    "/home/sephiroth/src/providers.ts";
  // Under referenceRoot → repo-relative.
  diff.classifications.changed[0].reference.catalog.sourceFile =
    "/tmp/reference/open-sse/config/providers/registry/agy/index.ts";
  // Outside every known root (Windows-absolute shaped) → [external].
  diff.classifications.changed[0].reference.registry.sourceFile =
    "C:\\Users\\sephiroth\\src\\win.ts";
  const report = buildReport(diff);
  const row = report.differences[0];
  assert.ok(row.evidenceFiles.includes("src/shared/constants/providers/oauth.ts"),
    "file under forkRoot must strip to repo-relative");
  assert.ok(row.evidenceFiles.includes("open-sse/config/providers/registry/agy/index.ts"),
    "file under referenceRoot must strip to repo-relative");
  assert.ok(row.evidenceFiles.includes("[external]/providers.ts"),
    "external file must map to [external]/<basename>");
  assert.ok(row.evidenceFiles.includes("[external]/win.ts"),
    "Windows-absolute file must map to [external]/<basename>");
  const json = JSON.stringify(report);
  const md = formatTriageMarkdown(report);
  for (const text of [json, md]) {
    assert.ok(!text.includes("/home/"), "must not leak /home/ paths");
    assert.ok(!text.includes("/tmp/"), "must not leak /tmp/ paths");
    assert.ok(!text.includes("C:\\"), "must not leak Windows drive-letter paths");
    assert.ok(!text.includes("C:/"), "must not leak Windows drive-letter paths");
  }
});

test("F6: Unix /tmp Windows drive-letter and backslash absolute paths never leak (sabotage)", () => {
  // SABOTAGE: if normalization were disabled, every value below would leak a
  // host-specific absolute path into JSON and Markdown. The assertions prove
  // the normalization pass catches all four absolute-path shapes.
  const diff = makeDiff();
  diff.metadata.forkRoot = "/home/sephiroth/work/omniroute";
  diff.metadata.referenceRoot = "/tmp/reference";
  diff.classifications.changed = [
    makeChangedRow("agy", { catalogDiff: { name: { fork: "A", reference: "A2" } } }),
  ];
  diff.classifications.changed[0].fork.catalog.sourceFile = "/home/sephiroth/src/providers.ts";
  diff.classifications.changed[0].fork.registry.sourceFile = "/tmp/registry.ts";
  diff.classifications.changed[0].reference.catalog.sourceFile =
    "C:\\Users\\sephiroth\\src\\win.ts";
  diff.classifications.changed[0].reference.registry.sourceFile =
    "\\\\server\\share\\file.ts";
  diff.classifications.reference_only = [
    {
      id: "ext-prov",
      inCatalog: true,
      inRegistry: false,
      isOrphan: false,
      isCatalogOnly: true,
      catalog: {
        id: "ext-prov",
        name: "Ext",
        category: "api-key",
        sourceFile: "/etc/providers/ext.ts",
      },
      registry: null,
    },
  ];
  const report = buildReport(diff);
  const json = JSON.stringify(report);
  const md = formatTriageMarkdown(report);
  for (const text of [json, md]) {
    assert.ok(!text.includes("/home/"), "must not leak /home/ paths");
    assert.ok(!text.includes("/tmp/"), "must not leak /tmp/ paths");
    assert.ok(!text.includes("/etc/"), "must not leak /etc/ paths");
    assert.ok(!text.includes("C:\\"), "must not leak Windows drive-letter paths");
    assert.ok(!text.includes("C:/"), "must not leak Windows drive-letter paths");
    assert.ok(!text.includes("\\\\"), "must not leak UNC/backslash paths");
    assert.ok(!text.includes("\\"), "must not leak any backslash");
  }
  // Every emitted path is either repo-relative or [external]/... — never absolute.
  const allPaths = [
    report.metadata.forkRoot,
    report.metadata.referenceRoot,
    ...report.differences.flatMap((d) => d.evidenceFiles),
  ];
  for (const p of allPaths) {
    assert.ok(!/^\//.test(p), `no emitted path may be Unix-absolute: ${p}`);
    assert.ok(!/^[A-Za-z]:[\\/]/.test(p), `no emitted path may be Windows-absolute: ${p}`);
    assert.ok(!/^\\/.test(p), `no emitted path may be backslash-absolute: ${p}`);
  }
});

// Cleanup helper used by scratch-root tests.
function rmScratch(dir) {
  rmSync(dir, { recursive: true, force: true });
}
