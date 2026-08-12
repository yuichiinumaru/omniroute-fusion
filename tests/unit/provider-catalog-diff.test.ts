import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { test } from "node:test";
import {
  compareProviderInventories,
  loadAvailableProviders,
  loadProviderInventory,
  loadRuntimeProviders,
  PROVIDER_INVENTORY_SCHEMA_VERSION,
} from "../../bin/cli/provider-catalog.mjs";
import {
  formatDiffMarkdown,
  formatInventoryMarkdown,
  runCli,
} from "../../bin/cli/provider-catalog-diff.mjs";

const REFERENCE_ROOT = "references/diegosouzapw-omniroute";

/** Create an isolated scratch root; callers must clean it up. */
function makeScratchRoot(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `omniroute-${prefix}-`));
}

/** Recursively fingerprint a directory tree as `relPath:size:mtimeMs` entries. */
function fingerprintTree(root: string): string[] {
  if (!existsSync(resolve(root))) return [];
  const out: string[] = [];
  const walk = (dir: string, rel: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true }).sort((a, b) =>
      a.name < b.name ? -1 : a.name > b.name ? 1 : 0
    )) {
      const full = join(dir, entry.name);
      const relPath = rel ? `${rel}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        walk(full, relPath);
      } else if (entry.isFile()) {
        const st = statSync(full);
        out.push(`${relPath}:${st.size}:${st.mtimeMs}`);
      }
    }
  };
  walk(root, root);
  return out;
}

test("loadAvailableProviders extracts UI catalog from fork root deterministically", () => {
  const catalog = loadAvailableProviders({ rootDir: "." });
  assert.ok(Array.isArray(catalog), "catalog should be an array");
  assert.ok(catalog.length > 50, `expected >50 providers in fork catalog, got ${catalog.length}`);

  // Check deterministic sorting
  const ids = catalog.map((p) => p.id);
  const sortedIds = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(ids, sortedIds, "catalog providers must be deterministically sorted by id");

  // Check structure of first entry
  const first = catalog[0];
  assert.ok(typeof first.id === "string" && first.id.length > 0);
  assert.ok(typeof first.name === "string");
  assert.ok(typeof first.category === "string");
});

test("loadRuntimeProviders extracts provider registry from fork root deterministically", () => {
  const registry = loadRuntimeProviders({ rootDir: "." });
  assert.ok(Array.isArray(registry), "registry should be an array");
  assert.ok(registry.length > 50, `expected >50 providers in fork registry, got ${registry.length}`);

  // Check deterministic sorting
  const ids = registry.map((p) => p.id);
  const sortedIds = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(ids, sortedIds, "registry providers must be deterministically sorted by id");

  // Check model list inside OpenAI or Anthropic
  const openai = registry.find((p) => p.id === "openai");
  assert.ok(openai, "openai should be in runtime registry");
  assert.ok(Array.isArray(openai.models), "openai models should be an array");
  assert.ok(openai.models.length > 0, "openai should have models");
});

test("loadProviderInventory loads complete fork inventory with metadata and snapshot caveat", () => {
  const inventory = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  assert.equal(inventory.metadata.sourceKind, "fork");
  assert.ok(inventory.metadata.sourceRoot.length > 0);
  assert.ok(inventory.metadata.generatedAt.length > 0);
  assert.ok(inventory.metadata.caveat.includes("snapshot"));
  assert.ok(inventory.catalog.length > 0);
  assert.ok(inventory.registry.length > 0);
  assert.ok(inventory.combined.length > 0);
});

test("loadProviderInventory loads reference snapshot inventory when root exists", () => {
  const refPath = "references/diegosouzapw-omniroute";
  if (!existsSync(resolve(refPath))) {
    return; // Skip if reference snapshot is missing in environment
  }
  const inventory = loadProviderInventory({ rootDir: refPath, sourceKind: "reference" });
  assert.equal(inventory.metadata.sourceKind, "reference");
  assert.ok(inventory.metadata.caveat.includes(refPath));
  assert.ok(inventory.catalog.length > 200, "reference catalog should have >200 providers");
  assert.ok(inventory.registry.length > 150, "reference registry should have >150 providers");
});

test("compareProviderInventories classifies fork_only, reference_only, common, and changed", () => {
  const refPath = "references/diegosouzapw-omniroute";
  if (!existsSync(resolve(refPath))) {
    return;
  }
  const forkInv = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  const refInv = loadProviderInventory({ rootDir: refPath, sourceKind: "reference" });

  const diff = compareProviderInventories(forkInv, refInv);
  assert.ok(diff.metadata);
  assert.equal(diff.metadata.forkRoot, ".");
  assert.equal(diff.metadata.referenceRoot, refPath);
  assert.ok(diff.metadata.snapshotCaveat.includes(refPath));

  assert.ok(Array.isArray(diff.classifications.fork_only));
  assert.ok(Array.isArray(diff.classifications.reference_only));
  assert.ok(Array.isArray(diff.classifications.common));
  assert.ok(Array.isArray(diff.classifications.changed));

  // Verify sorting of diff arrays
  for (const listKey of ["fork_only", "reference_only", "common", "changed"]) {
    const list = diff.classifications[listKey];
    const ids = list.map((item) => item.id);
    const sorted = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    assert.deepEqual(ids, sorted, `diff classification ${listKey} must be sorted by id`);
  }
});

test("missing root directory throws a sanitized diagnostic without crashing", () => {
  assert.throws(
    () => {
      loadProviderInventory({ rootDir: "references/non-existent-path-9999", sourceKind: "reference" });
    },
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.ok(err.message.includes("does not exist") || err.message.includes("ENOENT"));
      return true;
    }
  );
});

test("runCli with invalid flags fails with non-zero exit code and diagnostic", async () => {
  const result = await runCli(["--invalid-flag"]);
  assert.equal(result.exitCode, 1);
  assert.ok(result.stderr.includes("Invalid flag") || result.stdout.includes("Usage"));
});

test("Markdown diff formatting includes snapshot caveat and summary table", () => {
  const forkInv = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  const refPath = "references/diegosouzapw-omniroute";
  if (!existsSync(resolve(refPath))) return;

  const refInv = loadProviderInventory({ rootDir: refPath, sourceKind: "reference" });
  const diff = compareProviderInventories(forkInv, refInv);
  const markdown = formatDiffMarkdown(diff);

  assert.ok(markdown.includes("# OmniRoute Provider Catalog & Registry Diff"));
  assert.ok(markdown.includes("Snapshot Caveat"));
  assert.ok(markdown.includes("Fork Only"));
  assert.ok(markdown.includes("Reference Only"));
});

// ── Fail-closed source diagnostics ────────────────────────────────────────
// Regression guard: an existing-but-empty root must NOT silently fabricate the
// COMMON_PROVIDERS fallback into an authoritative inventory.

test("existing but empty source root fails closed instead of emitting fallback providers", () => {
  const scratch = makeScratchRoot("empty-root");
  try {
    assert.throws(
      () => loadProviderInventory({ rootDir: scratch, sourceKind: "reference" }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /No provider catalog source found/);
        return true;
      },
      "an empty root must not resolve to a fabricated fallback inventory"
    );

    // Sabotage cross-check: the non-strict interactive path still returns the
    // fallback, proving the strict gate (not an unrelated change) is what fails.
    const lenient = loadAvailableProviders({ rootDir: scratch });
    assert.ok(lenient.length > 0, "non-strict catalog load keeps its CLI fallback");
    assert.ok(
      lenient.every((p: { sourceFile: string }) => p.sourceFile === "fallback"),
      "non-strict fallback entries must be labelled as fallback"
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("malformed catalog source fails closed with a sanitized relative-path diagnostic", () => {
  const scratch = makeScratchRoot("malformed");
  const constantsDir = join(scratch, "src", "shared", "constants");
  mkdirSync(constantsDir, { recursive: true });
  // Unbalanced brace: TypeScript still yields a partial AST, so without the
  // parse-diagnostic gate this would extract a bogus single provider.
  writeFileSync(
    join(constantsDir, "providers.ts"),
    'export const AI_PROVIDERS = { broken: { id: "x", name: "X"\n',
    "utf-8"
  );

  try {
    assert.throws(
      () => loadProviderInventory({ rootDir: scratch, sourceKind: "reference" }),
      (err: unknown) => {
        assert.ok(err instanceof Error);
        assert.match(err.message, /Malformed provider source/);
        // Diagnostics must stay root-relative: no absolute scratch path.
        assert.ok(
          !err.message.includes(scratch),
          `diagnostic must not leak the absolute root path: ${err.message}`
        );
        return true;
      }
    );
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("unsupported sourceKind is rejected instead of being echoed into metadata", () => {
  assert.throws(
    () => loadProviderInventory({ rootDir: ".", sourceKind: "bogus-kind" }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /Unsupported sourceKind/);
      return true;
    }
  );
});

test("a file path passed as a source root is rejected as not-a-directory", () => {
  assert.throws(
    () => loadProviderInventory({ rootDir: "package.json", sourceKind: "fork" }),
    (err: unknown) => {
      assert.ok(err instanceof Error);
      assert.match(err.message, /not a directory/);
      return true;
    }
  );
});

// ── CLI flag parsing ──────────────────────────────────────────────────────

test("flags requiring a value fail closed rather than swallowing the next flag", async () => {
  for (const args of [
    ["list", "--fork-root"],
    ["diff", "--reference-root"],
    ["list", "--format"],
    // The dangerous case: the value slot is filled by the *next flag*.
    ["list", "--fork-root", "--format", "json"],
  ]) {
    const result = await runCli(args);
    assert.equal(result.exitCode, 1, `expected non-zero exit for: ${args.join(" ")}`);
    assert.match(result.stderr, /requires a value/);
  }
});

test("CLI failures keep stdout clean so JSON consumers never parse usage text", async () => {
  const result = await runCli(["--invalid-flag"]);
  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "", "stdout must stay empty on failure");
  assert.match(result.stderr, /Invalid flag or argument/);
  assert.match(result.stderr, /Usage:/, "usage text belongs on stderr");
});

test("CLI diff against a missing reference root exits non-zero and emits no JSON", async () => {
  const result = await runCli([
    "diff",
    "--reference-root",
    "references/definitely-missing-9999",
  ]);
  assert.equal(result.exitCode, 1);
  assert.equal(result.stdout, "");
  assert.match(result.stderr, /does not exist/);
});

// ── Contract stability ────────────────────────────────────────────────────

test("inventory and diff payloads carry the versioned schema marker", () => {
  const inventory = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  assert.equal(inventory.metadata.schemaVersion, PROVIDER_INVENTORY_SCHEMA_VERSION);

  if (!existsSync(resolve(REFERENCE_ROOT))) return;
  const refInv = loadProviderInventory({ rootDir: REFERENCE_ROOT, sourceKind: "reference" });
  const diff = compareProviderInventories(inventory, refInv);
  assert.equal(diff.metadata.schemaVersion, PROVIDER_INVENTORY_SCHEMA_VERSION);
});

test("repeated inventory loads are byte-identical apart from generatedAt", () => {
  const strip = (inv: { metadata: Record<string, unknown> }) => {
    const clone = JSON.parse(JSON.stringify(inv));
    delete clone.metadata.generatedAt;
    return JSON.stringify(clone);
  };
  const first = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  const second = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  assert.equal(strip(first), strip(second), "inventory output must be deterministic");
  assert.notEqual(first.metadata.generatedAt, undefined);
});

test("aliases are preserved and never collapsed into the canonical provider id", () => {
  const registry = loadRuntimeProviders({ rootDir: "." });
  const aliased = registry.filter(
    (p: { id: string; alias: string | null }) => p.alias && p.alias !== p.id
  );
  assert.ok(
    aliased.length > 0,
    "fixture assumption: fork registry has providers whose alias differs from id"
  );

  const idSet = new Set(registry.map((p: { id: string }) => p.id));
  for (const provider of aliased) {
    // An alias must not silently become an inventory key of its own.
    assert.ok(
      !idSet.has(provider.alias) || provider.alias === provider.id,
      `alias '${provider.alias}' must not shadow a distinct canonical id`
    );
  }

  // The alias survives into the combined inventory record.
  const inventory = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  const sample = aliased[0];
  const combined = inventory.combined.find((c: { id: string }) => c.id === sample.id);
  assert.ok(combined, `combined inventory must contain '${sample.id}'`);
  assert.equal(combined.registry.alias, sample.alias);
});

test("provider ids are unique across the combined inventory", () => {
  const inventory = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  const ids = inventory.combined.map((c: { id: string }) => c.id);
  assert.equal(new Set(ids).size, ids.length, "combined inventory must not contain duplicate ids");
});

test("diff classifications are disjoint and account for every provider id", () => {
  if (!existsSync(resolve(REFERENCE_ROOT))) return;
  const forkInv = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  const refInv = loadProviderInventory({ rootDir: REFERENCE_ROOT, sourceKind: "reference" });
  const diff = compareProviderInventories(forkInv, refInv);
  const { fork_only, reference_only, common, changed } = diff.classifications;

  const buckets = [fork_only, reference_only, common, changed].map(
    (list: Array<{ id: string }>) => list.map((item) => item.id)
  );
  const all = buckets.flat();
  assert.equal(new Set(all).size, all.length, "a provider id must appear in exactly one bucket");

  const union = new Set([
    ...forkInv.combined.map((c: { id: string }) => c.id),
    ...refInv.combined.map((c: { id: string }) => c.id),
  ]);
  assert.equal(all.length, union.size, "classifications must cover every known provider id");

  assert.equal(diff.summary.forkOnly, fork_only.length);
  assert.equal(diff.summary.referenceOnly, reference_only.length);
  assert.equal(diff.summary.common, common.length);
  assert.equal(diff.summary.changed, changed.length);
});

test("compareProviderInventories rejects a malformed inventory argument", () => {
  const forkInv = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  assert.throws(
    () => compareProviderInventories(forkInv, { metadata: {} } as never),
    /Invalid reference inventory/
  );
  assert.throws(
    () => compareProviderInventories(null as never, forkInv),
    /Invalid fork inventory/
  );
});

// ── Read-only guarantee ───────────────────────────────────────────────────

test("list and diff runs do not mutate the source trees they read", async () => {
  const before = fingerprintTree("src/shared/constants");
  const registryBefore = fingerprintTree("open-sse/config/providers");
  const referencePresent = existsSync(resolve(REFERENCE_ROOT));
  const refBefore = referencePresent
    ? [
        ...fingerprintTree(`${REFERENCE_ROOT}/src/shared/constants`),
        ...fingerprintTree(`${REFERENCE_ROOT}/open-sse/config/providers`),
      ].sort()
    : [];

  const runs = [
    ["list"],
    ["list", "-f", "markdown"],
    ...(referencePresent
      ? [
          ["diff", "--reference-root", REFERENCE_ROOT],
          ["diff", "--reference-root", REFERENCE_ROOT, "-f", "markdown"],
        ]
      : []),
  ];
  for (const args of runs) {
    const result = await runCli(args);
    assert.equal(result.exitCode, 0, `expected success for: ${args.join(" ")}`);
    assert.ok(result.stdout.length > 0);
  }

  assert.deepEqual(fingerprintTree("src/shared/constants"), before, "catalog source mutated");
  assert.deepEqual(
    fingerprintTree("open-sse/config/providers"),
    registryBefore,
    "runtime registry source mutated"
  );
  if (referencePresent) {
    const refAfter = [
      ...fingerprintTree(`${REFERENCE_ROOT}/src/shared/constants`),
      ...fingerprintTree(`${REFERENCE_ROOT}/open-sse/config/providers`),
    ].sort();
    assert.deepEqual(refAfter, refBefore, "reference snapshot mutated");
  }
});

test("inventory markdown records provenance and the static-snapshot caveat", () => {
  const inventory = loadProviderInventory({ rootDir: ".", sourceKind: "fork" });
  const markdown = formatInventoryMarkdown(inventory);

  assert.ok(markdown.includes("# OmniRoute Provider Inventory"));
  assert.ok(markdown.includes("Source Kind"));
  assert.ok(markdown.includes("Source Root"));
  assert.ok(markdown.includes("Generated At"));
  assert.match(markdown, /Snapshot Caveat/);
  assert.match(markdown, /[Ss]napshot/);
  // Must not claim live upstream freshness.
  assert.ok(!/live upstream(?! API\))/i.test(markdown.replace(/not live upstream/gi, "")));
});

// ── Reviewer Findings Fix Verification Tests ──────────────────────────────

test("F1: runtime extraction anchors to canonical REGISTRY index (220 ref keys, 173 fork keys)", () => {
  if (!existsSync(resolve(REFERENCE_ROOT))) return;
  const refRegistry = loadRuntimeProviders({ rootDir: REFERENCE_ROOT, strict: true });
  assert.equal(
    refRegistry.length,
    220,
    `reference runtime registry must extract exactly 220 canonical REGISTRY keys, got ${refRegistry.length}`
  );

  const forkRegistry = loadRuntimeProviders({ rootDir: ".", strict: true });
  assert.equal(
    forkRegistry.length,
    173,
    `fork runtime registry must extract exactly 173 canonical REGISTRY keys, got ${forkRegistry.length}`
  );
});

test("F2: model extraction resolves spread constants, member expressions, and helper calls", () => {
  const registry = loadRuntimeProviders({ rootDir: ".", strict: true });
  
  const agy = registry.find((p) => p.id === "agy");
  assert.ok(agy, "agy provider should be present");
  assert.ok(agy.models.length > 0, "agy models spread from AGY_PUBLIC_MODELS must not be empty");
  assert.equal(agy.models[0].id, "claude-opus-4-6-thinking");

  const antigravity = registry.find((p) => p.id === "antigravity");
  assert.ok(antigravity, "antigravity provider should be present");
  assert.ok(antigravity.models.length > 0, "antigravity models spread from ANTIGRAVITY_PUBLIC_MODELS must not be empty");

  const kimiCoding = registry.find((p) => p.id === "kimi-coding");
  assert.ok(kimiCoding, "kimi-coding provider should be present");
  assert.equal(kimiCoding.format, "claude");
  assert.ok(kimiCoding.models.length > 0, "kimi-coding models from KIMI_CODING_SHARED must not be empty");

  const deepinfra = registry.find((p) => p.id === "deepinfra");
  assert.ok(deepinfra, "deepinfra provider should be present");
  assert.ok(deepinfra.models.length > 0, "deepinfra models from CHAT_OPENAI_COMPAT_MODELS.deepinfra must not be empty");
});

test("F3: absolute source roots do not leak filesystem paths into metadata, caveat, or markdown", async () => {
  const absForkRoot = resolve(".");
  const absRefRoot = resolve(REFERENCE_ROOT);

  const inventory = loadProviderInventory({ rootDir: absForkRoot, sourceKind: "fork" });
  assert.equal(inventory.metadata.sourceRoot, ".", "sourceRoot must be normalized/relative");
  assert.ok(!inventory.metadata.caveat.includes(absForkRoot), "caveat must not leak absolute path");
  assert.ok(!inventory.metadata.caveat.includes("/home/"), "caveat must not leak /home/ path");

  if (existsSync(absRefRoot)) {
    const refInventory = loadProviderInventory({ rootDir: absRefRoot, sourceKind: "reference" });
    assert.equal(refInventory.metadata.sourceRoot, REFERENCE_ROOT, "reference sourceRoot must be normalized/relative");
    assert.ok(!refInventory.metadata.caveat.includes(absRefRoot));

    const diff = compareProviderInventories(inventory, refInventory);
    assert.equal(diff.metadata.forkRoot, ".");
    assert.equal(diff.metadata.referenceRoot, REFERENCE_ROOT);
    assert.ok(!diff.metadata.snapshotCaveat.includes(absRefRoot));

    const markdown = formatDiffMarkdown(diff);
    assert.ok(!markdown.includes(absRefRoot), "markdown output must not contain absolute reference root");
  }

  // CLI smoke with absolute path flags
  const cliResult = await runCli(["diff", "--fork-root", absForkRoot, "--reference-root", absRefRoot]);
  assert.equal(cliResult.exitCode, 0);
  assert.ok(!cliResult.stdout.includes(absForkRoot), "CLI output must not leak absolute fork root");
  assert.ok(!cliResult.stdout.includes(absRefRoot), "CLI output must not leak absolute reference root");
});

test("F2 regression: generic object-model spreads preserve inherited model fields", () => {
  const scratch = makeScratchRoot("model-object-spread");
  const catalogDir = join(scratch, "src", "shared", "constants");
  const registryDir = join(scratch, "open-sse", "config", "providers", "registry", "demo");
  mkdirSync(catalogDir, { recursive: true });
  mkdirSync(registryDir, { recursive: true });
  writeFileSync(
    join(catalogDir, "providers.ts"),
    'export const APIKEY_PROVIDERS = { demo: { id: "demo", name: "Demo" } };\n',
    "utf-8"
  );
  writeFileSync(
    join(scratch, "open-sse", "config", "providers", "index.ts"),
    'import { demoProvider } from "./registry/demo/index.ts";\nexport const REGISTRY = { demo: demoProvider };\n',
    "utf-8"
  );
  writeFileSync(
    join(registryDir, "index.ts"),
    [
      'const BASE_MODEL = { id: "base-model", name: "Base model", contextLength: 123 };',
      'export const demoProvider = {',
      '  id: "demo", alias: "demo-alias", format: "openai", executor: "default",',
      '  authType: "apikey", models: [{ ...BASE_MODEL }],',
      '};',
      "",
    ].join("\n"),
    "utf-8"
  );

  try {
    const registry = loadRuntimeProviders({ rootDir: scratch, strict: true });
    assert.deepEqual(registry[0]?.models, [
      {
        id: "base-model",
        name: "Base model",
        contextLength: 123,
        maxInputTokens: null,
        unsupportedParams: null,
      },
    ]);
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("F2 sabotage guard: object-model spread failure cannot return an empty model list", () => {
  const scratch = makeScratchRoot("model-object-spread-sabotage");
  const catalogDir = join(scratch, "src", "shared", "constants");
  const registryDir = join(scratch, "open-sse", "config", "providers", "registry", "demo");
  mkdirSync(catalogDir, { recursive: true });
  mkdirSync(registryDir, { recursive: true });
  writeFileSync(
    join(catalogDir, "providers.ts"),
    'export const APIKEY_PROVIDERS = { demo: { id: "demo", name: "Demo" } };\n',
    "utf-8"
  );
  writeFileSync(
    join(scratch, "open-sse", "config", "providers", "index.ts"),
    'import { demoProvider } from "./registry/demo/index.ts";\nexport const REGISTRY = { demo: demoProvider };\n',
    "utf-8"
  );
  writeFileSync(
    join(registryDir, "index.ts"),
    [
      'const BASE_MODEL = { id: "sabotage-model", name: "Sabotage model", contextLength: 456 };',
      'export const demoProvider = { id: "demo", format: "openai", executor: "default",',
      '  authType: "apikey", models: [{ ...BASE_MODEL }] };',
      "",
    ].join("\n"),
    "utf-8"
  );

  try {
    const registry = loadRuntimeProviders({ rootDir: scratch, strict: true });
    assert.equal(registry.length, 1);
    assert.equal(registry[0]?.models.length, 1, "a spread regression must not silently erase the model");
    assert.equal(registry[0]?.models[0]?.id, "sabotage-model");
  } finally {
    rmSync(scratch, { recursive: true, force: true });
  }
});

test("F4: provider and model sorting is deterministic and locale-independent", () => {
  const catalog = loadAvailableProviders({ rootDir: ".", strict: true });
  const ids = catalog.map((p) => p.id);
  const sortedIds = [...ids].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  assert.deepEqual(ids, sortedIds, "catalog providers must be sorted with code-unit ordinal ordering");
});

