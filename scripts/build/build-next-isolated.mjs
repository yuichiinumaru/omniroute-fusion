#!/usr/bin/env node

import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { pathToFileURL } from "node:url";
import {
  assembleStandalone,
  syncStandaloneNativeAssets as _syncNativeAssets,
  syncStandaloneExtraModules as _syncExtraModules,
} from "./assembleStandalone.mjs";
import { resolveBuildCpus } from "./buildConcurrency.mjs";

/**
 * Layer 1: `app/` has been renamed to `dist/` and the App-Router collision is gone.
 * Transient paths moved out during build:
 * - `.tmp/wine32` (Wine prefix used by some older build tools)
 * - `references` (workspace reference symlink that Next/NFT traces into restricted paths)
 * - `_tasks` (planning workspace, optional via OMNIROUTE_BUILD_MOVE_TASKS=1)
 */

const projectRoot = process.cwd();
const distDir = path.resolve(process.env.NEXT_DIST_DIR || ".build/next");
const backupRoot = path.join(os.tmpdir(), `omniroute-build-isolated-${process.pid}-${Date.now()}`);

export function getTransientBuildPaths(rootDir = projectRoot, env = process.env) {
  const paths = [
    {
      label: "local Wine prefix",
      sourcePath: path.join(rootDir, ".tmp", "wine32"),
      backupPath: path.join(backupRoot, "wine32"),
    },
    {
      label: "workspace references symlink",
      sourcePath: path.join(rootDir, "references"),
      backupPath: path.join(backupRoot, "references"),
    },
  ];

  if (env.OMNIROUTE_BUILD_MOVE_TASKS === "1") {
    paths.push({
      label: "task planning workspace",
      sourcePath: path.join(rootDir, "_tasks"),
      backupPath: path.join(backupRoot, "_tasks"),
    });
  }

  return paths;
}

async function exists(targetPath, fsImpl = fs) {
  try {
    const lstat = typeof fsImpl.lstat === "function" ? fsImpl.lstat.bind(fsImpl) : fs.lstat.bind(fs);
    await lstat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function movePath(sourcePath, destinationPath, fsImpl = fs) {
  const mkdir = typeof fsImpl.mkdir === "function" ? fsImpl.mkdir.bind(fsImpl) : fs.mkdir.bind(fs);
  await mkdir(path.dirname(destinationPath), { recursive: true });

  try {
    await fsImpl.rename(sourcePath, destinationPath);
  } catch (error) {
    if (error?.code !== "EXDEV") {
      throw error;
    }

    console.warn(
      `[build-next-isolated] EXDEV while moving ${sourcePath} -> ${destinationPath}; falling back to copy/remove`
    );

    const lstat = typeof fsImpl.lstat === "function" ? fsImpl.lstat.bind(fsImpl) : fs.lstat.bind(fs);
    const stat = await lstat(sourcePath);

    if (stat?.isSymbolicLink?.()) {
      const readlink = typeof fsImpl.readlink === "function" ? fsImpl.readlink.bind(fsImpl) : fs.readlink.bind(fs);
      const symlink = typeof fsImpl.symlink === "function" ? fsImpl.symlink.bind(fsImpl) : fs.symlink.bind(fs);
      const unlink = typeof fsImpl.unlink === "function" ? fsImpl.unlink.bind(fsImpl) : fs.unlink.bind(fs);

      const target = await readlink(sourcePath);
      await symlink(target, destinationPath);
      await unlink(sourcePath);
    } else {
      const cp = typeof fsImpl.cp === "function" ? fsImpl.cp.bind(fsImpl) : fs.cp.bind(fs);
      const rm = typeof fsImpl.rm === "function" ? fsImpl.rm.bind(fsImpl) : fs.rm.bind(fs);

      await cp(sourcePath, destinationPath, {
        recursive: true,
        preserveTimestamps: true,
        force: false,
        errorOnExist: true,
      });
      await rm(sourcePath, { recursive: true, force: true });
    }
  }
}

function runNextBuild() {
  return new Promise((resolve) => {
    const nextBin = path.join(projectRoot, "node_modules", "next", "dist", "bin", "next");
    const child = spawn(process.execPath, [nextBin, "build", resolveNextBuildBundlerFlag()], {
      cwd: projectRoot,
      stdio: "inherit",
      env: resolveNextBuildEnv(process.env),
    });

    const forward = (signal) => {
      if (!child.killed) child.kill(signal);
    };

    process.on("SIGINT", forward);
    process.on("SIGTERM", forward);

    child.on("exit", (code, signal) => {
      process.off("SIGINT", forward);
      process.off("SIGTERM", forward);
      if (signal) {
        resolve({ code: 1, signal });
        return;
      }
      resolve({ code: code ?? 1, signal: null });
    });
  });
}

export function resolveNextBuildBundlerFlag(baseEnv = process.env) {
  return baseEnv.OMNIROUTE_USE_TURBOPACK === "1" ? "--turbopack" : "--webpack";
}

export { resolveBuildCpus };

export function getNofileLimit(fsImpl = fs) {
  try {
    if (typeof fsImpl.readFileSync === "function") {
      const limits = fsImpl.readFileSync("/proc/self/limits", "utf8");
      const match = limits.match(/Max open files\s+(\d+)\s+(\d+)/);
      if (match) {
        return { soft: parseInt(match[1], 10), hard: parseInt(match[2], 10) };
      }
    }
  } catch {
    // Non-Linux or unreadable /proc/self/limits
  }
  return null;
}

export function checkBuildPreflight(env = process.env, log = console, fsImpl = fs) {
  const buildCpus = resolveBuildCpus(env);
  const limits = getNofileLimit(fsImpl);

  if (limits && limits.soft < 8192) {
    log.warn(
      `[build-next-isolated] Warning: open file descriptor limit (nofile soft=${limits.soft}, hard=${limits.hard}) is below recommended threshold (8192) for static generation. Concurrency set to OMNIROUTE_BUILD_CPUS=${buildCpus}. If build fails with EMFILE, lower OMNIROUTE_BUILD_CPUS or increase ulimit -n.`
    );
  }

  return { buildCpus, limits };
}

export function resolveNextBuildEnv(baseEnv = process.env) {
  const env = {
    ...baseEnv,
    NEXT_PRIVATE_BUILD_WORKER: baseEnv.NEXT_PRIVATE_BUILD_WORKER || "0",
    OMNIROUTE_BUILD_CPUS: String(resolveBuildCpus(baseEnv)),
  };

  // Raise the Node heap for the spawned `next build`. The webpack production pass
  // ("Compiling instrumentation" bundles the whole server graph) is the heaviest
  // phase and overflows V8's default ~2 GB ceiling on memory-constrained machines,
  // stalling/OOMing local `npm run build` (npm-global installs). #4076/#4104 fixed
  // this only in the Docker builder stage (ENV NODE_OPTIONS); the local/native path
  // was left unprotected. Respect an existing --max-old-space-size (Docker already
  // sets one — don't clobber/duplicate) and let OMNIROUTE_BUILD_MEMORY_MB override.
  if (!/--max-old-space-size/.test(env.NODE_OPTIONS || "")) {
    // Default 8 GB (was 4 GB): the clean module graph peaks ~3.9 GB during the webpack
    // production pass, which brushed the old 4 GB ceiling on a borderline OOM. 8 GB gives
    // headroom without risk. NOTE: heap size does NOT fix a poisoned scope — if the build
    // OOMs/livelocks far above this, check for worktrees/cruft leaking into the tsconfig
    // scope (run `npm run check:build-scope`), not for "more heap". See incident 2026-06-25.
    const heapMb = Number(baseEnv.OMNIROUTE_BUILD_MEMORY_MB) || 8192;
    env.NODE_OPTIONS = `${env.NODE_OPTIONS || ""} --max-old-space-size=${heapMb}`.trim();
  }

  return env;
}

async function resetStandaloneOutput(rootDir = projectRoot, fsImpl = fs, log = console, backupRootDir = backupRoot) {
  // Use the module-level distDir so NEXT_DIST_DIR is respected
  const resolvedDistDir =
    rootDir === projectRoot
      ? distDir
      : path.join(rootDir, process.env.NEXT_DIST_DIR || ".build/next");
  const standaloneRoot = path.join(resolvedDistDir, "standalone");
  if (!(await exists(standaloneRoot, fsImpl))) return;

  const staleStandaloneBackup = path.join(backupRootDir, "standalone-stale");

  await movePath(standaloneRoot, staleStandaloneBackup, fsImpl);
  log.log("[build-next-isolated] Moved stale standalone output out of the build path");
}

export async function recoverOrphanedReferences(
  rootDir = projectRoot,
  fsImpl = fs,
  log = console
) {
  const referencesPath = path.join(rootDir, "references");
  if (await exists(referencesPath, fsImpl)) {
    return false;
  }

  log.warn("[build-next-isolated] Workspace references symlink missing; attempting recovery...");

  try {
    const tmpDir = os.tmpdir();
    const readdir = typeof fsImpl.readdir === "function" ? fsImpl.readdir.bind(fsImpl) : fs.readdir.bind(fs);
    const tmpEntries = await readdir(tmpDir);
    const backupDirs = tmpEntries.filter((e) => e.startsWith("omniroute-build-isolated-"));

    for (const dirName of backupDirs) {
      const backupRefPath = path.join(tmpDir, dirName, "references");
      if (await exists(backupRefPath, fsImpl)) {
        log.log(`[build-next-isolated] Recovering orphaned references from ${backupRefPath}`);
        const lstat = typeof fsImpl.lstat === "function" ? fsImpl.lstat.bind(fsImpl) : fs.lstat.bind(fs);
        const stat = await lstat(backupRefPath);

        if (stat?.isSymbolicLink?.()) {
          const readlink = typeof fsImpl.readlink === "function" ? fsImpl.readlink.bind(fsImpl) : fs.readlink.bind(fs);
          const symlink = typeof fsImpl.symlink === "function" ? fsImpl.symlink.bind(fsImpl) : fs.symlink.bind(fs);
          const target = await readlink(backupRefPath);
          await symlink(target, referencesPath);
        } else {
          await movePath(backupRefPath, referencesPath, fsImpl);
        }
        log.log(`[build-next-isolated] Successfully recovered references symlink to ${referencesPath}`);
        return true;
      }
    }
  } catch (err) {
    log.warn(`[build-next-isolated] Non-fatal error searching for orphaned backup: ${err?.message}`);
  }

  try {
    const symlink = typeof fsImpl.symlink === "function" ? fsImpl.symlink.bind(fsImpl) : fs.symlink.bind(fs);
    await symlink("../legacy", referencesPath);
    log.log("[build-next-isolated] Restored missing workspace references symlink -> ../legacy");
    return true;
  } catch (err) {
    log.error(`[build-next-isolated] Failed to restore missing references symlink: ${err?.message}`);
    return false;
  }
}

export async function restoreMovedEntry(entry, fsImpl = fs, log = console) {
  if (!entry) return;

  const lstat = typeof fsImpl.lstat === "function" ? fsImpl.lstat.bind(fsImpl) : fs.lstat.bind(fs);
  const unlink = typeof fsImpl.unlink === "function" ? fsImpl.unlink.bind(fsImpl) : fs.unlink.bind(fs);
  const rm = typeof fsImpl.rm === "function" ? fsImpl.rm.bind(fsImpl) : fs.rm.bind(fs);
  const symlink = typeof fsImpl.symlink === "function" ? fsImpl.symlink.bind(fsImpl) : fs.symlink.bind(fs);
  const readlink = typeof fsImpl.readlink === "function" ? fsImpl.readlink.bind(fsImpl) : fs.readlink.bind(fs);

  if (!(await exists(entry.backupPath, fsImpl)) && (!entry.isSymlink || !entry.symlinkTarget)) {
    throw new Error(`Backup path missing for ${entry.label}: ${entry.backupPath}`);
  }

  // Remove existing sourcePath if it exists (prevent EEXIST / EXDEV on restore)
  if (await exists(entry.sourcePath, fsImpl)) {
    try {
      const srcStat = await lstat(entry.sourcePath);
      if (srcStat?.isSymbolicLink?.()) {
        await unlink(entry.sourcePath);
      } else {
        await rm(entry.sourcePath, { recursive: true, force: true });
      }
    } catch (cleanErr) {
      log.warn(`[build-next-isolated] Could not remove existing target prior to restore: ${cleanErr?.message}`);
    }
  }

  let isSymlink = entry.isSymlink;
  let target = entry.symlinkTarget;

  if (!isSymlink && (await exists(entry.backupPath, fsImpl))) {
    const backupStat = await lstat(entry.backupPath);
    if (backupStat?.isSymbolicLink?.()) {
      isSymlink = true;
      target = await readlink(entry.backupPath);
    }
  }

  if (isSymlink && target) {
    await symlink(target, entry.sourcePath);
    if (await exists(entry.backupPath, fsImpl)) {
      try {
        await unlink(entry.backupPath);
      } catch {
        // Best-effort cleanup of backup symlink
      }
    }
    log.log(`[build-next-isolated] Restored ${entry.label} (${entry.sourcePath} -> ${target})`);
  } else {
    await movePath(entry.backupPath, entry.sourcePath, fsImpl);
    log.log(`[build-next-isolated] Restored ${entry.label} to ${entry.sourcePath}`);
  }
}

export async function restoreMovedPaths(
  movedPaths,
  backupRoot,
  rootDir = projectRoot,
  fsImpl = fs,
  log = console
) {
  let allRestored = true;

  while (movedPaths.length > 0) {
    const entry = movedPaths.pop();
    if (!entry) continue;
    try {
      await restoreMovedEntry(entry, fsImpl, log);
    } catch (restoreError) {
      allRestored = false;
      log.error(
        `[build-next-isolated] Failed to restore ${entry.label} from ${entry.backupPath}:`,
        restoreError
      );
      if (process.exitCode !== undefined) {
        process.exitCode = 1;
      }
    }
  }

  // Ensure references symlink is present after every recoverable build outcome
  const referencesPath = path.join(rootDir, "references");
  if (!(await exists(referencesPath, fsImpl))) {
    try {
      const symlink = typeof fsImpl.symlink === "function" ? fsImpl.symlink.bind(fsImpl) : fs.symlink.bind(fs);
      await symlink("../legacy", referencesPath);
      log.log("[build-next-isolated] Restored fallback workspace references symlink -> ../legacy");
    } catch (fallbackErr) {
      log.error("[build-next-isolated] Failed to restore fallback references symlink:", fallbackErr);
      allRestored = false;
      if (process.exitCode !== undefined) {
        process.exitCode = 1;
      }
    }
  }

  if (allRestored) {
    try {
      const rm = typeof fsImpl.rm === "function" ? fsImpl.rm.bind(fsImpl) : fs.rm.bind(fs);
      await rm(backupRoot, { recursive: true, force: true });
    } catch (cleanupError) {
      log.warn("[build-next-isolated] Failed to clean temporary backup root:", cleanupError);
    }
  } else {
    log.warn(
      `[build-next-isolated] Preserving backup root directory at ${backupRoot} due to restoration failures`
    );
  }

  return allRestored;
}

export async function pruneStandaloneArtifacts(rootDir = projectRoot, fsImpl = fs) {
  const resolvedDistDirForPrune =
    rootDir === projectRoot
      ? distDir
      : path.join(rootDir, process.env.NEXT_DIST_DIR || ".build/next");
  const standaloneRoot = path.join(resolvedDistDirForPrune, "standalone");
  const pruneTargets = [
    path.join(standaloneRoot, "_tasks"),
    path.join(standaloneRoot, "references"),
  ];

  for (const targetPath of pruneTargets) {
    if (!(await exists(targetPath, fsImpl))) continue;
    await fsImpl.rm(targetPath, { recursive: true, force: true });
    console.log(
      `[build-next-isolated] Pruned standalone artifact: ${path.relative(rootDir, targetPath)}`
    );
  }
}

export async function syncStandaloneNativeAssets(
  rootDir = projectRoot,
  fsImpl = fs,
  log = console
) {
  return _syncNativeAssets(rootDir, fsImpl, log);
}

export async function syncStandaloneExtraModules(
  rootDir = projectRoot,
  fsImpl = fs,
  log = console
) {
  return _syncExtraModules(rootDir, fsImpl, log);
}

export async function main(options = {}) {
  const rootDir = options.rootDir || projectRoot;
  const fsImpl = options.fsImpl || fs;
  const log = options.log || console;
  const runBuild = options.runNextBuildImpl || runNextBuild;
  const env = options.env || process.env;

  // Run build preflight check for file descriptor limits vs concurrency
  checkBuildPreflight(env, log, fsImpl);

  // Recover missing references symlink if lost from prior crash/SIGKILL/OOM
  await recoverOrphanedReferences(rootDir, fsImpl, log);

  const movedPaths = [];
  const currentBackupRoot =
    options.backupRoot ||
    path.join(os.tmpdir(), `omniroute-build-isolated-${process.pid}-${Date.now()}`);
  const transientBuildPaths = getTransientBuildPaths(rootDir, env);

  let isCleaningUp = false;
  const signalHandler = async (sig) => {
    if (isCleaningUp) return;
    isCleaningUp = true;
    log.warn(`[build-next-isolated] Received ${sig}, restoring transient paths...`);
    await restoreMovedPaths(movedPaths, currentBackupRoot, rootDir, fsImpl, log);
    process.exit(1);
  };

  const registeredSignals = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (const sig of registeredSignals) {
    process.on(sig, signalHandler);
  }

  try {
    for (const entryConfig of transientBuildPaths) {
      const sourcePath = entryConfig.sourcePath;
      const backupPath = path.join(currentBackupRoot, path.relative(rootDir, sourcePath));

      if (!(await exists(sourcePath, fsImpl))) continue;

      const lstat = typeof fsImpl.lstat === "function" ? fsImpl.lstat.bind(fsImpl) : fs.lstat.bind(fs);
      const stat = await lstat(sourcePath);
      let isSymlink = false;
      let symlinkTarget = null;

      if (stat?.isSymbolicLink?.()) {
        isSymlink = true;
        const readlink = typeof fsImpl.readlink === "function" ? fsImpl.readlink.bind(fsImpl) : fs.readlink.bind(fs);
        symlinkTarget = await readlink(sourcePath);
      }

      const entry = {
        label: entryConfig.label,
        sourcePath,
        backupPath,
        isSymlink,
        symlinkTarget,
      };

      await movePath(sourcePath, backupPath, fsImpl);
      movedPaths.push(entry);
    }

    await resetStandaloneOutput(rootDir, fsImpl, log, currentBackupRoot);

    const result = await runBuild();
    const resolvedDistDir =
      rootDir === projectRoot
        ? distDir
        : path.join(rootDir, env.NEXT_DIST_DIR || ".build/next");
    const standaloneDir = path.join(resolvedDistDir, "standalone");

    if (result.code === 0 && (await exists(standaloneDir, fsImpl))) {
      try {
        const cp = typeof fsImpl.cp === "function" ? fsImpl.cp.bind(fsImpl) : fs.cp.bind(fs);
        await cp(path.join(rootDir, "docs"), path.join(standaloneDir, "docs"), {
          recursive: true,
        });
        log.log("[build-next-isolated] Copied docs/ to standalone output");
      } catch (docsCopyErr) {
        log.warn("[build-next-isolated] Non-fatal error copying docs/:", docsCopyErr?.message);
      }

      try {
        await pruneStandaloneArtifacts(rootDir, fsImpl);
      } catch (pruneErr) {
        log.warn(
          "[build-next-isolated] Non-fatal error pruning standalone artifacts:",
          pruneErr
        );
      }

      try {
        const { buildTproxyNative } = await import("./build-tproxy-native.mjs");
        const res = buildTproxyNative(rootDir);
        log.log(
          res.built
            ? "[build-next-isolated] Built TPROXY native addon (transparent.node)"
            : `[build-next-isolated] TPROXY native addon skipped: ${res.reason}`
        );
      } catch (nativeErr) {
        log.warn(
          "[build-next-isolated] Non-fatal error building TPROXY native addon:",
          nativeErr?.message
        );
      }

      try {
        log.log(
          "[build-next-isolated] Assembling standalone bundle (static + public + natives + extras)..."
        );
        assembleStandalone({
          distDir: resolvedDistDir,
          outDir: standaloneDir,
          projectRoot: rootDir,
          copyNatives: true,
        });
      } catch (assembleErr) {
        log.warn("[build-next-isolated] Non-fatal error assembling standalone:", assembleErr);
      }
    }
    process.exitCode = result.code;
  } catch (error) {
    log.error("[build-next-isolated] Build failed:", error);
    process.exitCode = 1;
  } finally {
    for (const sig of registeredSignals) {
      process.removeListener(sig, signalHandler);
    }
    await restoreMovedPaths(movedPaths, currentBackupRoot, rootDir, fsImpl, log);
  }
}

const entryScript = process.argv[1] ? pathToFileURL(process.argv[1]).href : null;

if (entryScript === import.meta.url) {
  await main();
}
