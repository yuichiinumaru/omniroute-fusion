/**
 * Plugin install path jail (F-04-W2-003).
 *
 * Only paths under configured plugin roots may be installed via MCP.
 */

import { resolve, normalize, isAbsolute, sep, join } from "path";
import { getDefaultPluginDir } from "../../../src/lib/plugins/scanner.ts";

/**
 * Allowed roots for `plugin_install` source paths.
 * - default plugins dir (`~/.omniroute/plugins`)
 * - `${DATA_DIR}/plugins` when DATA_DIR is set
 * - `${DATA_DIR|~/.omniroute}/plugin-sources` staging area
 */
export function getAllowedPluginInstallRoots(
  env: NodeJS.ProcessEnv = process.env
): string[] {
  const home = env.HOME || env.USERPROFILE || "/tmp";
  const dataDir = env.DATA_DIR?.trim() || join(home, ".omniroute");
  const roots = [
    getDefaultPluginDir(),
    join(dataDir, "plugins"),
    join(dataDir, "plugin-sources"),
    join(home, ".omniroute", "plugin-sources"),
  ];
  return Array.from(new Set(roots.map((r) => resolve(r))));
}

function isPathInsideRoot(root: string, target: string): boolean {
  const resolvedRoot = resolve(root);
  const resolvedTarget = resolve(target);
  return (
    resolvedTarget === resolvedRoot ||
    resolvedTarget.startsWith(resolvedRoot.endsWith(sep) ? resolvedRoot : resolvedRoot + sep)
  );
}

/**
 * Validate a path is safe for plugin installation.
 * Prevents directory traversal, null bytes, and paths outside plugin roots.
 */
export function validatePluginInstallPath(
  path: string,
  env: NodeJS.ProcessEnv = process.env
): string {
  if (path.includes("\0")) {
    throw new Error("Invalid path: contains null bytes");
  }
  if (!isAbsolute(path)) {
    throw new Error("Path must be absolute");
  }

  const normalized = normalize(resolve(path));
  if (normalized.includes("\0")) {
    throw new Error("Invalid path: contains null bytes");
  }

  // Reject path segments that are still traversal after normalize (paranoia)
  const parts = normalized.split(sep);
  if (parts.some((p) => p === ".." || p === "~")) {
    throw new Error("Invalid path: directory traversal detected");
  }

  const roots = getAllowedPluginInstallRoots(env);
  const allowed = roots.some((root) => isPathInsideRoot(root, normalized));
  if (!allowed) {
    throw new Error(
      "Plugin path outside allowed plugin roots. Install only from the configured plugins directory or plugin-sources staging area."
    );
  }

  return normalized;
}
