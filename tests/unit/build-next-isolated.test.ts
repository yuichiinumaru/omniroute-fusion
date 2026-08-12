import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";

const {
  checkBuildPreflight,
  getNofileLimit,
  getTransientBuildPaths,
  main,
  movePath,
  pruneStandaloneArtifacts,
  recoverOrphanedReferences,
  resolveBuildCpus,
  resolveNextBuildEnv,
  restoreMovedEntry,
  restoreMovedPaths,
  syncStandaloneNativeAssets,
} = await import("../../scripts/build/build-next-isolated.mjs");
const { resolveBuildCpus: resolveBuildCpusFromNextConfig } = await import("../../next.config.mjs");

const constrainedCapacity = { logicalCpus: 16, totalMemoryMb: 65536, nofileSoft: 4096 };

async function withTempDir(fn) {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "omniroute-build-next-isolated-"));

  try {
    await fn(tempDir);
  } finally {
    await fs.rm(tempDir, { recursive: true, force: true });
  }
}

test("movePath falls back to copy/remove when rename raises EXDEV", async () => {
  await withTempDir(async (tempDir) => {
    const sourceDir = path.join(tempDir, "app");
    const destinationDir = path.join(tempDir, ".app-build-backup");
    const nestedFile = path.join(sourceDir, "nested", "file.txt");

    await fs.mkdir(path.dirname(nestedFile), { recursive: true });
    await fs.writeFile(nestedFile, "legacy payload");

    let copyCalled = false;
    let removeCalled = false;
    const warnings = [];
    const originalWarn = console.warn;
    console.warn = (message) => warnings.push(String(message));

    try {
      await movePath(sourceDir, destinationDir, {
        rename: async () => {
          const error = new Error("cross-device link not permitted");
          error.code = "EXDEV";
          throw error;
        },
        cp: async (...args) => {
          copyCalled = true;
          return fs.cp(...args);
        },
        rm: async (...args) => {
          removeCalled = true;
          return fs.rm(...args);
        },
      });
    } finally {
      console.warn = originalWarn;
    }

    assert.equal(copyCalled, true);
    assert.equal(removeCalled, true);
    assert.equal(fsSync.existsSync(sourceDir), false);
    assert.equal(
      await fs.readFile(path.join(destinationDir, "nested", "file.txt"), "utf8"),
      "legacy payload"
    );
    assert.match(warnings[0] ?? "", /EXDEV while moving/);
  });
});

test("movePath rethrows non-EXDEV rename failures", async () => {
  await withTempDir(async (tempDir) => {
    const sourceDir = path.join(tempDir, "app");
    const destinationDir = path.join(tempDir, ".app-build-backup");

    await fs.mkdir(sourceDir, { recursive: true });

    await assert.rejects(
      movePath(sourceDir, destinationDir, {
        rename: async () => {
          const error = Object.assign(new Error("permission denied"), { code: "EACCES" });
          throw error;
        },
        cp: async () => {
          throw new Error("copy fallback should not run");
        },
        rm: async () => {
          throw new Error("remove fallback should not run");
        },
      }),
      (error) => error instanceof Error && "code" in error && error.code === "EACCES"
    );
  });
});

test("resolveNextBuildEnv forces stable build worker mode unless already provided", () => {
  const defaultEnv = resolveNextBuildEnv({ NODE_ENV: "test" });
  assert.equal(defaultEnv.NEXT_PRIVATE_BUILD_WORKER, "0");
  assert.equal(defaultEnv.NODE_ENV, "test");

  const preservedEnv = resolveNextBuildEnv({
    NODE_ENV: "production",
    NEXT_PRIVATE_BUILD_WORKER: "1",
  });
  assert.equal(preservedEnv.NEXT_PRIVATE_BUILD_WORKER, "1");
  assert.equal(preservedEnv.NODE_ENV, "production");
});

// Escalated bug (WhatsApp BR, cmqiuhd7600): a local `npm run build` stalls/OOMs
// during the webpack production pass ("Compiling instrumentation" bundles the whole
// server graph). #4076/#4104 raised the heap only in the Docker builder stage; the
// local/native path (build-next-isolated.mjs → resolveNextBuildEnv) was left on V8's
// default ~2 GB ceiling, so memory-constrained npm-global installs hit the same OOM.
test("resolveNextBuildEnv raises the Node heap for memory-constrained local builds", () => {
  const env = resolveNextBuildEnv({ NODE_ENV: "production" });
  const match = (env.NODE_OPTIONS ?? "").match(/--max-old-space-size=(\d+)/);
  assert.ok(
    match,
    "local build must set NODE_OPTIONS --max-old-space-size to avoid the webpack-pass OOM"
  );
  assert.ok(
    Number(match[1]) >= 4096,
    `build heap default must be >= 4096 MB (the V8 default ~2 GB OOMed); got ${match[1]}`
  );
});

test("resolveNextBuildEnv does not clobber an existing --max-old-space-size (Docker)", () => {
  const env = resolveNextBuildEnv({ NODE_OPTIONS: "--max-old-space-size=8192" });
  const occurrences = (env.NODE_OPTIONS.match(/--max-old-space-size=/g) || []).length;
  assert.equal(occurrences, 1, "must not duplicate the heap flag when one is already set");
  assert.match(env.NODE_OPTIONS, /--max-old-space-size=8192/);
});

test("resolveNextBuildEnv honors the OMNIROUTE_BUILD_MEMORY_MB override", () => {
  const env = resolveNextBuildEnv({ OMNIROUTE_BUILD_MEMORY_MB: "6144" });
  assert.match(env.NODE_OPTIONS, /--max-old-space-size=6144/);
});

test("getTransientBuildPaths includes references symlink by default and leaves _tasks in place", () => {
  const paths = getTransientBuildPaths("/repo", {});

  assert.deepEqual(
    paths.map((entry) => entry.label),
    ["local Wine prefix", "workspace references symlink"]
  );
  assert.equal(
    paths.some((entry) => path.basename(entry.sourcePath) === "references"),
    true
  );
  assert.equal(
    paths.some((entry) => path.basename(entry.sourcePath) === "_tasks"),
    false
  );
});

test("getTransientBuildPaths only moves _tasks when explicitly enabled", () => {
  const paths = getTransientBuildPaths("/repo", { OMNIROUTE_BUILD_MOVE_TASKS: "1" });

  assert.equal(
    paths.some((entry) => path.basename(entry.sourcePath) === "_tasks"),
    true
  );
});

test("movePath moves symbolic links without dereferencing or modifying the target", async () => {
  await withTempDir(async (tempDir) => {
    const targetDir = path.join(tempDir, "legacy-repo");
    const targetFile = path.join(targetDir, "data.txt");
    const symlinkPath = path.join(tempDir, "references");
    const backupSymlinkPath = path.join(tempDir, "backup", "references");

    await fs.mkdir(targetDir, { recursive: true });
    await fs.writeFile(targetFile, "target contents");
    await fs.symlink(targetDir, symlinkPath);

    // Verify initial symlink state
    const initialLstat = await fs.lstat(symlinkPath);
    assert.equal(initialLstat.isSymbolicLink(), true);
    assert.equal(await fs.readlink(symlinkPath), targetDir);

    // Move symlink out (e.g. before build)
    await movePath(symlinkPath, backupSymlinkPath);

    assert.equal(fsSync.existsSync(symlinkPath), false);
    const backupLstat = await fs.lstat(backupSymlinkPath);
    assert.equal(backupLstat.isSymbolicLink(), true);
    assert.equal(await fs.readlink(backupSymlinkPath), targetDir);
    assert.equal(await fs.readFile(path.join(backupSymlinkPath, "data.txt"), "utf8"), "target contents");

    // Move symlink back (e.g. in finally block)
    await movePath(backupSymlinkPath, symlinkPath);

    assert.equal(fsSync.existsSync(backupSymlinkPath), false);
    const restoredLstat = await fs.lstat(symlinkPath);
    assert.equal(restoredLstat.isSymbolicLink(), true);
    assert.equal(await fs.readlink(symlinkPath), targetDir);
    assert.equal(await fs.readFile(path.join(symlinkPath, "data.txt"), "utf8"), "target contents");
  });
});

test("movePath handles EXDEV fallback for symbolic links safely", async () => {
  await withTempDir(async (tempDir) => {
    const targetDir = path.join(tempDir, "legacy-repo");
    const symlinkPath = path.join(tempDir, "references");
    const backupSymlinkPath = path.join(tempDir, "backup", "references");

    await fs.mkdir(targetDir, { recursive: true });
    await fs.symlink(targetDir, symlinkPath);

    let copyCalled = false;

    await movePath(symlinkPath, backupSymlinkPath, {
      rename: async () => {
        const error = new Error("cross-device link not permitted");
        error.code = "EXDEV";
        throw error;
      },
      lstat: (p) => fs.lstat(p),
      readlink: (p) => fs.readlink(p),
      symlink: (target, p) => fs.symlink(target, p),
      unlink: (p) => fs.unlink(p),
      cp: async (...args) => {
        copyCalled = true;
        return fs.cp(...args);
      },
      rm: async (...args) => fs.rm(...args),
      mkdir: (p, opts) => fs.mkdir(p, opts),
    });

    assert.equal(copyCalled, false);
    assert.equal(fsSync.existsSync(symlinkPath), false);
    const backupLstat = await fs.lstat(backupSymlinkPath);
    assert.equal(backupLstat.isSymbolicLink(), true);
    assert.equal(await fs.readlink(backupSymlinkPath), targetDir);
  });
});

test("pruneStandaloneArtifacts removes traced _tasks and references from standalone output", async () => {
  await withTempDir(async (tempDir) => {
    const tracedTaskFile = path.join(tempDir, ".build", "next", "standalone", "_tasks", "plan.md");
    const tracedRefFile = path.join(tempDir, ".build", "next", "standalone", "references", "ref.md");

    await fs.mkdir(path.dirname(tracedTaskFile), { recursive: true });
    await fs.writeFile(tracedTaskFile, "transient planning artifact");

    await fs.mkdir(path.dirname(tracedRefFile), { recursive: true });
    await fs.writeFile(tracedRefFile, "transient reference artifact");

    await pruneStandaloneArtifacts(tempDir);

    assert.equal(
      fsSync.existsSync(path.join(tempDir, ".build", "next", "standalone", "_tasks")),
      false
    );
    assert.equal(
      fsSync.existsSync(path.join(tempDir, ".build", "next", "standalone", "references")),
      false
    );
  });
});

test("syncStandaloneNativeAssets copies wreq-js native runtime into standalone output", async () => {
  await withTempDir(async (tempDir) => {
    const sourceNativeFile = path.join(
      tempDir,
      "node_modules",
      "wreq-js",
      "rust",
      "wreq-js.linux-x64-gnu.node"
    );
    const destinationNativeFile = path.join(
      tempDir,
      ".build",
      "next",
      "standalone",
      "node_modules",
      "wreq-js",
      "rust",
      "wreq-js.linux-x64-gnu.node"
    );
    const logs: string[] = [];

    await fs.mkdir(path.dirname(sourceNativeFile), { recursive: true });
    await fs.writeFile(sourceNativeFile, "native module bytes");

    const changed = await syncStandaloneNativeAssets(tempDir, fs, {
      log: (message: unknown) => logs.push(String(message)),
    });

    assert.equal(changed, true);
    assert.equal(await fs.readFile(destinationNativeFile, "utf8"), "native module bytes");
    assert.match((logs[0] ?? "").replaceAll("\\", "/"), /wreq-js\/rust/);
  });
});

test("main restores references symlink and exact target when child build fails (compile error)", async () => {
  await withTempDir(async (tempDir) => {
    const legacyTargetDir = path.join(tempDir, "..", "legacy");
    const referencesSymlink = path.join(tempDir, "references");
    const originalExitCode = process.exitCode;

    try {
      await fs.mkdir(legacyTargetDir, { recursive: true });
      await fs.writeFile(path.join(legacyTargetDir, "dummy.txt"), "legacy data");
      await fs.symlink("../legacy", referencesSymlink);

      const logs: string[] = [];
      const mockLog = {
        log: (msg: unknown) => logs.push(String(msg)),
        warn: (msg: unknown) => logs.push(String(msg)),
        error: (msg: unknown) => logs.push(String(msg)),
      };

      // Run main with simulated build failure (Webpack compile error)
      await main({
        rootDir: tempDir,
        fsImpl: fs,
        log: mockLog,
        runNextBuildImpl: async () => ({ code: 1, signal: null }),
      });

      assert.equal(process.exitCode, 1);

      // Verify references symlink is restored and target is preserved exactly
      const restoredStat = await fs.lstat(referencesSymlink);
      assert.equal(restoredStat.isSymbolicLink(), true);
      assert.equal(await fs.readlink(referencesSymlink), "../legacy");
      assert.equal(
        await fs.readFile(path.join(referencesSymlink, "dummy.txt"), "utf8"),
        "legacy data"
      );

      // Verify restoration was logged clearly
      assert.ok(
        logs.some((l) => l.includes("Restored") && l.includes("references")),
        "must log restoration of references"
      );
    } finally {
      process.exitCode = originalExitCode;
      await fs.rm(legacyTargetDir, { recursive: true, force: true });
    }
  });
});

test("recoverOrphanedReferences creates fallback references symlink when missing", async () => {
  await withTempDir(async (tempDir) => {
    const referencesSymlink = path.join(tempDir, "references");
    assert.equal(fsSync.existsSync(referencesSymlink), false);

    const logs: string[] = [];
    const mockLog = {
      log: (msg: unknown) => logs.push(String(msg)),
      warn: (msg: unknown) => logs.push(String(msg)),
      error: (msg: unknown) => logs.push(String(msg)),
    };

    const recovered = await recoverOrphanedReferences(tempDir, fs, mockLog);
    assert.equal(recovered, true);

    const stat = await fs.lstat(referencesSymlink);
    assert.equal(stat.isSymbolicLink(), true);
    assert.equal(await fs.readlink(referencesSymlink), "../legacy");
    assert.ok(
      logs.some((l) => l.includes("references")),
      "must log recovery of references"
    );
  });
});

test("restoreMovedPaths preserves backup root directory if an entry fails to restore", async () => {
  await withTempDir(async (tempDir) => {
    const backupRoot = path.join(tempDir, "backup-root");
    const badBackupPath = path.join(backupRoot, "non-existent-backup");
    const logs: string[] = [];
    const mockLog = {
      log: (msg: unknown) => logs.push(String(msg)),
      warn: (msg: unknown) => logs.push(String(msg)),
      error: (msg: unknown) => logs.push(String(msg)),
    };

    await fs.mkdir(backupRoot, { recursive: true });

    // Mock an entry whose restore will fail because backup is missing
    const movedPaths = [
      {
        label: "broken test entry",
        sourcePath: path.join(tempDir, "source-file"),
        backupPath: badBackupPath,
        isSymlink: false,
        symlinkTarget: null,
      },
    ];

    const allRestored = await restoreMovedPaths(movedPaths, backupRoot, tempDir, fs, mockLog);
    assert.equal(allRestored, false);
    assert.equal(fsSync.existsSync(backupRoot), true, "backup root must be preserved when restore fails");
    assert.ok(
      logs.some((l) => l.includes("Preserving backup root directory")),
      "must log warning about preserving backup root"
    );
  });
});

test("resolveBuildCpus auto-scales within CPU, memory, and nofile limits", () => {
  assert.equal(resolveBuildCpus({}, constrainedCapacity), 8);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "" }, constrainedCapacity), 8);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "   " }, constrainedCapacity), 8);
  assert.equal(resolveBuildCpusFromNextConfig({}, constrainedCapacity), 8);

  const unconstrained = resolveBuildCpus(
    {},
    { logicalCpus: 16, totalMemoryMb: 65536, nofileSoft: 65536 }
  );
  assert.equal(unconstrained, 10, "memory budget should cap automatic workers before 80% CPU");
  assert.ok(unconstrained <= Math.floor(16 * 0.8));
});

test("resolveBuildCpus parses valid positive integer overrides", () => {
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "1" }), 1);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "2" }), 2);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "8" }), 8);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: " 16 " }), 16);
  assert.equal(resolveBuildCpusFromNextConfig({ OMNIROUTE_BUILD_CPUS: "6" }), 6);
});

test("resolveBuildCpus safely auto-scales for invalid, zero, or negative inputs", () => {
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "0" }, constrainedCapacity), 8);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "-1" }, constrainedCapacity), 8);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "-10" }, constrainedCapacity), 8);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "abc" }, constrainedCapacity), 8);
  assert.equal(resolveBuildCpus({ OMNIROUTE_BUILD_CPUS: "3.14" }, constrainedCapacity), 8);
  assert.equal(resolveBuildCpusFromNextConfig({ OMNIROUTE_BUILD_CPUS: "invalid" }, constrainedCapacity), 8);
});

test("checkBuildPreflight logs a warning when soft nofile limit is below 8192", () => {
  const warnings: string[] = [];
  const mockLog = {
    log: () => {},
    warn: (msg: unknown) => warnings.push(String(msg)),
    error: () => {},
  };

  const mockFs = {
    readFileSync: (filePath: string) => {
      if (filePath === "/proc/self/limits") {
        return "Max open files            4096                 4096                 files\n";
      }
      throw new Error("ENOENT");
    },
  };

  const res = checkBuildPreflight({ OMNIROUTE_BUILD_CPUS: "4" }, mockLog, mockFs as any);
  assert.equal(res.buildCpus, 4);
  assert.deepEqual(res.limits, { soft: 4096, hard: 4096 });
  assert.equal(warnings.length, 1);
  assert.match(warnings[0], /below recommended threshold/);
  assert.match(warnings[0], /OMNIROUTE_BUILD_CPUS=4/);
});

test("checkBuildPreflight does not warn when nofile limit is high or unreadable", () => {
  const warnings: string[] = [];
  const mockLog = {
    log: () => {},
    warn: (msg: unknown) => warnings.push(String(msg)),
    error: () => {},
  };

  const mockFsHigh = {
    readFileSync: () => "Max open files            65536                65536                files\n",
  };
  checkBuildPreflight({}, mockLog, mockFsHigh as any);
  assert.equal(warnings.length, 0);

  const mockFsError = {
    readFileSync: () => {
      throw new Error("ENOENT");
    },
  };
  checkBuildPreflight({}, mockLog, mockFsError as any);
  assert.equal(warnings.length, 0);
});
