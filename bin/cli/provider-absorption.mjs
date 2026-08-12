#!/usr/bin/env node
// bin/cli/provider-absorption.mjs
// Read-only absorption-triage CLI: consumes the Task 0152 normalized diff
// JSON (schemaVersion 1) and produces a deterministic, redacted report that
// classifies each fork/reference difference and prescribes a human-owned next
// action. The CLI MUST NOT mutate source providers, tasks, changelog, or
// references. It MUST NOT auto-create implementation tasks.
//
// Usage:
//   node bin/cli/provider-absorption.mjs --diff-json <path|-> [--format json|markdown]
//
// The output is a JSON envelope or a Markdown render of the same envelope.

import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export const ABSORPTION_SCHEMA_VERSION = 1;
export const CONSUMED_DIFF_SCHEMA_VERSION = 1;

/** Bucket → provenance kind. */
export const CLASSIFICATIONS = Object.freeze([
  "metadata-only",
  "model-only",
  "provider-addition-candidate",
  "provider-removal-candidate",
  "executor-format-change",
  "auth-change",
  "security-sensitive",
  "alias-change",
  "stale-snapshot",
  "unresolved-manual-review",
]);

export const RISK_LEVELS = Object.freeze(["low", "medium", "high", "critical"]);

export const SUGGESTED_ACTIONS = Object.freeze([
  "ignore",
  "inspect",
  "update-allowlist",
  "create-implementation-task",
  "create-security-auth-review",
  "manual-review",
]);

const FORBIDDEN_FLAGS = Object.freeze([
  "--apply",
  "--write",
  "--mutate",
  "--create-task",
  "--create-tasklist",
  "--create-changelog",
  "--commit",
  "--push",
]);

// Fields that trigger metadata-only classification when ONLY they differ.
const METADATA_ONLY_FIELDS = Object.freeze([
  "name",
  "category",
  "website",
  "deprecated",
  "hasFree",
  "passthroughModels",
]);

// Registry fields that affect runtime behaviour.
const EXECUTOR_FIELDS = Object.freeze(["executor", "format"]);
const SECURITY_SENSITIVE_FIELDS = Object.freeze(["baseUrl"]);
const AUTH_FIELDS = Object.freeze(["authType"]);

// Conservative redaction patterns. Values matching these shapes are stripped
// from any text that flows into the report, but detecting them is signalled so
// consumers know the input contained a token-shaped or signed-URL value.
const REDACTION_PATTERNS = [
  { kind: "jwt", regex: /eyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}/g },
  { kind: "bearer", regex: /Bearer\s+[A-Za-z0-9._~+/=-]{12,}/g },
  { kind: "urlCredentials", regex: /\/\/[A-Za-z0-9._~+%-]+:[A-Za-z0-9._~+%/=-]{4,}@[^\s/]+/g },
  { kind: "apiKey", regex: /\b(sk|rk|pk|api[_-]?key)[-_][A-Za-z0-9]{8,}\b/gi },
  { kind: "cookie", regex: /\b(cookie|session|token)[=:\s][A-Za-z0-9._~+/=-]{12,}\b/gi },
];

// Deterministic byte-stable comparator (same shape as 0152).
export function compareCodes(a, b) {
  const strA = String(a ?? "");
  const strB = String(b ?? "");
  if (strA < strB) return -1;
  if (strA > strB) return 1;
  return 0;
}

function sortById(arr) {
  return [...arr].sort((a, b) => compareCodes(a.id, b.id));
}

function sortStrings(arr) {
  return [...arr].sort((a, b) => compareCodes(a, b));
}

function uniq(values) {
  return Array.from(new Set(values));
}

/** Validate that the input matches the Task 0152 diff contract. */
export function validateDiff(input) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new Error("Input diff must be a JSON object.");
  }
  const metadata = input.metadata;
  if (!metadata || typeof metadata !== "object") {
    throw new Error("Input diff is missing required top-level 'metadata'.");
  }
  if (metadata.schemaVersion !== CONSUMED_DIFF_SCHEMA_VERSION) {
    throw new Error(
      `Unsupported diff.schemaVersion '${metadata.schemaVersion}'. Expected ${CONSUMED_DIFF_SCHEMA_VERSION}.`
    );
  }
  if (!metadata.referenceRoot || typeof metadata.referenceRoot !== "string") {
    throw new Error("Input diff is missing metadata.referenceRoot.");
  }
  if (!metadata.snapshotCaveat || typeof metadata.snapshotCaveat !== "string") {
    throw new Error("Input diff is missing metadata.snapshotCaveat.");
  }
  const classifications = input.classifications;
  if (
    !classifications ||
    typeof classifications !== "object" ||
    !Array.isArray(classifications.fork_only) ||
    !Array.isArray(classifications.reference_only) ||
    !Array.isArray(classifications.common) ||
    !Array.isArray(classifications.changed)
  ) {
    throw new Error("Input diff is missing required 'classifications' buckets.");
  }
  return {
    forkRoot: metadata.forkRoot || metadata.sourceRoot || ".",
    referenceRoot: metadata.referenceRoot,
    generatedAt: typeof metadata.generatedAt === "string" ? metadata.generatedAt : null,
    snapshotCaveat: metadata.snapshotCaveat,
  };
}

/** Detect whether the snapshot's generatedAt is older than maxAgeDays. */
function detectStale(generatedAt, maxAgeDays) {
  if (!generatedAt) {
    return { detected: true, unresolvedProvenance: true, ageDays: null, maxAgeDays };
  }
  const ts = Date.parse(generatedAt);
  if (Number.isNaN(ts)) {
    return { detected: true, unresolvedProvenance: true, ageDays: null, maxAgeDays };
  }
  const ageDays = Math.max(0, Math.floor((Date.now() - ts) / 86_400_000));
  return {
    detected: ageDays > maxAgeDays,
    unresolvedProvenance: false,
    ageDays,
    maxAgeDays,
  };
}

/**
 * Walk a text body and count redaction patterns. Returns the scrubbed text
 * and the per-kind counters. Operates only on `before`/`after` literals and
 * does not modify object identity.
 */
function redactText(text, counters) {
  if (typeof text !== "string" || text.length === 0) {
    return text;
  }
  let scrubbed = text;
  for (const pattern of REDACTION_PATTERNS) {
    pattern.regex.lastIndex = 0;
    let hits = 0;
    scrubbed = scrubbed.replace(pattern.regex, () => {
      hits += 1;
      return "[REDACTED]";
    });
    if (hits > 0) {
      counters.inputTokenShapedValues += hits;
      counters.byKind[pattern.kind] = (counters.byKind[pattern.kind] || 0) + hits;
    }
  }
  return scrubbed;
}

function redactDiffValue(value, counters) {
  if (value === null || value === undefined) return value;
  if (typeof value === "string") {
    return redactText(value, counters);
  }
  if (typeof value !== "object") return value;
  for (const key of Object.keys(value)) {
    const v = value[key];
    if (typeof v === "string") {
      const scrubbed = redactText(v, counters);
      if (scrubbed !== v) {
        counters.withheldValueEmissions += 1;
        value[key] = "[REDACTED]";
      }
    } else if (v && typeof v === "object") {
      redactDiffValue(v, counters);
    }
  }
  return value;
}

/**
 * Inline-scrub every string field of the provenance metadata so token-shaped
 * values (Bearer/JWT/apiKey/cookie/URL-credentials) never reach the report.
 * Unlike redactDiffValue's whole-field replacement, this preserves the useful
 * non-token portions of fields like snapshotCaveat ("static snapshot...") while
 * replacing only the offending segments with [REDACTED]. It MUST run BEFORE
 * validateDiff extracts the values so every emitted provenance field is
 * sanitized (F1 fix).
 */
function redactMetadataStrings(metadata, counters) {
  for (const key of Object.keys(metadata)) {
    const value = metadata[key];
    if (typeof value !== "string" || value.length === 0) continue;
    const scrubbed = redactText(value, counters);
    if (scrubbed !== value) {
      metadata[key] = scrubbed;
    }
  }
}

/**
 * Detect whether a path is absolute in any of the common shapes: Unix absolute
 * (`/...`, which includes `/tmp`, `/home`, `/etc`), Windows drive-letter
 * (`C:\` or `C:/`), or backslash-absolute (`\\server\share` or `\Windows`).
 * Any absolute shape leaks host-specific provenance and must be normalized.
 */
export function isAbsolutePath(path) {
  if (typeof path !== "string" || path.length === 0) return false;
  if (path.startsWith("/")) return true;
  if (/^[A-Za-z]:[\\/]/.test(path)) return true;
  if (path.startsWith("\\")) return true;
  return false;
}

/**
 * Safe basename of a path that may use forward or backslash separators.
 * Returns the last non-empty segment, or "unknown" for a trailing-slash input.
 */
function basenameOf(path) {
  const normalized = path.replace(/\\/g, "/");
  const segments = normalized.split("/").filter((s) => s.length > 0);
  return segments.length > 0 ? segments[segments.length - 1] : "unknown";
}

/**
 * Normalize a path to a deterministic, host-free form suitable for report
 * emission (F6 fix). Three outcomes, matching the Task 0152 display-root
 * convention:
 *   1. relative paths are returned verbatim (already safe, repo-relative);
 *   2. an absolute path under one of the known roots is stripped to a
 *      repo-relative path (preserving useful relative provenance);
 *   3. an absolute path outside every known root collapses to a deterministic
 *      `[external]/<basename>` token that exposes no host prefix.
 *
 * @param {string} path raw path value
 * @param {string[]} [knownRoots] absolute roots to relativize against
 * @returns {string} host-free path token
 */
export function normalizePathForDisplay(path, knownRoots = []) {
  if (typeof path !== "string" || path.length === 0) return path;
  if (!isAbsolutePath(path)) return path;
  const candidateRoots = Array.isArray(knownRoots)
    ? knownRoots.filter((r) => typeof r === "string" && r.length > 0 && isAbsolutePath(r))
    : [];
  const normalizedPath = path.replace(/\\/g, "/");
  for (const root of candidateRoots) {
    const normalizedRoot = root.replace(/\\/g, "/");
    if (normalizedPath === normalizedRoot) return ".";
    if (normalizedPath.startsWith(normalizedRoot + "/")) {
      return normalizedPath.slice(normalizedRoot.length + 1);
    }
  }
  return `[external]/${basenameOf(path)}`;
}

/**
 * Collect redacted, repo-relative source-file paths from a diff row so the
 * report preserves concrete evidence of which files/symbols require inspection
 * (F2 fix). For changed rows this walks both fork and reference sides; for
 * bucket rows it walks the row's own catalog/registry. Source-file values are
 * themselves run through redactText so a token-shaped path segment cannot leak,
 * and then normalized to a host-free form (F6 fix) against the diff's known
 * source roots so no absolute host path leaks into the report.
 */
function collectSourceFiles(row, counters, knownRoots = []) {
  const files = [];
  const pushFile = (value) => {
    if (typeof value === "string" && value.length > 0) {
      const display = normalizePathForDisplay(value, knownRoots);
      files.push(redactText(display, counters));
    }
  };
  const walkSide = (side) => {
    if (!side || typeof side !== "object") return;
    pushFile(side.catalog && side.catalog.sourceFile);
    pushFile(side.registry && side.registry.sourceFile);
  };
  if (row.fork || row.reference) {
    walkSide(row.fork);
    walkSide(row.reference);
  } else {
    walkSide(row);
  }
  return sortStrings(uniq(files));
}

// ── Classification rules ────────────────────────────────────────────────

function classifyChangedRow(
  row,
  stale,
  counters = { inputTokenShapedValues: 0, byKind: {} },
  knownRoots = []
) {
  const reasons = [];
  const tags = [];
  const evidencePaths = [];
  const oldIds = [];
  const newIds = [];
  const evidenceFiles = collectSourceFiles(row, counters, knownRoots);

  const cd = row.catalogDiff;
  const rd = row.registryDiff;
  const md = row.modelDiff || { added: [], removed: [], modified: [] };
  const modelTouched =
    md.added.length > 0 || md.removed.length > 0 || md.modified.length > 0;

  if (cd) {
    for (const [field, delta] of Object.entries(cd)) {
      if (field === "presence") {
        reasons.push(`catalog presence fork=${delta.fork} reference=${delta.reference}`);
        evidencePaths.push(`$.classifications.changed[?].catalogDiff.presence`);
      } else if (field === "alias") {
        reasons.push(`catalog alias changed`);
        evidencePaths.push(`$.classifications.changed[?].catalogDiff.alias`);
        if (delta.fork) oldIds.push(String(delta.fork));
        if (delta.reference) newIds.push(String(delta.reference));
      } else if (METADATA_ONLY_FIELDS.includes(field)) {
        reasons.push(`catalog metadata '${field}' changed`);
        evidencePaths.push(`$.classifications.changed[?].catalogDiff.${field}`);
      } else {
        reasons.push(`catalog field '${field}' changed (unmapped)`);
        evidencePaths.push(`$.classifications.changed[?].catalogDiff.${field}`);
      }
    }
  }

  if (rd) {
    for (const [field, delta] of Object.entries(rd)) {
      if (field === "presence") {
        reasons.push(`registry presence fork=${delta.fork} reference=${delta.reference}`);
        evidencePaths.push(`$.classifications.changed[?].registryDiff.presence`);
      } else if (EXECUTOR_FIELDS.includes(field)) {
        reasons.push(`registry ${field} changed`);
        evidencePaths.push(`$.classifications.changed[?].registryDiff.${field}`);
      } else if (SECURITY_SENSITIVE_FIELDS.includes(field)) {
        reasons.push(`registry ${field} changed (security-sensitive host shape)`);
        evidencePaths.push(`$.classifications.changed[?].registryDiff.${field}`);
      } else if (AUTH_FIELDS.includes(field)) {
        reasons.push(`registry auth '${field}' changed`);
        evidencePaths.push(`$.classifications.changed[?].registryDiff.${field}`);
      } else if (field === "alias") {
        reasons.push(`registry alias changed`);
        evidencePaths.push(`$.classifications.changed[?].registryDiff.alias`);
        if (delta.fork) oldIds.push(String(delta.fork));
        if (delta.reference) newIds.push(String(delta.reference));
      } else {
        reasons.push(`registry field '${field}' changed (unmapped)`);
        evidencePaths.push(`$.classifications.changed[?].registryDiff.${field}`);
      }
    }
  }

  if (modelTouched) {
    if (md.added.length > 0) {
      reasons.push(`+${md.added.length} model(s) added`);
      evidencePaths.push("$.classifications.changed[?].modelDiff.added");
    }
    if (md.removed.length > 0) {
      reasons.push(`-${md.removed.length} model(s) removed`);
      evidencePaths.push("$.classifications.changed[?].modelDiff.removed");
    }
    if (md.modified.length > 0) {
      reasons.push(`~${md.modified.length} model(s) modified`);
      evidencePaths.push("$.classifications.changed[?].modelDiff.modified");
    }
    tags.push("model-only");
  }

  const registryHasAuthChange = rd && AUTH_FIELDS.some((f) => f in rd);
  const registryHasExecutorChange = rd && EXECUTOR_FIELDS.some((f) => f in rd);
  const registryHasSecurityFieldChange = rd && SECURITY_SENSITIVE_FIELDS.some((f) => f in rd);
  const catalogHasAliasChange = cd && "alias" in cd;
  const registryHasAliasChange = rd && "alias" in rd;
  const presenceOnly =
    rd && Object.keys(rd).length === 1 && rd.presence !== undefined;
  const hasUnmappedField = reasons.some((r) => r.includes("(unmapped)"));

  let classification = "metadata-only";
  let risk = "low";
  let confidence = stale.unresolvedProvenance ? 0.4 : stale.detected ? 0.55 : 0.9;
  let suggestedAction = "ignore";
  let manualReviewRequired = false;

  if (registryHasAuthChange || registryHasSecurityFieldChange) {
    classification = "security-sensitive";
    risk = "high";
    confidence = stale.unresolvedProvenance ? 0.3 : stale.detected ? 0.45 : 0.85;
    suggestedAction = "create-security-auth-review";
    manualReviewRequired = true;
    // F3: every security-sensitive row carries the `security-sensitive` tag so
    // downstream consumers can key on an explicit tag, not an implicit
    // classification. auth rows additionally carry `auth-change`; baseUrl rows
    // carry `baseUrl-change`. This makes the auth/OAuth/security taxonomy
    // explicit and stable.
    tags.push("security-sensitive");
    if (registryHasAuthChange) tags.push("auth-change");
    if (registryHasSecurityFieldChange) tags.push("baseUrl-change");
    if (registryHasExecutorChange) tags.push("executor-format-change");
  } else if (registryHasExecutorChange) {
    classification = "executor-format-change";
    risk = "high";
    confidence = stale.unresolvedProvenance ? 0.4 : stale.detected ? 0.5 : 0.85;
    suggestedAction = "create-implementation-task";
    manualReviewRequired = true;
    tags.push("executor-format-change");
  } else if (catalogHasAliasChange || registryHasAliasChange) {
    classification = "alias-change";
    risk = "medium";
    confidence = stale.unresolvedProvenance ? 0.4 : stale.detected ? 0.55 : 0.9;
    suggestedAction = "update-allowlist";
    manualReviewRequired = true;
    tags.push("alias-change");
  } else if (presenceOnly) {
    classification = "unresolved-manual-review";
    risk = "medium";
    confidence = 0.4;
    suggestedAction = "manual-review";
    manualReviewRequired = true;
    reasons.push("presence-only diff cannot be auto-classified");
  } else if (hasUnmappedField) {
    classification = "unresolved-manual-review";
    risk = "medium";
    confidence = stale.unresolvedProvenance ? 0.3 : stale.detected ? 0.4 : 0.6;
    suggestedAction = "manual-review";
    manualReviewRequired = true;
  } else if (modelTouched && (cd === null || cd === undefined) && (rd === null || rd === undefined)) {
    classification = "model-only";
    risk = "low";
    confidence = stale.unresolvedProvenance ? 0.4 : stale.detected ? 0.55 : 0.9;
    suggestedAction = "inspect";
  } else if (modelTouched && !registryHasExecutorChange && !registryHasAuthChange) {
    classification = "model-only";
    risk = "low";
    confidence = stale.unresolvedProvenance ? 0.4 : stale.detected ? 0.55 : 0.9;
    suggestedAction = "inspect";
    if (md.added.length > 0 || md.removed.length > 0) {
      tags.push("model-add-remove");
    }
  }

  if (stale.unresolvedProvenance) {
    reasons.push("provenance: snapshot generatedAt is missing or unparseable");
  } else if (stale.detected) {
    reasons.push(`provenance: snapshot is ${stale.ageDays} day(s) old (maxAgeDays=${stale.maxAgeDays})`);
  }

  // SAFETY: every row must carry at least one content-category tag so the
  // documented schema contract (tags.length > 0) holds for ALL classifications,
  // including metadata-only and presence-only rows that have no model changes
  // (those paths push no other tag). Computed against the content classification
  // deliberately BEFORE the stale-snapshot provenance override below, so the
  // tag always reflects the row's content category rather than its freshness.
  if (tags.length === 0) {
    tags.push(classification);
  }

  if (stale.detected) {
    classification = "stale-snapshot";
    suggestedAction = "manual-review";
    manualReviewRequired = true;
  }

  return {
    bucket: "changed",
    classification,
    risk,
    confidence,
    reasons,
    tags,
    evidencePaths: sortStrings(uniq(evidencePaths)),
    evidenceFiles,
    oldIds: sortStrings(uniq(oldIds)),
    newIds: sortStrings(uniq(newIds)),
    suggestedAction,
    manualReviewRequired,
  };
}

function classifyBucketRow(
  row,
  bucket,
  stale,
  counters = { inputTokenShapedValues: 0, byKind: {} },
  knownRoots = []
) {
  const evidencePath = `$.classifications.${bucket}[?]`;
  const reasons = [];
  const tags = [];
  const inCatalog = row.inCatalog === true;
  const inRegistry = row.inRegistry === true;
  const id = row.id;
  // F2: preserve repo-relative source-file evidence for bucket rows too, so a
  // human reviewer can identify the concrete catalog/registry source files.
  // F6: source-file paths are normalized against the known roots so no
  // absolute host path leaks into the report.
  const evidenceFiles = collectSourceFiles(row, counters, knownRoots);

  reasons.push(`${bucket} row: inCatalog=${inCatalog} inRegistry=${inRegistry}`);
  tags.push(`${bucket}-bucket`);

  const registryOnly = !inCatalog && inRegistry;
  const catalogOnly = inCatalog && !inRegistry;

  let result;
  if (bucket === "reference_only") {
    if (catalogOnly) {
      reasons.push("upstream-only provider with no runtime registry entry");
      tags.push("upstream-only");
    } else if (registryOnly) {
      reasons.push("upstream-only registry entry with no catalog metadata");
      tags.push("upstream-only");
    } else {
      reasons.push("upstream provider present in both catalog and registry (unexpected for reference_only)");
    }
    result = {
      bucket,
      classification: "provider-addition-candidate",
      risk: catalogOnly || registryOnly ? "medium" : "high",
      confidence: stale.detected ? 0.4 : 0.8,
      reasons,
      tags: sortStrings(uniq(tags)),
      evidencePaths: [evidencePath],
      evidenceFiles,
      oldIds: [],
      newIds: [id],
      suggestedAction: "create-implementation-task",
      manualReviewRequired: true,
    };
  } else if (bucket === "fork_only") {
    tags.push("fork-only");
    result = {
      bucket,
      classification: "provider-removal-candidate",
      risk: registryOnly ? "medium" : "high",
      confidence: stale.detected ? 0.5 : 0.85,
      reasons,
      tags: sortStrings(uniq(tags)),
      evidencePaths: [evidencePath],
      evidenceFiles,
      oldIds: [id],
      newIds: [],
      suggestedAction: "create-implementation-task",
      manualReviewRequired: true,
    };
  } else {
    return null;
  }

  // F4: consistent stale policy across ALL buckets. A stale snapshot cannot be
  // trusted as current upstream truth, so every row — changed or presence-only
  // bucket — is reclassified to `stale-snapshot` and forced to manual review.
  // This matches classifyChangedRow and makes the contract deterministic.
  if (stale.detected) {
    result.classification = "stale-snapshot";
    result.suggestedAction = "manual-review";
    result.manualReviewRequired = true;
  }

  return result;
}

/**
 * Build the absorption-triage report from a Task 0152 diff JSON.
 * @param {object} diff validated diff object
 * @param {object} [options] { maxAgeDays = 90 }
 */
export function buildReport(diff, options = {}) {
  // Validate structural shape first so malformed input fails closed BEFORE we
  // spend work redacting it.
  validateDiff(diff);
  const maxAgeDays = Number.isFinite(options.maxAgeDays) ? options.maxAgeDays : 90;

  const counters = {
    inputTokenShapedValues: 0,
    contentsReplaced: 0,
    withheldValueEmissions: 0,
    byKind: {},
  };
  // Clone + redact BEFORE extracting provenance. Inline-scrub the metadata
  // strings so token-shaped segments in required fields (snapshotCaveat,
  // referenceRoot, …) never reach the emitted report while useful text is
  // preserved (F1). validateDiff is then re-run on the sanitized clone so the
  // emitted provenance values are the redacted ones.
  const redactedDiff = JSON.parse(JSON.stringify(diff));
  redactMetadataStrings(redactedDiff.metadata, counters);
  for (const list of Object.values(redactedDiff.classifications)) {
    for (const row of list) {
      if (row.catalogDiff) {
        redactDiffValue(row.catalogDiff, counters);
      }
      if (row.registryDiff) {
        redactDiffValue(row.registryDiff, counters);
      }
      if (row.modelDiff) {
        for (const bucket of ["added", "removed", "modified"]) {
          for (const m of row.modelDiff[bucket] || []) {
            redactDiffValue(m, counters);
          }
        }
      }
    }
  }

  const validated = validateDiff(redactedDiff);
  const stale = detectStale(validated.generatedAt, maxAgeDays);

  // F6: the raw source roots (possibly absolute host paths) are the reference
  // for relativizing absolute source-file paths. They are normalized separately
  // for emission so no absolute host prefix leaks into the report.
  const knownRoots = [validated.forkRoot, validated.referenceRoot];
  const displayForkRoot = normalizePathForDisplay(validated.forkRoot);
  const displayReferenceRoot = normalizePathForDisplay(validated.referenceRoot);

  const differences = [];

  for (const row of redactedDiff.classifications.reference_only || []) {
    const cls = classifyBucketRow(row, "reference_only", stale, counters, knownRoots);
    if (cls) differences.push({ id: row.id, ...cls });
  }
  for (const row of redactedDiff.classifications.fork_only || []) {
    const cls = classifyBucketRow(row, "fork_only", stale, counters, knownRoots);
    if (cls) differences.push({ id: row.id, ...cls });
  }
  for (const row of redactedDiff.classifications.changed || []) {
    const cls = classifyChangedRow(row, stale, counters, knownRoots);
    differences.push({ id: row.id, ...cls });
  }

  const sortedDifferences = sortById(differences);

  const byClassification = {};
  for (const c of CLASSIFICATIONS) byClassification[c] = 0;
  for (const d of sortedDifferences) {
    byClassification[d.classification] = (byClassification[d.classification] || 0) + 1;
  }

  const highRisk = sortedDifferences.filter((d) => d.risk === "high" || d.risk === "critical").length;
  const mediumRisk = sortedDifferences.filter((d) => d.risk === "medium").length;
  const lowRisk = sortedDifferences.filter((d) => d.risk === "low").length;

  const summary = {
    totalDifferences: sortedDifferences.length,
    commonIgnored: (redactedDiff.classifications.common || []).length,
    byClassification,
    byRisk: { low: lowRisk, medium: mediumRisk, high: highRisk },
  };

  return {
    metadata: {
      schemaVersion: ABSORPTION_SCHEMA_VERSION,
      consumedDiffSchemaVersion: CONSUMED_DIFF_SCHEMA_VERSION,
      forkRoot: displayForkRoot,
      referenceRoot: displayReferenceRoot,
      generatedAt: new Date().toISOString(),
      snapshotProvenance: "static-snapshot",
      snapshotCaveat: validated.snapshotCaveat,
      stale,
      redaction: {
        inputTokenShapedValues: counters.inputTokenShapedValues,
        contentsReplaced: counters.contentsReplaced,
        withheldValueEmissions: counters.withheldValueEmissions,
        byKind: counters.byKind,
        redactionsApplied: counters.inputTokenShapedValues + counters.withheldValueEmissions,
      },
    },
    summary,
    differences: sortedDifferences.map((d) => ({
      id: d.id,
      classification: d.classification,
      risk: d.risk,
      confidence: Math.round(d.confidence * 1000) / 1000,
      suggestedAction: d.suggestedAction,
      manualReviewRequired: d.manualReviewRequired,
      tags: d.tags,
      reasons: d.reasons,
      evidencePaths: d.evidencePaths,
      evidenceFiles: d.evidenceFiles,
      oldIds: d.oldIds,
      newIds: d.newIds,
      provenance: {
        bucket: d.bucket,
        snapshot: true,
        sourceRoots: [displayForkRoot, displayReferenceRoot],
      },
    })),
  };
}

// ── Markdown rendering ──────────────────────────────────────────────────

function pct(n, total) {
  if (!total) return "0%";
  return `${Math.round((n / total) * 100)}%`;
}

export function formatTriageMarkdown(report) {
  const meta = report.metadata;
  const summary = report.summary;
  const lines = [];

  lines.push("# OmniRoute Provider Absorption Triage");
  lines.push("");
  lines.push(`- **Schema Version**: \`${meta.schemaVersion}\``);
  lines.push(`- **Fork Root**: \`${meta.forkRoot}\``);
  lines.push(`- **Reference Root**: \`${meta.referenceRoot}\``);
  lines.push(`- **Generated At**: \`${meta.generatedAt}\``);
  lines.push(`- **Snapshot Provenance**: \`${meta.snapshotProvenance}\``);
  lines.push(`- **Snapshot Caveat**: ${meta.snapshotCaveat}`);
  if (meta.stale.detected) {
    if (meta.stale.unresolvedProvenance) {
      lines.push(`- **Stale Provenance**: snapshot generatedAt is missing or unparseable (source is ${meta.stale.maxAgeDays}-day cap).`);
    } else {
      lines.push(`- **Stale Provenance**: snapshot is ${meta.stale.ageDays} day(s) old (maxAgeDays=${meta.stale.maxAgeDays}).`);
    }
  }
  const total = summary.totalDifferences;
  lines.push(`- **Total Differences**: ${total}`);
  lines.push(`- **Common (ignored)**: ${summary.commonIgnored}`);
  lines.push(`- **Redactions Applied**: ${meta.redaction.redactionsApplied}`);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Classification | Count | Share |");
  lines.push("| --- | --- | --- |");
  for (const c of CLASSIFICATIONS) {
    const n = summary.byClassification[c] || 0;
    if (n > 0) lines.push(`| ${c} | ${n} | ${pct(n, total)} |`);
  }
  lines.push("");
  lines.push("| Risk | Count |");
  lines.push("| --- | --- |");
  lines.push(`| high | ${summary.byRisk.high} |`);
  lines.push(`| medium | ${summary.byRisk.medium} |`);
  lines.push(`| low | ${summary.byRisk.low} |`);
  lines.push("");

  if (report.differences.length > 0) {
    lines.push("## Differences");
    lines.push("");
    lines.push("| Provider | Classification | Risk | Confidence | Suggested Action | Manual Review |");
    lines.push("| --- | --- | --- | --- | --- | --- |");
    for (const d of report.differences) {
      lines.push(
        `| \`${d.id}\` | ${d.classification} | ${d.risk} | ${d.confidence} | ${d.suggestedAction} | ${d.manualReviewRequired ? "yes" : "no"} |`
      );
    }
    lines.push("");
  }

  for (const d of report.differences) {
    if (d.evidencePaths.length === 0) continue;
    lines.push(`### \`${d.id}\``);
    lines.push("");
    lines.push(`- **Classification**: ${d.classification}`);
    lines.push(`- **Risk**: ${d.risk}`);
    lines.push(`- **Confidence**: ${d.confidence}`);
    lines.push(`- **Suggested Action**: ${d.suggestedAction}`);
    lines.push(`- **Manual Review Required**: ${d.manualReviewRequired ? "yes" : "no"}`);
    lines.push(`- **Tags**: ${d.tags.join(", ")}`);
    if (d.oldIds.length > 0 || d.newIds.length > 0) {
      lines.push(`- **Old IDs**: ${d.oldIds.join(", ")}`);
      lines.push(`- **New IDs**: ${d.newIds.join(", ")}`);
    }
    lines.push("");
    lines.push("**Reasons**");
    lines.push("");
    for (const r of d.reasons) {
      lines.push(`- ${r}`);
    }
    lines.push("");
    lines.push("**Evidence Paths**");
    lines.push("");
    for (const p of d.evidencePaths) {
      lines.push(`- \`${p}\``);
    }
    lines.push("");
    if (d.evidenceFiles && d.evidenceFiles.length > 0) {
      lines.push("**Evidence Files**");
      lines.push("");
      for (const f of d.evidenceFiles) {
        lines.push(`- \`${f}\``);
      }
      lines.push("");
    }
  }

  if (meta.redaction.redactionsApplied > 0) {
    lines.push("## Redaction Notes");
    lines.push("");
    lines.push(`- **Redactions Applied**: ${meta.redaction.redactionsApplied}`);
    lines.push(`- **Token-shaped inputs detected**: ${meta.redaction.inputTokenShapedValues}`);
    lines.push(`- **Withheld value emissions**: ${meta.redaction.withheldValueEmissions}`);
    lines.push("");
  }

  lines.push("> This report is read-only. It does not modify fork providers, migration tasks, or changelog files. No implementation task has been created automatically.");
  lines.push("");

  return lines.join("\n");
}

// ── CLI plumbing ───────────────────────────────────────────────────────

function takeFlagValue(args, index, flag) {
  const value = args[index];
  if (value === undefined) {
    throw new Error(`Flag '${flag}' requires a value.`);
  }
  // "-" is reserved as a stdin placeholder for --diff-json only.
  if (value.startsWith("-") && !(flag === "--diff-json" && value === "-")) {
    throw new Error(`Flag '${flag}' requires a value.`);
  }
  return value;
}

function assertNonEmpty(value, flag) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new Error(`Flag '${flag}' requires a non-empty value.`);
  }
  return value;
}

function parseArgs(args) {
  let diffJson = null;
  let format = "json";
  let maxAgeDays = 90;
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (FORBIDDEN_FLAGS.includes(arg)) {
      throw new Error(`Flag '${arg}' is forbidden — this CLI is read-only.`);
    }
    if (arg === "--diff-json") {
      diffJson = takeFlagValue(args, ++i, "--diff-json");
    } else if (arg.startsWith("--diff-json=")) {
      diffJson = assertNonEmpty(arg.slice("--diff-json=".length), "--diff-json");
    } else if (arg === "--format" || arg === "-f") {
      format = takeFlagValue(args, ++i, "--format");
    } else if (arg.startsWith("--format=")) {
      format = assertNonEmpty(arg.slice("--format=".length), "--format");
    } else if (arg === "--max-age-days") {
      const raw = takeFlagValue(args, ++i, "--max-age-days");
      const n = Number.parseInt(raw, 10);
      if (!Number.isFinite(n) || n < 0) {
        throw new Error(`Flag '--max-age-days' requires a non-negative integer.`);
      }
      maxAgeDays = n;
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    } else {
      throw new Error(`Invalid flag or argument: ${arg}`);
    }
  }

  return { diffJson, format, maxAgeDays, help };
}

function printUsage() {
  return [
    "Usage: omniroute-provider-absorption [--diff-json <path|->] [options]",
    "",
    "Options:",
    "  --diff-json <path|->       Path to Task 0152 normalized diff JSON, or '-' for stdin (required)",
    "  --format, -f <json|markdown> Output format (default: json)",
    "  --max-age-days <int>       Maximum snapshot age in days before 'stale-snapshot' (default: 90)",
    "  --help, -h                 Show this help message",
    "",
    "Forbidden flags (read-only guarantee):",
    "  --apply, --write, --mutate, --create-task, --create-tasklist,",
    "  --create-changelog, --commit, --push",
    "",
    "Examples:",
    "  node bin/cli/provider-absorption.mjs --diff-json /tmp/opencode/0152-diff.json",
    "  node bin/cli/provider-absorption.mjs --diff-json - --format markdown",
  ].join("\n");
}

function readStdin() {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf-8");
    process.stdin.on("data", (chunk) => {
      data += chunk;
    });
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

function loadDiffFromFlags(opts, options) {
  if (!opts.diffJson) {
    throw new Error("Required flag '--diff-json' is missing.");
  }
  if (opts.diffJson === "-") {
    if (options && typeof options.stdin === "string") {
      return options.stdin;
    }
    return readStdin();
  }
  return readFileSync(opts.diffJson, "utf-8");
}

export async function runCli(args = process.argv.slice(2), options = {}) {
  try {
    const opts = parseArgs(args);
    if (opts.help) {
      return { stdout: printUsage(), stderr: "", exitCode: 0 };
    }
    if (opts.format !== "json" && opts.format !== "markdown") {
      throw new Error(`Unsupported format '${opts.format}'. Must be 'json' or 'markdown'.`);
    }
    const raw = await loadDiffFromFlags(opts, options);
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      throw new Error(`Input diff is not valid JSON: ${msg}`);
    }
    const report = buildReport(parsed, { maxAgeDays: opts.maxAgeDays });
    const output = opts.format === "json" ? JSON.stringify(report, null, 2) : formatTriageMarkdown(report);
    return { stdout: output, stderr: "", exitCode: 0 };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return {
      stdout: "",
      stderr: `Error: ${msg}\n\n${printUsage()}`,
      exitCode: 1,
    };
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] || "").href) {
  const result = await runCli();
  if (result.stdout) console.log(result.stdout);
  if (result.stderr) console.error(result.stderr);
  process.exitCode = result.exitCode;
}
