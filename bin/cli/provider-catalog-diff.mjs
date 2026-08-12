#!/usr/bin/env node
import { pathToFileURL } from "node:url";
import {
  compareProviderInventories,
  loadProviderInventory,
} from "./provider-catalog.mjs";

export function formatInventoryMarkdown(inventory) {
  const meta = inventory.metadata;
  const counts = inventory.counts;

  const lines = [
    "# OmniRoute Provider Inventory",
    "",
    `- **Source Kind**: \`${meta.sourceKind}\``,
    `- **Source Root**: \`${meta.sourceRoot}\``,
    `- **Generated At**: \`${meta.generatedAt}\``,
    `- **Snapshot Caveat**: ${meta.caveat}`,
    "",
    "## Inventory Counts",
    "",
    `| Metric | Count |`,
    `| --- | --- |`,
    `| UI Catalog Providers | ${counts.catalog} |`,
    `| Runtime Registry Providers | ${counts.registry} |`,
    `| Combined Unique Providers | ${counts.combined} |`,
    `| In Both Catalog & Registry | ${counts.inBoth} |`,
    `| Catalog Only | ${counts.catalogOnly} |`,
    `| Registry Only (Orphans) | ${counts.registryOnly} |`,
    "",
    "## Combined Provider List",
    "",
    `| Provider ID | Name | Category | In Catalog | In Registry | Format | Executor | Auth Type | Models |`,
    `| --- | --- | --- | --- | --- | --- | --- | --- | --- |`,
  ];

  for (const p of inventory.combined) {
    const name = p.catalog?.name || p.registry?.id || p.id;
    const category = p.catalog?.category || "-";
    const inCat = p.inCatalog ? "Yes" : "No";
    const inReg = p.inRegistry ? "Yes" : "No";
    const format = p.registry?.format || "-";
    const executor = p.registry?.executor || "-";
    const authType = p.registry?.authType || "-";
    const modelsCount = p.registry?.models ? p.registry.models.length : 0;

    lines.push(
      `| \`${p.id}\` | ${name} | ${category} | ${inCat} | ${inReg} | ${format} | ${executor} | ${authType} | ${modelsCount} |`
    );
  }

  return lines.join("\n");
}

export function formatDiffMarkdown(diff) {
  const meta = diff.metadata;
  const summary = diff.summary;
  const classifs = diff.classifications;

  const lines = [
    "# OmniRoute Provider Catalog & Registry Diff",
    "",
    `- **Fork Root**: \`${meta.forkRoot}\``,
    `- **Reference Root**: \`${meta.referenceRoot}\``,
    `- **Generated At**: \`${meta.generatedAt}\``,
    `- **Snapshot Caveat**: ${meta.snapshotCaveat}`,
    "",
    "## Summary",
    "",
    `| Classification | Count | Description |`,
    `| --- | --- | --- |`,
    `| **Fork Total** | ${summary.forkTotal} | Unique providers in fork |`,
    `| **Reference Total** | ${summary.referenceTotal} | Unique providers in reference snapshot |`,
    `| **Fork Only** | ${summary.forkOnly} | Added in fork / missing in reference |`,
    `| **Reference Only** | ${summary.referenceOnly} | Present in reference / missing in fork |`,
    `| **Common (Unchanged)** | ${summary.common} | Identical in catalog, registry, and models |`,
    `| **Changed** | ${summary.changed} | Differences in catalog metadata, registry config, or models |`,
    "",
  ];

  if (classifs.fork_only.length > 0) {
    lines.push(
      "## Fork Only (Added in Fork)",
      "",
      "| Provider ID | Name | Category | In Catalog | In Registry |",
      "| --- | --- | --- | --- | --- |"
    );
    for (const item of classifs.fork_only) {
      const name = item.catalog?.name || item.id;
      const cat = item.catalog?.category || "-";
      lines.push(
        `| \`${item.id}\` | ${name} | ${cat} | ${item.inCatalog ? "Yes" : "No"} | ${item.inRegistry ? "Yes" : "No"} |`
      );
    }
    lines.push("");
  }

  if (classifs.reference_only.length > 0) {
    lines.push(
      "## Reference Only (Missing in Fork)",
      "",
      "| Provider ID | Name | Category | In Catalog | In Registry |",
      "| --- | --- | --- | --- | --- |"
    );
    for (const item of classifs.reference_only) {
      const name = item.catalog?.name || item.id;
      const cat = item.catalog?.category || "-";
      lines.push(
        `| \`${item.id}\` | ${name} | ${cat} | ${item.inCatalog ? "Yes" : "No"} | ${item.inRegistry ? "Yes" : "No"} |`
      );
    }
    lines.push("");
  }

  if (classifs.changed.length > 0) {
    lines.push("## Changed Providers", "");
    for (const item of classifs.changed) {
      lines.push(`### \`${item.id}\``, "");

      if (item.catalogDiff) {
        lines.push("**UI Catalog Changes:**");
        for (const [field, delta] of Object.entries(item.catalogDiff)) {
          if (!delta) continue;
          if (field === "presence") {
            lines.push(`- \`presence\`: fork=\`${delta.fork ? "present" : "absent"}\` vs reference=\`${delta.reference ? "present" : "absent"}\``);
          } else {
            lines.push(`- \`${field}\`: fork=\`${delta.fork}\` vs reference=\`${delta.reference}\``);
          }
        }
        lines.push("");
      }

      if (item.registryDiff) {
        lines.push("**Runtime Registry Changes:**");
        for (const [field, delta] of Object.entries(item.registryDiff)) {
          if (!delta) continue;
          if (field === "presence") {
            lines.push(`- \`presence\`: fork=\`${delta.fork ? "present" : "absent"}\` vs reference=\`${delta.reference ? "present" : "absent"}\``);
          } else {
            lines.push(`- \`${field}\`: fork=\`${delta.fork}\` vs reference=\`${delta.reference}\``);
          }
        }
        lines.push("");
      }

      const mDiff = item.modelDiff;
      if (mDiff.added.length > 0 || mDiff.removed.length > 0 || mDiff.modified.length > 0) {
        lines.push("**Runtime Model Changes:**");
        for (const m of mDiff.added) {
          lines.push(`- **Added in fork**: \`${m.id}\` (${m.name || m.id}, context: ${m.contextLength ?? "default"})`);
        }
        for (const m of mDiff.removed) {
          lines.push(`- **Removed in fork**: \`${m.id}\` (${m.name || m.id}, context: ${m.contextLength ?? "default"})`);
        }
        for (const m of mDiff.modified) {
          lines.push(`- **Modified model \`${m.id}\`**:`);
          for (const [field, delta] of Object.entries(m.diff)) {
            lines.push(`  - \`${field}\`: fork=\`${JSON.stringify(delta.fork)}\` vs reference=\`${JSON.stringify(delta.reference)}\``);
          }
        }
        lines.push("");
      }
    }
  }

  return lines.join("\n");
}

/**
 * Read the value that follows a space-separated flag.
 * Rejects a missing value and a value that is itself a flag, so
 * `--fork-root --format json` fails loudly instead of silently consuming
 * `--format` as the root path.
 */
function takeFlagValue(args, index, flag) {
  const value = args[index];
  if (value === undefined || value.startsWith("-")) {
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
  let mode = null;
  let forkRoot = ".";
  let referenceRoot = null;
  let format = "json";
  let help = false;

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === "list" || arg === "--list") {
      mode = "list";
    } else if (arg === "diff" || arg === "--diff") {
      mode = "diff";
    } else if (arg === "--fork-root") {
      forkRoot = takeFlagValue(args, ++i, "--fork-root");
    } else if (arg.startsWith("--fork-root=")) {
      forkRoot = assertNonEmpty(arg.slice("--fork-root=".length), "--fork-root");
    } else if (arg === "--reference-root") {
      referenceRoot = takeFlagValue(args, ++i, "--reference-root");
    } else if (arg.startsWith("--reference-root=")) {
      referenceRoot = assertNonEmpty(
        arg.slice("--reference-root=".length),
        "--reference-root"
      );
    } else if (arg === "--format" || arg === "-f") {
      format = takeFlagValue(args, ++i, "--format");
    } else if (arg.startsWith("--format=")) {
      format = assertNonEmpty(arg.slice("--format=".length), "--format");
    } else if (arg === "--help" || arg === "-h") {
      help = true;
    } else {
      throw new Error(`Invalid flag or argument: ${arg}`);
    }
  }

  if (referenceRoot && !mode) {
    mode = "diff";
  }
  if (!mode) {
    mode = "list";
  }

  return { mode, forkRoot, referenceRoot, format, help };
}

function printUsage() {
  return [
    "Usage: omniroute-provider-catalog-diff [list|diff] [options]",
    "",
    "Commands:",
    "  list                      Enumerate provider catalog & registry from a single root (default)",
    "  diff                      Compare provider inventories between fork and reference root",
    "",
    "Options:",
    "  --fork-root <path>        Path to fork root directory (default: .)",
    "  --reference-root <path>   Path to reference snapshot root directory (e.g. references/diegosouzapw-omniroute)",
    "  --format, -f <json|markdown> Output format (default: json)",
    "  --help, -h                Show this help message",
    "",
    "Examples:",
    "  node bin/cli/provider-catalog-diff.mjs list --fork-root .",
    "  node bin/cli/provider-catalog-diff.mjs diff --reference-root references/diegosouzapw-omniroute -f markdown",
  ].join("\n");
}

export async function runCli(args = process.argv.slice(2)) {
  try {
    const opts = parseArgs(args);

    if (opts.help) {
      return { stdout: printUsage(), stderr: "", exitCode: 0 };
    }

    if (opts.format !== "json" && opts.format !== "markdown") {
      throw new Error(`Unsupported format '${opts.format}'. Must be 'json' or 'markdown'.`);
    }

    if (opts.mode === "list") {
      const rootToLoad = opts.referenceRoot || opts.forkRoot;
      const kind = opts.referenceRoot ? "reference" : "fork";
      const inventory = loadProviderInventory({ rootDir: rootToLoad, sourceKind: kind });

      const output =
        opts.format === "json"
          ? JSON.stringify(inventory, null, 2)
          : formatInventoryMarkdown(inventory);

      return { stdout: output, stderr: "", exitCode: 0 };
    }

    if (opts.mode === "diff") {
      const refRoot = opts.referenceRoot || "references/diegosouzapw-omniroute";
      const forkInv = loadProviderInventory({ rootDir: opts.forkRoot, sourceKind: "fork" });
      const refInv = loadProviderInventory({ rootDir: refRoot, sourceKind: "reference" });

      const diffResult = compareProviderInventories(forkInv, refInv);

      const output =
        opts.format === "json"
          ? JSON.stringify(diffResult, null, 2)
          : formatDiffMarkdown(diffResult);

      return { stdout: output, stderr: "", exitCode: 0 };
    }

    throw new Error(`Unknown mode '${opts.mode}'`);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    // Keep stdout clean so `... | jq` never receives usage text on failure;
    // diagnostics and usage both belong on stderr.
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
