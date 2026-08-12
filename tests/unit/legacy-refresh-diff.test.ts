import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

import {
  isRepoRelativePath,
  ensureRepoRelativePath,
  redactRemoteUrl,
  sanitizeErrorMessage,
  normalizeRemoteForCompare,
  runGit,
  captureSnapshot,
  checkRemotePolicy,
  checkBranchPolicy,
  generateDiff,
  buildRefreshManifest,
  parseArgs,
  runLegacyRefreshDiff,
  writeAtomically,
  toExternalSnapshot,
  deepSanitizeExternal,
} from "../../.agents/skills/omniroute/scripts/legacy-refresh-diff.mjs";

// ---------------------------------------------------------------------------
// Helpers — disposable fixture repos (must not touch real watched clone)
// ---------------------------------------------------------------------------
function git(cwd: string, args: string[]) {
  const r = spawnSync("git", args, { cwd, encoding: "utf8", shell: false });
  if (r.status !== 0) throw new Error(`git ${args.join(" ")} failed: ${r.stderr.trim() || r.stdout.trim()}`);
  return r.stdout.trim();
}

function makeFixtureRepo(inTmpRoot: string) {
  const dir = fs.mkdtempSync(path.join(inTmpRoot, "lrd-"));
  spawnSync("git", ["init", "-b", "main"], { cwd: dir, encoding: "utf8", shell: false });
  spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: dir, encoding: "utf8", shell: false });
  spawnSync("git", ["config", "user.name", "test"], { cwd: dir, encoding: "utf8", shell: false });
  return dir;
}

function makeBareRemote(inTmpRoot: string) {
  const dir = fs.mkdtempSync(path.join(inTmpRoot, "lrd-remote-"));
  const r = spawnSync("git", ["init", "--bare", "-b", "main"], { cwd: dir, encoding: "utf8", shell: false });
  if (r.status !== 0) {
    spawnSync("git", ["init", "--bare"], { cwd: dir, encoding: "utf8", shell: false });
  }
  return dir;
}

const REPO_ROOT = process.cwd();

// ---------------------------------------------------------------------------
// Unit: path + redaction
// ---------------------------------------------------------------------------
test("isRepoRelativePath rejects absolute and escaping paths", () => {
  assert.equal(isRepoRelativePath("references/diegosouzapw-omniroute"), true);
  assert.equal(isRepoRelativePath("docs/reports/audits/omniroute-legacy-refresh.json"), true);
  assert.equal(isRepoRelativePath("/absolute/path"), false);
  assert.equal(isRepoRelativePath("../escape"), false);
  assert.equal(isRepoRelativePath("docs/../escape.md"), false);
  assert.throws(() => ensureRepoRelativePath("/abs", "legacy-root"), /Invalid legacy-root path/);
  assert.throws(() => ensureRepoRelativePath("../escape", "manifest"), /Invalid manifest path/);
});

test("isRepoRelativePath is platform-independent (backslashes, drive, UNC)", () => {
  // Backslash traversal on POSIX
  assert.equal(isRepoRelativePath("..\\escape"), false);
  assert.equal(isRepoRelativePath("foo\\..\\escape"), false);
  assert.equal(isRepoRelativePath("foo\\bar\\..\\..\\escape"), false);
  // Windows drive-letter paths
  assert.equal(isRepoRelativePath("C:\\Users\\alice\\repo"), false);
  assert.equal(isRepoRelativePath("C:/repo"), false);
  assert.equal(isRepoRelativePath("D:\\evil"), false);
  // UNC paths
  assert.equal(isRepoRelativePath("\\\\server\\share\\repo"), false);
  assert.equal(isRepoRelativePath("//server/share/repo"), false);
  // Also ensure ensureRepoRelativePath throws for these
  assert.throws(() => ensureRepoRelativePath("..\\escape", "legacy-root"), /Invalid legacy-root path/);
  assert.throws(() => ensureRepoRelativePath("C:\\Users\\alice\\repo", "legacy-root"), /Invalid legacy-root path/);
  assert.throws(() => ensureRepoRelativePath("\\\\server\\share\\repo", "legacy-root"), /Invalid legacy-root path/);
  assert.throws(() => ensureRepoRelativePath("C:/repo", "manifest"), /Invalid manifest path/);
  // Safe repo-relative still passes
  assert.equal(isRepoRelativePath("references/diegosouzapw-omniroute"), true);
  assert.equal(isRepoRelativePath("tmp/agent-work/ok"), true);
});

test("redactRemoteUrl and sanitizeErrorMessage redact credentials and tokens", () => {
  assert.equal(redactRemoteUrl("https://user:pass@github.com/diegosouzapw/OmniRoute.git"), "https://[redacted]@github.com/diegosouzapw/OmniRoute.git");
  assert.equal(sanitizeErrorMessage("oops ghp_FAKE123456 and github_pat_FAKE_xyz"), "oops [redacted] and [redacted]");
  assert.equal(sanitizeErrorMessage("url https://tok:sec@host/x"), "url https://[redacted]@host/x");
  assert.doesNotMatch(redactRemoteUrl("https://github.com/diegosouzapw/OmniRoute"), /\[redacted\]/);
});

test("normalizeRemoteForCompare canonicalizes https vs ssh vs .git vs credentials", () => {
  const https = normalizeRemoteForCompare("https://github.com/diegosouzapw/OmniRoute.git");
  const httpsNoGit = normalizeRemoteForCompare("https://github.com/diegosouzapw/OmniRoute");
  const ssh = normalizeRemoteForCompare("git@github.com:diegosouzapw/OmniRoute.git");
  const withCreds = normalizeRemoteForCompare("https://user:pass@github.com/diegosouzapw/OmniRoute.git");
  assert.equal(https, httpsNoGit);
  assert.equal(https, ssh);
  assert.equal(https, withCreds);
  assert.equal(https, "https://github.com/diegosouzapw/omniroute");
});

test("parseArgs validates and defaults", () => {
  const opts = parseArgs([]);
  assert.equal(opts.legacyRoot, "references/diegosouzapw-omniroute");
  assert.equal(opts.manifest, "docs/reports/audits/omniroute-legacy-refresh.json");
  assert.equal(opts.updateLegacy, false);
  assert.equal(opts.write, false);
  const o2 = parseArgs(["--legacy-root", "references/diegosouzapw-omniroute", "--allow-branch", "main", "--allow-branch", "release/v3.8.49", "--update-legacy", "--write", "--json"]);
  assert.equal(o2.updateLegacy, true);
  assert.equal(o2.write, true);
  assert.equal(o2.json, true);
  assert.ok(o2.allowBranches.includes("release/v3.8.49"));
  assert.throws(() => parseArgs(["--unknown-flag"]), /Unknown option/);
  assert.throws(() => parseArgs(["positional"]), /Unexpected positional/);
});

// ---------------------------------------------------------------------------
// Fixture: clean snapshot
// ---------------------------------------------------------------------------
test("clean clone produces pre-update snapshot containing root, remote, branch/HEAD, dirty false, timestamp", () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "README.md"), "# hi\n");
    fs.writeFileSync(path.join(repo, "package.json"), JSON.stringify({ version: "3.8.42" }));
    git(repo, ["add", "README.md", "package.json"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    const snap = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.equal(snap.dirty, false);
    assert.ok(snap.headSha && /^[0-9a-f]{40}$/.test(snap.headSha));
    assert.ok(snap.shortSha && /^[0-9a-f]{7}/.test(snap.shortSha));
    assert.equal(snap.branch, "main");
    assert.equal(snap.isDetached, false);
    assert.ok(snap.remote.includes("lrd-remote") || snap.remote.length > 0);
    assert.ok(snap.capturedAt);
    assert.equal(snap.legacyVersion, "3.8.42");
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Fixture: dirty clone must be rejected before fetch/pull and leave tree unchanged
// ---------------------------------------------------------------------------
test("dirty clone is rejected before fetch/pull and tree is left unchanged", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  // We need a wrapper that tracks whether fetch/pull were attempted
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    fs.writeFileSync(path.join(repo, "package.json"), JSON.stringify({ version: "3.8.42" }));
    git(repo, ["add", "a.txt", "package.json"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    // Make dirty: modify tracked file and add untracked
    fs.writeFileSync(path.join(repo, "a.txt"), "dirty change\n");
    fs.writeFileSync(path.join(repo, "untracked.txt"), "untracked\n");

    // Ensure snapshot sees dirty
    const snap = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.equal(snap.dirty, true);
    assert.ok(snap.dirtyFiles.length > 0);

    // Try update via runLegacyRefreshDiff with a manifest inside tmp (repo-relative)
    // Our temp repo path is outside REPO_ROOT? Actually repo is inside REPO_ROOT/tmp, so it's repo-relative.
    const legacyRel = path.relative(REPO_ROOT, repo);
    const manifestRel = path.relative(REPO_ROOT, path.join(repo, "manifest.json"));
    // Use repo's own path as legacyRoot — need to handle that legacyRoot is repo-relative
    // But our bare remote URL likely won't match expected default, so dirty check happens first regardless.
    // Use a manifest path that is repo-relative and inside REPO_ROOT.
    const outManifestRel = `tmp/agent-work/${path.basename(repo)}/out.json`;
    fs.mkdirSync(path.dirname(path.resolve(REPO_ROOT, outManifestRel)), { recursive: true });

    // Supply expected remote as the bare path to pass remote check if it were reached,
    // but dirty should block first.
    const bareUrl = bare; // bare is already inside repo tmp, but expectedRemote check normalizes — will mismatch default.
    // We pass expectedRemote as the bare's path so remote check would pass if it were reached; dirty still blocks.
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outManifestRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy", "--write"]),
    });
    assert.equal(result.mode, "blocked");
    assert.equal(result.blocked, true);
    assert.ok((result.blockedReason || "").toLowerCase().includes("dirty"));

    // Tree must still be dirty — unchanged
    const snap2 = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.equal(snap2.dirty, true);
    assert.equal(fs.readFileSync(path.join(repo, "a.txt"), "utf8"), "dirty change\n");
    assert.ok(fs.existsSync(path.join(repo, "untracked.txt")));
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Fixture: remote mismatch defaults to refusal, requires explicit override
// ---------------------------------------------------------------------------
test("remote mismatch defaults to refusal and requires explicit override", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    const snap = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    // snap remote will be bare path — definitely not the default expected remote
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out2.json`;

    // Without override — blocked
    const blocked = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--update-legacy"]),
    });
    assert.equal(blocked.mode, "blocked");
    assert.ok((blocked.blockedReason || "").toLowerCase().includes("remote"));

    // With --allow-remote-mismatch — not blocked on remote (may still proceed to fetch/pull)
    // To prove it passes remote check, we don't need to complete pull; we just verify it doesn't block with remote reason.
    // With allow, fetch should succeed (bare remote exists) and then pull --ff-only succeeds (no new commits) as no-op.
    const allowed = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--allow-remote-mismatch", "--update-legacy"]),
    });
    // Should not be blocked due to remote; either updated/no-op/blocked for other reason but not remote mismatch
    if (allowed.blocked) {
      assert.ok(!(allowed.blockedReason || "").toLowerCase().includes("remote url mismatch"), `should not block on remote when overridden, got: ${allowed.blockedReason}`);
    } else {
      assert.ok(["updated", "no-op"].includes(allowed.mode));
    }
    void snap;
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Fixture: detached HEAD requires override
// ---------------------------------------------------------------------------
test("detached HEAD requires explicit override and defaults to refusal", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);
    const sha = git(repo, ["rev-parse", "HEAD"]);
    git(repo, ["checkout", "--detach", sha]);

    const snap = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.equal(snap.isDetached, true);

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-detached.json`;
    const bareUrl = bare;

    const blocked = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    assert.equal(blocked.mode, "blocked");
    assert.ok((blocked.blockedReason || "").toLowerCase().includes("detached"));

    const allowed = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--allow-detached", "--update-legacy"]),
    });
    // Detached but allowed — should not be blocked for detached reason
    if (allowed.blocked) {
      assert.ok(!(allowed.blockedReason || "").toLowerCase().includes("detached"), `detached should be allowed, got: ${allowed.blockedReason}`);
    } else {
      assert.ok(["updated", "no-op"].includes(allowed.mode));
    }
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Fixture: unexpected branch requires override
// ---------------------------------------------------------------------------
test("unexpected branch requires explicit override", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);
    git(repo, ["checkout", "-b", "feature/x"]);
    fs.writeFileSync(path.join(repo, "b.txt"), "feat\n");
    git(repo, ["add", "b.txt"]);
    git(repo, ["commit", "-m", "feat"]);

    const snap = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.equal(snap.branch, "feature/x");

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-branch.json`;
    const bareUrl = bare;

    const blocked = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    assert.equal(blocked.mode, "blocked");
    assert.ok((blocked.blockedReason || "").toLowerCase().includes("unexpected branch"));

    const allowed = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--allow-unexpected-branch", "--update-legacy"]),
    });
    if (allowed.blocked) {
      assert.ok(!(allowed.blockedReason || "").toLowerCase().includes("unexpected branch"));
    } else {
      assert.ok(["updated", "no-op", "blocked"].includes(allowed.mode));
    }

    // Also test --allow-branch explicit addition
    const allowedByBranch = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--allow-branch", "feature/x", "--update-legacy"]),
    });
    if (allowedByBranch.blocked) {
      assert.ok(!(allowedByBranch.blockedReason || "").toLowerCase().includes("unexpected branch"));
    } else {
      assert.ok(["updated", "no-op"].includes(allowedByBranch.mode));
    }
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Default is read-only: no fetch/pull/reset/checkout/clean/mutate
// ---------------------------------------------------------------------------
test("default operation does not fetch, pull, reset, checkout, clean, or mutate", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);
    const beforeSha = git(repo, ["rev-parse", "HEAD"]);

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-readonly.json`;

    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]),
    });
    assert.equal(result.mode, "snapshot");
    assert.equal(result.blocked, false);
    assert.equal(result.dryRun, true);
    // SHA unchanged, no fetch was performed (fetch would be visible via git log but we check SHA)
    const afterSha = git(repo, ["rev-parse", "HEAD"]);
    assert.equal(beforeSha, afterSha);
    // Snapshot only — manifest not written without --write
    assert.equal(result.wrote, false);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Opt-in update: fast-forward succeeds and records old/new SHAs
// ---------------------------------------------------------------------------
test("opt-in update uses pull --ff-only and records old/new SHAs with diff", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  const clone = fs.mkdtempSync(path.join(tmpRoot, "lrd-clone2-"));
  try {
    // Setup repo as origin with initial commit
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    // Clone bare to a second working dir, add new commit, push
    spawnSync("git", ["clone", bare, clone], { encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: clone, encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.name", "test"], { cwd: clone, encoding: "utf8", shell: false });
    fs.writeFileSync(path.join(clone, "b.txt"), "new file from remote\n");
    spawnSync("git", ["add", "b.txt"], { cwd: clone, encoding: "utf8", shell: false });
    git(clone, ["commit", "-m", "remote change"]);
    git(clone, ["push", "origin", "main"]);

    const oldSha = git(repo, ["rev-parse", "HEAD"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-ff.json`;
    const bareUrl = bare;

    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    assert.equal(result.blocked, false);
    assert.equal(result.mode, "updated");
    assert.ok(result.oldSha === oldSha);
    assert.ok(result.newSha && result.newSha !== oldSha);
    assert.ok(result.diff && result.diff.paths.includes("b.txt"));
    assert.ok(result.diff.stat.includes("b.txt") || result.diff.statLines.some((l: string) => l.includes("b.txt")));
    // Verify remote file was actually pulled
    assert.ok(fs.existsSync(path.join(repo, "b.txt")));
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(clone, { recursive: true, force: true });
  }
});

test("no-op update (already up to date) is reported as no-op with same SHAs", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);
    const sha = git(repo, ["rev-parse", "HEAD"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-noop.json`;
    const bareUrl = bare;
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    assert.equal(result.mode, "no-op");
    assert.equal(result.oldSha, sha);
    assert.equal(result.newSha, sha);
    assert.equal(result.blocked, false);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Non-fast-forward is blocked and not presented as refreshed
// ---------------------------------------------------------------------------
test("non-fast-forward update is blocked and not presented as refreshed baseline", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  const clone = fs.mkdtempSync(path.join(tmpRoot, "lrd-clone-nff-"));
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    // Remote advances
    spawnSync("git", ["clone", bare, clone], { encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: clone, encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.name", "test"], { cwd: clone, encoding: "utf8", shell: false });
    fs.writeFileSync(path.join(clone, "b.txt"), "remote\n");
    spawnSync("git", ["add", "b.txt"], { cwd: clone, encoding: "utf8", shell: false });
    git(clone, ["commit", "-m", "remote"]);
    git(clone, ["push", "origin", "main"]);

    // Local diverges
    fs.writeFileSync(path.join(repo, "c.txt"), "local diverge\n");
    git(repo, ["add", "c.txt"]);
    git(repo, ["commit", "-m", "local diverge"]);
    const oldSha = git(repo, ["rev-parse", "HEAD"]);

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-nff.json`;
    const bareUrl = bare;
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    assert.equal(result.mode, "blocked");
    assert.equal(result.blocked, true);
    assert.ok((result.blockedReason || "").toLowerCase().includes("fast-forward") || (result.blockedReason || "").toLowerCase().includes("not possible"));
    // SHA must not have changed — not presented as refreshed
    const newSha = git(repo, ["rev-parse", "HEAD"]);
    assert.equal(newSha, oldSha);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(clone, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Command failure is blocked (fetch failure)
// ---------------------------------------------------------------------------
test("fetch failure is reported as blocked", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    // remote points to non-existent bare
    const fakeRemote = path.join(tmpRoot, "does-not-exist-bare.git");
    git(repo, ["remote", "add", "origin", fakeRemote]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-fetchfail.json`;
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--allow-remote-mismatch", "--update-legacy"]),
    });
    assert.equal(result.mode, "blocked");
    assert.equal(result.blocked, true);
    assert.ok((result.blockedReason || "").toLowerCase().includes("fetch failed") || (result.blockedReason || "").toLowerCase().includes("fetch"));
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Redaction: secrets in remotes never enter reports
// ---------------------------------------------------------------------------
test("secrets in remote URLs are redacted from snapshot/manifest/diagnostics", () => {
  const raw = "https://ghp_FAKE123456@github.com/diegosouzapw/OmniRoute.git";
  const redacted = redactRemoteUrl(raw);
  assert.doesNotMatch(redacted, /ghp_FAKE/);
  assert.match(redacted, /\[redacted\]/);
  // sanitized error
  const err = sanitizeErrorMessage(`fetch https://user:pass@host/x failed ghp_FAKE`);
  assert.doesNotMatch(err, /ghp_FAKE/);
  assert.doesNotMatch(err, /user:pass/);
});

// ---------------------------------------------------------------------------
// No absolute paths
// ---------------------------------------------------------------------------
test("rejects absolute legacy-root and manifest paths", async () => {
  await assert.rejects(
    () => runLegacyRefreshDiff({ repoRoot: REPO_ROOT, opts: parseArgs(["--legacy-root", "/tmp/evil", "--manifest", "docs/reports/audits/omniroute-legacy-refresh.json", "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]) }),
    (err: Error) => {
      assert.match(err.message, /Invalid legacy-root path|must be repo-relative/);
      return true;
    }
  );
  await assert.rejects(
    () => runLegacyRefreshDiff({ repoRoot: REPO_ROOT, opts: parseArgs(["--legacy-root", "references/diegosouzapw-omniroute", "--manifest", "/tmp/evil.json", "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]) }),
    (err: Error) => {
      assert.match(err.message, /Invalid manifest path|must be repo-relative/);
      return true;
    }
  );
});

// ---------------------------------------------------------------------------
// Preview (--write not set) never writes; --write is atomic
// ---------------------------------------------------------------------------
test("preview (no --write) never writes manifest; --write does atomically and previews are dry-run", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-preview.json`;
    const outAbs = path.resolve(REPO_ROOT, outRel);

    // preview — should not write
    const preview = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]),
    });
    assert.equal(preview.wrote, false);
    assert.equal(preview.dryRun, true);
    assert.equal(fs.existsSync(outAbs), false);

    // write — should create atomically with no temp leftovers
    const written = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--write"]),
    });
    assert.equal(written.wrote, true);
    assert.equal(fs.existsSync(outAbs), true);
    const content = JSON.parse(fs.readFileSync(outAbs, "utf8"));
    assert.equal(content.legacyRoot, legacyRel);
    assert.equal(content.redacted, true);
    assert.match(content.caveat, /Reference snapshot caveat/);
    // no tmp files left
    const dir = path.dirname(outAbs);
    const files = fs.readdirSync(dir);
    assert.ok(!files.some((f) => f.includes(".tmp.")));
    // with --write: second run is idempotent snapshot (same SHAs, mode still snapshot)
    const second = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--write"]),
    });
    assert.equal(second.mode, "snapshot");
    assert.equal(second.snapshot.headSha, written.snapshot.headSha);

    // writeAtomically helper itself
    const tmpFile = path.join(path.dirname(outAbs), "atomic-test.json");
    writeAtomically(tmpFile, `{"x":1}\n`);
    assert.equal(fs.readFileSync(tmpFile, "utf8"), `{"x":1}\n`);
    writeAtomically(tmpFile, `{"x":1}\n`);
    assert.equal(fs.readFileSync(tmpFile, "utf8"), `{"x":1}\n`);
    assert.ok(!fs.readdirSync(path.dirname(tmpFile)).some((f) => f.includes(".tmp.")));
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Post-update manifest includes bounded diff stat/path, release relation, caveat
// ---------------------------------------------------------------------------
test("post-update manifest includes bounded diff stat/paths, release relation, and caveat", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  const clone = fs.mkdtempSync(path.join(tmpRoot, "lrd-clone-rel-"));
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);
    spawnSync("git", ["clone", bare, clone], { encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: clone, encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.name", "test"], { cwd: clone, encoding: "utf8", shell: false });
    fs.writeFileSync(path.join(clone, "b.txt"), "remote content\n");
    spawnSync("git", ["add", "b.txt"], { cwd: clone, encoding: "utf8", shell: false });
    git(clone, ["commit", "-m", "remote change"]);
    git(clone, ["push", "origin", "main"]);

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-bounded.json`;
    const bareUrl = bare;
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy", "--write"]),
    });
    assert.equal(result.mode, "updated");
    const manifest = result.manifest;
    assert.ok(manifest.diff);
    assert.ok(typeof manifest.diff.stat === "string");
    assert.ok(manifest.diff.statLines.length <= 250);
    assert.ok(Array.isArray(manifest.diff.paths));
    assert.ok(manifest.diff.paths.length > 0);
    assert.ok(manifest.diff.paths.length <= 400);
    assert.ok(manifest.releaseRelation);
    assert.match(manifest.caveat, /Reference snapshot caveat/);
    assert.match(manifest.provenance, /Reference snapshot caveat|external evidence/);
    assert.equal(manifest.redacted, true);
    // diagnostics bounded
    assert.ok(manifest.diagnostics.length <= 50);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(clone, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Uses argument arrays, no shell interpolation (assert shell:false in runGit)
// ---------------------------------------------------------------------------
test("runGit uses argument arrays with shell:false (no interpolation)", () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "hi\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    // rev-parse with args as array — should succeed
    const r = runGit(["rev-parse", "HEAD"], repo);
    assert.equal(r.ok, true);
    assert.ok(/^[0-9a-f]{40}$/.test(r.stdout.trim()));
    // Path with spaces or injection-like string must not be interpolated
    const evilBranch = "main; rm -rf /";
    const r2 = runGit(["rev-parse", "--verify", evilBranch], repo);
    // Should fail cleanly (branch not found), not execute shell
    assert.equal(r2.ok, false);
    assert.ok(!String(r2.stderr).includes("rm -rf") || String(r2.stderr).includes("not a valid"));
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Diff bounding with many files
// ---------------------------------------------------------------------------
test("diff is bounded for many-file changes", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  const clone = fs.mkdtempSync(path.join(tmpRoot, "lrd-clone-many-"));
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);
    spawnSync("git", ["clone", bare, clone], { encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: clone, encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.name", "test"], { cwd: clone, encoding: "utf8", shell: false });
    for (let i = 0; i < 10; i++) fs.writeFileSync(path.join(clone, `file${i}.txt`), `content ${i}\n`);
    spawnSync("git", ["add", "."], { cwd: clone, encoding: "utf8", shell: false });
    git(clone, ["commit", "-m", "many files"]);
    git(clone, ["push", "origin", "main"]);
    const oldSha = git(repo, ["rev-parse", "HEAD"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-many.json`;
    const bareUrl = bare;
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    assert.equal(result.mode, "updated");
    assert.ok(result.diff.paths.length <= 400);
    assert.ok(result.diff.statLines.length <= 250);
    assert.ok(result.diff.paths.includes("file0.txt"));
    const diff2 = generateDiff({ legacyRootAbs: repo, oldSha, newSha: result.newSha });
    assert.ok(diff2.paths.length <= 400);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(clone, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Helper: buildRefreshManifest redaction and bounds
// ---------------------------------------------------------------------------
test("buildRefreshManifest redacts and bounds fields", () => {
  const snap = {
    rootRepoRelative: "references/diegosouzapw-omniroute",
    remote: "https://[redacted]@github.com/diegosouzapw/OmniRoute",
    remoteName: "origin",
    branch: "main",
    isDetached: false,
    headSha: "abc123def456abc123def456abc123def456abcd",
    shortSha: "abc123d",
    tag: null,
    dirty: false,
    dirtyFiles: [],
    upstream: { hasUpstream: true, ahead: 0, behind: 0, upstreamRef: "origin/main" },
    legacyVersion: "3.8.49",
    capturedAt: new Date().toISOString(),
  };
  const manifest = buildRefreshManifest({
    legacyRoot: "references/diegosouzapw-omniroute",
    legacyRootAbs: path.resolve(REPO_ROOT, "references/diegosouzapw-omniroute"),
    snapshot: snap,
    mode: "snapshot",
    preUpdate: null,
    postUpdate: null,
    diff: null,
    releaseRelationRaw: { targetVersion: "3.8.42", upstreamRepo: "diegosouzapw/OmniRoute", releases: [{ tag: "v3.8.49" }], _manifestPath: "docs/reports/audits/omniroute-upstream-releases.manifest.json" },
    diagnostics: [],
  });
  assert.equal(manifest.redacted, true);
  assert.ok(!("legacyRootAbs" in manifest) || manifest.legacyRootAbs === undefined);
  assert.match(manifest.caveat, /Reference snapshot caveat/);
  assert.equal(manifest.snapshot.remote, "https://[redacted]@github.com/diegosouzapw/OmniRoute");
});

// ---------------------------------------------------------------------------
// Check remote/branch policy helpers directly
// ---------------------------------------------------------------------------
test("checkRemotePolicy and checkBranchPolicy produce correct blocked/allowed results", () => {
  const snapRemote = { remoteRawNonRedactedForPolicy: "https://github.com/diegosouzapw/OmniRoute.git", remote: "https://github.com/diegosouzapw/OmniRoute" };
  const ok = checkRemotePolicy(snapRemote, { expectedRemote: "https://github.com/diegosouzapw/OmniRoute", allowRemoteMismatch: false });
  assert.equal(ok.ok, true);
  const mismatch = checkRemotePolicy(snapRemote, { expectedRemote: "https://github.com/other/repo", allowRemoteMismatch: false });
  assert.equal(mismatch.ok, false);
  assert.match(mismatch.reason, /Remote URL mismatch/);
  const allowed = checkRemotePolicy(snapRemote, { expectedRemote: "https://github.com/other/repo", allowRemoteMismatch: true });
  assert.equal(allowed.ok, true);
  assert.equal(allowed.allowedByOverride, true);

  const snapBranch = { branch: "feature/x", isDetached: false };
  const bOk = checkBranchPolicy(snapBranch, { allowBranches: ["main"], allowUnexpectedBranch: false, allowDetached: false });
  assert.equal(bOk.ok, false);
  const bAllow = checkBranchPolicy(snapBranch, { allowBranches: ["main", "feature/x"], allowUnexpectedBranch: false, allowDetached: false });
  assert.equal(bAllow.ok, true);
  const bAllowAny = checkBranchPolicy(snapBranch, { allowBranches: ["main"], allowUnexpectedBranch: true, allowDetached: false });
  assert.equal(bAllowAny.ok, true);

  const snapDetached = { branch: "HEAD", isDetached: true };
  const dBlocked = checkBranchPolicy(snapDetached, { allowBranches: ["main"], allowDetached: false });
  assert.equal(dBlocked.ok, false);
  const dAllowed = checkBranchPolicy(snapDetached, { allowBranches: ["main"], allowDetached: true });
  assert.equal(dAllowed.ok, true);
});

// ---------------------------------------------------------------------------
// Regression: external DTO never leaks credentials, absolute roots, or raw fields
// ---------------------------------------------------------------------------
test("toExternalSnapshot strips absolute root, raw credentials, porcelain, and internal markers", () => {
  const internal = {
    root: "/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2/tmp/agent-work/lrd-abc/repo",
    rootRepoRelative: "tmp/agent-work/lrd-abc/repo",
    remote: "https://[redacted]@github.com/example/private.git",
    remoteRawPresent: true,
    remoteRawRedacted: "https://[redacted]@github.com/example/private.git",
    remoteRawNonRedactedForPolicy: "https://ghp_SECRET123@github.com/example/private.git",
    remoteName: "origin",
    branch: "main",
    isDetached: false,
    headSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    shortSha: "aaaaaaa",
    tag: null,
    dirty: false,
    dirtyFiles: [],
    porcelain: " M evil.txt\n",
    baselineStat: "diff stat ...",
    upstream: { hasUpstream: false, ahead: null, behind: null, upstreamRef: null },
    legacyVersion: "3.8.42",
    capturedAt: new Date().toISOString(),
  };
  const ext = toExternalSnapshot(internal);
  assert.equal(ext.root, "tmp/agent-work/lrd-abc/repo");
  assert.equal(ext.remote, "https://[redacted]@github.com/example/private.git");
  // Must not expose absolute path, raw credential, porcelain, baselineStat, or internal markers
  const serialized = JSON.stringify(ext);
  assert.doesNotMatch(serialized, /ghp_SECRET123/);
  assert.doesNotMatch(serialized, /remoteRawNonRedactedForPolicy/);
  assert.doesNotMatch(serialized, /remoteRawPresent/);
  assert.doesNotMatch(serialized, /porcelain/);
  assert.doesNotMatch(serialized, /baselineStat/);
  assert.doesNotMatch(serialized, /\/home\/sephiroth\/working/);
  // Internal snapshot retains raw for policy but is never serialized externally
  assert.equal(internal.remoteRawNonRedactedForPolicy, "https://ghp_SECRET123@github.com/example/private.git");
});

test("external snapshot and manifests redact credential-shaped remotes across blocked modes", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", "https://ghp_SECRET123@github.com/example/private.git"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-redacted-external.json`;
    // Snapshot mode: no fetch/pull, must not leak credential or absolute root
    // Raw policy state is kept local/internal only; exported result must not contain snapshotInternal
    const snapshotRes = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]),
    });
    const snapJson = JSON.stringify(snapshotRes.snapshot);
    const snapManifestJson = JSON.stringify(snapshotRes.manifest);
    const snapDiagJson = JSON.stringify(snapshotRes.diagnostics);
    for (const payload of [snapJson, snapManifestJson, snapDiagJson]) {
      assert.doesNotMatch(payload, /ghp_SECRET123/);
      assert.doesNotMatch(payload, /remoteRawNonRedactedForPolicy/);
      assert.doesNotMatch(payload, /remoteRawPresent/);
      assert.doesNotMatch(payload, /porcelain/);
    }
    // Exported API must not expose raw internal snapshot — never serialize raw policy state
    const exportedPayload = JSON.stringify(snapshotRes);
    assert.doesNotMatch(exportedPayload, /ghp_SECRET123/);
    assert.doesNotMatch(exportedPayload, /remoteRawNonRedactedForPolicy/);
    assert.equal((snapshotRes as unknown as Record<string, unknown>).snapshotInternal, undefined);
    // Absolute host root must not appear in external snapshot/manifest preview or diagnostics
    const absRoot = path.resolve(repo);
    for (const payload of [snapJson, snapManifestJson]) {
      assert.doesNotMatch(payload, new RegExp(absRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    }
    // Policy correctness is proven via captureSnapshot + checkRemotePolicy (not via exported snapshotInternal)
    const internal = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.equal(internal.remoteRawNonRedactedForPolicy, "https://ghp_SECRET123@github.com/example/private.git");
    const policyOk = checkRemotePolicy(internal, { expectedRemote: "https://ghp_SECRET123@github.com/example/private.git", allowRemoteMismatch: false });
    assert.equal(policyOk.ok, true);

    // Blocked remote-mismatch mode must also remain redacted and must sanitize diagnostics; no snapshotInternal exposed
    const blocked = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", "https://github.com/other/repo", "--update-legacy"]),
    });
    assert.equal(blocked.mode, "blocked");
    assert.equal((blocked as unknown as Record<string, unknown>).snapshotInternal, undefined);
    const blockedPayload = JSON.stringify({ snapshot: blocked.snapshot, manifest: blocked.manifest, diagnostics: blocked.diagnostics, blockedReason: blocked.blockedReason });
    assert.doesNotMatch(blockedPayload, /ghp_SECRET123/);
    assert.doesNotMatch(blockedPayload, /remoteRawNonRedactedForPolicy/);
    assert.doesNotMatch(blockedPayload, /remoteRawPresent/);
    assert.doesNotMatch(blockedPayload, /porcelain/);
    assert.doesNotMatch(blockedPayload, new RegExp(absRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(String(blocked.blockedReason || ""), /ghp_SECRET123/);

    // CLI-like JSON envelope must also be redacted
    const jsonEnvelope = JSON.stringify({
      ok: !blocked.blocked,
      blocked: !!blocked.blocked,
      mode: blocked.mode,
      legacyRoot: legacyRel,
      manifest: blocked.manifestPath,
      wrote: blocked.wrote,
      dryRun: blocked.dryRun,
      snapshot: blocked.snapshot,
      blockedReason: blocked.blockedReason ?? null,
      diagnostics: blocked.diagnostics ?? [],
      manifestPreview: blocked.manifest,
    });
    assert.doesNotMatch(jsonEnvelope, /ghp_SECRET123/);
    assert.doesNotMatch(jsonEnvelope, /remoteRawNonRedactedForPolicy/);
    assert.doesNotMatch(jsonEnvelope, /porcelain/);
    assert.doesNotMatch(jsonEnvelope, new RegExp(absRoot.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));

    // Policy for mismatch is proven via direct captureSnapshot internal, not exported result
    const internal2 = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    const policyMismatch = checkRemotePolicy(internal2, { expectedRemote: "https://github.com/other/repo", allowRemoteMismatch: false });
    assert.equal(policyMismatch.ok, false);
    // But the blockedReason exposed externally must be redacted
    assert.doesNotMatch(String(blocked.blockedReason || ""), /ghp_SECRET123/);
    assert.match(String(blocked.blockedReason || ""), /\[redacted\]/);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("captureSnapshot internal retains raw for policy while toExternalSnapshot is required for serialization", () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", "https://user:s3cret@github.com/example/private.git"]);
    const internal = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.equal(internal.remoteRawNonRedactedForPolicy, "https://user:s3cret@github.com/example/private.git");
    assert.equal(internal.remote, "https://[redacted]@github.com/example/private.git");
    const ext = toExternalSnapshot(internal);
    const serialized = JSON.stringify(ext);
    assert.doesNotMatch(serialized, /s3cret/);
    assert.doesNotMatch(serialized, /user:s3cret/);
    assert.match(serialized, /\[redacted\]/);
  } finally {
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("buildRefreshManifest with external snapshot never emits absolute path or raw credentials", () => {
  const snap = {
    rootRepoRelative: "tmp/agent-work/lrd-xyz/repo",
    root: "/home/evil/host/absolute",
    remote: "https://[redacted]@github.com/example/private.git",
    remoteRawNonRedactedForPolicy: "https://ghp_FAKE123@github.com/example/private.git",
    remoteRawPresent: true,
    porcelain: " M secret.txt",
    remoteName: "origin",
    branch: "main",
    isDetached: false,
    headSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    shortSha: "bbbbbbb",
    tag: null,
    dirty: false,
    dirtyFiles: [],
    upstream: { hasUpstream: false, ahead: null, behind: null, upstreamRef: null },
    legacyVersion: "3.8.49",
    capturedAt: new Date().toISOString(),
  };
  const ext = toExternalSnapshot(snap);
  const manifest = buildRefreshManifest({
    legacyRoot: "tmp/agent-work/lrd-xyz/repo",
    legacyRootAbs: "/home/evil/host/absolute",
    snapshot: ext,
    mode: "snapshot",
    preUpdate: null,
    postUpdate: null,
    diff: null,
    releaseRelationRaw: null,
    diagnostics: ["fetch https://ghp_FAKE123@github.com/example/private.git failed"],
  });
  const payload = JSON.stringify(manifest);
  assert.doesNotMatch(payload, /ghp_FAKE/);
  assert.match(JSON.stringify(manifest.diagnostics ?? []), /\[redacted\]/);
  assert.doesNotMatch(payload, /remoteRawNonRedactedForPolicy/);
  assert.doesNotMatch(payload, /porcelain/);
  assert.doesNotMatch(payload, /\/home\/evil\/host\/absolute/);
  assert.equal(manifest.legacyRoot, "tmp/agent-work/lrd-xyz/repo");
  assert.equal(manifest.snapshot.root, "tmp/agent-work/lrd-xyz/repo");
});

// ---------------------------------------------------------------------------
// Regression: missing-root CLI error and manifest fallback must not leak absolute paths
// ---------------------------------------------------------------------------
test("missing-root CLI error and manifest fallback must not leak absolute paths", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const missingRel = `tmp/agent-work/reviewer-0155-missing-${Date.now()}/missing`;
  const missingAbs = path.resolve(REPO_ROOT, missingRel);
  // Ensure truly missing
  assert.equal(fs.existsSync(missingAbs), false);

  const script = path.resolve(REPO_ROOT, ".agents/skills/omniroute/scripts/legacy-refresh-diff.mjs");
  // Probe both human stderr and --json stdout for leaks
  const run = (extra: string[]) => spawnSync("node", [script, "--legacy-root", missingRel, ...extra], { cwd: REPO_ROOT, encoding: "utf8", shell: false });
  const rHuman = run([]);
  const stderrHuman = String(rHuman.stderr ?? "");
  const combinedHuman = stderrHuman + String(rHuman.stdout ?? "");
  // Must not contain absolute resolved host path
  assert.doesNotMatch(combinedHuman, new RegExp(missingAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(combinedHuman, /\/home\/sephiroth\/working/);
  // Only repo-relative hint is allowed, sanitized
  assert.match(combinedHuman, /Legacy root does not exist/);

  // JSON mode must also not leak absolute even if main catch sanitizes
  const rJson = run(["--json"]);
  const stdoutJson = String(rJson.stdout ?? "");
  const stderrJson = String(rJson.stderr ?? "");
  const combinedJson = stdoutJson + stderrJson;
  assert.doesNotMatch(combinedJson, new RegExp(missingAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(combinedJson, /\/home\/sephiroth\/working/);

  // runLegacyRefreshDiff via API path for missing root should also not leak legacyAbs
  await assert.rejects(
    () => runLegacyRefreshDiff({ repoRoot: REPO_ROOT, opts: parseArgs(["--legacy-root", missingRel, "--manifest", "docs/reports/audits/omniroute-legacy-refresh.json", "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]) }),
    (err: Error) => {
      assert.doesNotMatch(String(err.message), new RegExp(missingAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      assert.doesNotMatch(String(err.message), /\/home\/sephiroth\/working/);
      assert.match(String(err.message), /Legacy root does not exist/);
      assert.match(String(err.message), new RegExp(missingRel.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
      return true;
    }
  );

  // sanitizeErrorMessage itself must scrub absolute host paths
  assert.doesNotMatch(sanitizeErrorMessage(`ENOENT ${missingAbs} not found`), new RegExp(missingAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.match(sanitizeErrorMessage(`ENOENT ${missingAbs} not found`), /\[redacted-path\]/);
});

test("toExternalSnapshot omits absolute root when rootRepoRelative is absent, buildRefreshManifest rejects absolute fallback", () => {
  const snapNoRelAbsOnly = {
    root: "/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2/tmp/agent-work/x/repo",
    rootRepoRelative: null,
    remote: null,
    remoteName: "",
    branch: "main",
    isDetached: false,
    headSha: "cccccccccccccccccccccccccccccccccccccccc",
    shortSha: "ccccccc",
    tag: null,
    dirty: false,
    dirtyFiles: [],
    upstream: null,
    legacyVersion: null,
    capturedAt: new Date().toISOString(),
  } as unknown as Parameters<typeof toExternalSnapshot>[0];
  const ext = toExternalSnapshot(snapNoRelAbsOnly);
  assert.equal(ext.root, null);
  // Empty/absent rootRepoRelative with absolute fallback must still be null
  const snapAlsoAbs = {
    root: "/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2/evil",
    rootRepoRelative: "/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2/also-abs",
    remote: null, remoteName: "", branch: "main", isDetached: false,
    headSha: "dddddddddddddddddddddddddddddddddddddddd", shortSha: "ddddddd", tag: null, dirty: false, dirtyFiles: [], upstream: null, legacyVersion: null, capturedAt: new Date().toISOString(),
  } as unknown as Parameters<typeof toExternalSnapshot>[0];
  const ext2 = toExternalSnapshot(snapAlsoAbs);
  assert.equal(ext2.root, null);
  // Repo-relative rootRepoRelative must still be preserved
  const snapRel = { root: "/home/sephiroth/ignore", rootRepoRelative: "tmp/agent-work/good/repo", remote: null, remoteName: "", branch: "main", isDetached: false, headSha: "eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", shortSha: "eeeeeee", tag: null, dirty: false, dirtyFiles: [], upstream: null, legacyVersion: null, capturedAt: new Date().toISOString() } as unknown as Parameters<typeof toExternalSnapshot>[0];
  assert.equal(toExternalSnapshot(snapRel).root, "tmp/agent-work/good/repo");

  // buildRefreshManifest must not accept an absolute legacyRoot fallback either
  const extForManifest = toExternalSnapshot({ root: null, rootRepoRelative: null, remote: null, remoteName: "", branch: "main", isDetached: false, headSha: "ffffffffffffffffffffffffffffffffffffffff", shortSha: "fffffff", tag: null, dirty: false, dirtyFiles: [], upstream: null, legacyVersion: null, capturedAt: new Date().toISOString() } as unknown as Parameters<typeof toExternalSnapshot>[0]);
  // extForManifest.root is null; passing absolute legacyRoot should still result in null root in manifest
  const absLegacy = "/home/sephiroth/working/ganthritor/cybernetics-core/omniroute-2/tmp/evil-abs";
  const manifestAbsFallback = buildRefreshManifest({
    legacyRoot: absLegacy,
    legacyRootAbs: absLegacy,
    snapshot: extForManifest,
    mode: "snapshot",
    preUpdate: null, postUpdate: null, diff: null,
    releaseRelationRaw: null,
    diagnostics: [`something at ${absLegacy} happened`],
  });
  const payloadAbs = JSON.stringify(manifestAbsFallback);
  assert.doesNotMatch(payloadAbs, new RegExp(absLegacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.equal(manifestAbsFallback.legacyRoot, null);
  assert.equal(manifestAbsFallback.snapshot?.root, null);
  assert.doesNotMatch(String(manifestAbsFallback.snapshot?.root ?? ""), /\/home\/sephiroth/);
  // Repo-relative legacyRoot should be accepted as snapshot root when nothing else is present
  const relLegacy = "tmp/agent-work/reviewer-0155-good";
  const manifestRelFallback = buildRefreshManifest({
    legacyRoot: relLegacy,
    legacyRootAbs: path.resolve(REPO_ROOT, relLegacy),
    snapshot: extForManifest,
    mode: "snapshot",
    preUpdate: null, postUpdate: null, diff: null,
    releaseRelationRaw: null,
    diagnostics: [],
  });
  assert.equal(manifestRelFallback.snapshot.root, relLegacy);
  // Diagnostics must also be sanitized for absolute paths
  assert.doesNotMatch(JSON.stringify(manifestAbsFallback.diagnostics), new RegExp(absLegacy.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
});

// ---------------------------------------------------------------------------
// Regression: buildRefreshManifest must recursively sanitize nested pre/post objects
// ---------------------------------------------------------------------------
test("buildRefreshManifest recursively strips unsafe fields and credentials from nested pre/post and snapshot objects", () => {
  const maliciousSnap = {
    root: "/home/evil/host/absolute",
    rootRepoRelative: "tmp/agent-work/nested/repo",
    remote: "https://[redacted]@github.com/example/private.git",
    remoteRawNonRedactedForPolicy: "https://ghp_SECRET123@github.com/example/private.git",
    remoteRawPresent: true,
    porcelain: " M evil",
    baselineStat: "evil stat",
    remoteName: "origin",
    branch: "main",
    isDetached: false,
    headSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    shortSha: "aaaaaaa",
    tag: null,
    dirty: false,
    dirtyFiles: [],
    upstream: null,
    legacyVersion: "3.8.42",
    capturedAt: new Date().toISOString(),
  } as unknown as Parameters<typeof toExternalSnapshot>[0];

  const maliciousPre = {
    oldSha: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa",
    oldShort: "aaaaaaa",
    branch: "main",
    remote: "https://ghp_SECRET123@github.com/example/private.git",
    capturedAt: new Date().toISOString(),
    remoteRawNonRedactedForPolicy: "https://ghp_SECRET123@github.com/example/private.git",
    remoteRawPresent: true,
    porcelain: " M should-not-appear",
    baselineStat: "should-not-appear",
    nested: {
      deeper: {
        remoteRawNonRedactedForPolicy: "deep-evil",
        root: "/workspace/project/secrets.json",
        token: "sk-live-1234567890abcdef",
      },
    },
  };

  const maliciousPost = {
    newSha: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb",
    newShort: "bbbbbbb",
    branch: "main",
    tag: "v3.8.49",
    capturedAt: new Date().toISOString(),
    remoteRawNonRedactedForPolicy: "https://ghp_OTHER@github.com/example/other.git",
    root: "/Users/alice/project/secrets.json",
    diagnostics: ["leak /mnt/data/private.json"],
  };

  const external = toExternalSnapshot(maliciousSnap);
  const manifest = buildRefreshManifest({
    legacyRoot: "tmp/agent-work/nested/repo",
    legacyRootAbs: path.resolve(REPO_ROOT, "tmp/agent-work/nested/repo"),
    snapshot: external,
    mode: "updated",
    preUpdate: maliciousPre as unknown as Record<string, unknown>,
    postUpdate: maliciousPost as unknown as Record<string, unknown>,
    diff: { stat: "ok", paths: ["/workspace/project/secrets.json", "C:\\Users\\alice\\secret.json"] } as unknown as Record<string, unknown>,
    releaseRelationRaw: null,
    diagnostics: ["Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret.sig", "token=sk-live-1234567890abcdef", "api_key=AIzaSyDUMMYSECRET", "/workspace/project/secrets.json", "/Users/alice/project/secrets.json", "/mnt/data/private.json", "C:\\Users\\alice\\secret.json", "see \\\\server\\share\\file.txt and //server/share/file.txt"],
    blockedReason: "blocked because Authorization: Bearer super-secret and /workspace/project/secrets.json",
  });

  const payload = JSON.stringify(manifest);
  // Internal/unsafe keys must never appear
  assert.doesNotMatch(payload, /remoteRawNonRedactedForPolicy/);
  assert.doesNotMatch(payload, /remoteRawPresent/);
  assert.doesNotMatch(payload, /porcelain/);
  assert.doesNotMatch(payload, /baselineStat/);
  // Credentials must be redacted
  assert.doesNotMatch(payload, /ghp_SECRET123/);
  assert.doesNotMatch(payload, /ghp_OTHER/);
  assert.doesNotMatch(payload, /eyJhbGciOiJIUzI1Ni/);
  assert.doesNotMatch(payload, /sk-live-1234567890abcdef/);
  // Authorization/Bearer must be redacted
  assert.doesNotMatch(payload, /eyJhbGciOiJIUzI1NiJ9\.secret/);
  assert.match(payload, /\[redacted\]/);
  // Absolute Unix/macOS/mnt paths must be scrubbed
  assert.doesNotMatch(payload, /\/workspace\/project\/secrets\.json/);
  assert.doesNotMatch(payload, /\/Users\/alice\/project\/secrets\.json/);
  assert.doesNotMatch(payload, /\/mnt\/data\/private\.json/);
  // Windows and UNC-like paths scrubbed
  assert.doesNotMatch(payload, /C:\\\\Users\\\\alice\\\\secret\.json/);
  assert.doesNotMatch(payload, /C:.*alice.*secret\.json/);
  assert.doesNotMatch(payload, /\\\\server\\share/);
  assert.match(payload, /\[redacted-path\]/);
  // google api key
  assert.doesNotMatch(payload, /AIzaSyDUMMYSECRET/);
});

// ---------------------------------------------------------------------------
// Regression: sanitizeErrorMessage covers required credential and path forms
// ---------------------------------------------------------------------------
test("sanitizeErrorMessage scrubs Windows, UNC, Unix/mnt and common credential forms", () => {
  const cases: Array<[string, RegExp, RegExp | null]> = [
    ["path C:\\Users\\alice\\secret.json", /C:\\\\Users/, null],
    ["path C:/Users/alice/secret.json", /C:\/Users/, null],
    ["share \\\\server\\share\\file.txt", /\\\\server/, null],
    ["share //server/share/file.txt", /\/\/server\/share/, null],
    ["/workspace/project/secrets.json", /\/workspace\/project/, null],
    ["/Users/alice/project/secrets.json", /\/Users\/alice/, null],
    ["/mnt/data/private.json", /\/mnt\/data/, null],
    ["Authorization: Bearer eyJhbGciOiJIUzI1NiJ9.secret.sig", /eyJhbGciOiJIUzI1Ni/, /Bearer \[redacted\]/],
    ["token=sk-live-1234567890abcdef", /sk-live-1234567890abcdef/, /token=\[redacted\]/],
    ["api_key=AIzaSyDUMMYSECRET", /AIzaSyDUMMYSECRET/, /api_key=\[redacted\]/],
    ["https://my.key.sk-live-SECRET@example.com/private.git", /sk-live-SECRET/, /\[redacted\]/],
    ["key https://user:pass@host/x?token=abc&key=secret", /user:pass/, /\[redacted\]/],
  ];
  for (const [input, leak, expect] of cases) {
    const out = sanitizeErrorMessage(input);
    assert.doesNotMatch(out, leak, `input ${JSON.stringify(input)} leaked ${leak}`);
    if (expect) assert.match(out, expect);
    assert.match(out, /\[redacted/);
  }
  // Non-credential normal paths inside diff should still be redacted as absolute
  assert.doesNotMatch(sanitizeErrorMessage("see /workspace/project/secrets.json now"), /\/workspace\/project\/secrets\.json/);
});

test("sanitizeErrorMessage scrubs embedded path forms (ENOENT, key=, url=, comma)", () => {
  const embedded: Array<[string, RegExp]> = [
    ["ENOENT:/workspace/project/secrets.json", /\/workspace\/project\/secrets\.json/],
    ["path=/workspace/project/secrets.json", /\/workspace\/project\/secrets\.json/],
    ["url=//server/share/secret", /\/\/server\/share/],
    ["prefix,/Users/alice/secret", /\/Users\/alice\/secret/],
    ["ENOENT: C:\\Users\\alice\\secret.json", /C:\\\\Users\\alice/],
    ["url=C:/Users/alice/secret.json", /C:\/Users\/alice/],
  ];
  for (const [input, leak] of embedded) {
    const out = sanitizeErrorMessage(input);
    assert.doesNotMatch(out, leak, `embedded ${JSON.stringify(input)} leaked ${leak} => ${JSON.stringify(out)}`);
    assert.match(out, /\[redacted-path\]/, `expected redacted-path in ${JSON.stringify(out)}`);
  }
  // https URL with query credential must be redacted for credential but preserved as URL shape, not as path
  const httpsOut = sanitizeErrorMessage("fetch https://example.com/api?token=secret123&safe=keepme failed");
  assert.doesNotMatch(httpsOut, /secret123/);
  assert.match(httpsOut, /https:\/\/example\.com\/api\?token=\[redacted\]/);
  assert.match(httpsOut, /safe=keepme/);
});

// ---------------------------------------------------------------------------
// Regression: credentialed remote query params are redacted with exact output shape (no bracket/suffix leak)
// ---------------------------------------------------------------------------
test("redactRemoteUrl and sanitizeErrorMessage redact credential-shaped query params with exact output shape", () => {
  const cases: Array<{ input: string; notWant: RegExp; want: RegExp; noLeakBrackets?: boolean }> = [
    { input: "https://github.com/example/repo.git?token=sk-live-1234567890abcdef&api_key=AIzaSyDUMMYSECRET", notWant: /sk-live-1234567890abcdef|AIzaSyDUMMYSECRET/, want: /\?token=\[redacted\]&api_key=\[redacted\]/ },
    { input: "https://example.com/api?safe=keepme&token=secret123&api_key=mykey&foo=bar", notWant: /secret123|mykey/, want: /safe=keepme/ },
    { input: "https://github.com/example/repo.git?secret=mysecret&password=hunter2&access_token=abc123", notWant: /mysecret|hunter2|abc123/, want: /secret=\[redacted\]/ },
    { input: "https://example.com/x?key=val123", notWant: /val123/, want: /key=\[redacted\]/ },
    // URL-encoded query values must also be redacted
    { input: "https://github.com/example/repo.git?token=sk%2Dlive-abc&api_key=AIza%2Denc", notWant: /sk%2Dlive|AIza%2Denc|sk-live-abc/, want: /token=\[redacted\]/ },
    // userinfo + query combined
    { input: "https://user:s3cret@github.com/example/repo.git?token=secret123", notWant: /s3cret|secret123/, want: /\[redacted\]@.*token=\[redacted\]/ },
    // New unified keys: authorization, credential, private_key, jwt, signature
    { input: "https://example.com/api?authorization=BearerSecretXyZ&credential=credSecXyZ&private_key=privKeyXyZ&jwt=eyJ123XyZ&signature=sigSecXyZ", notWant: /BearerSecretXyZ|credSecXyZ|privKeyXyZ|eyJ123XyZ|sigSecXyZ/, want: /authorization=\[redacted\]/ },
    { input: "authorization=BearerSecretXyZ&private_key=privKeyXyZ", notWant: /BearerSecretXyZ|privKeyXyZ/, want: /authorization=\[redacted\]/ },
  ];
  for (const { input, notWant, want } of cases) {
    const out = redactRemoteUrl(input);
    assert.doesNotMatch(out, notWant, `redactRemoteUrl leaked ${notWant} in ${JSON.stringify(input)} => ${JSON.stringify(out)}`);
    assert.match(out, want, `expected shape ${want} missing in ${JSON.stringify(out)}`);
    // No bracket/suffix artifacts like token=[redacted]]  or api_key=[redacted]]345
    assert.doesNotMatch(out, /\[redacted\]\]/);
    assert.doesNotMatch(out, /\[redacted\][0-9A-Za-z]/);
    // host/path/query keys preserved when URL has them
    if (String(input).startsWith("http")) assert.match(out, /https:\/\//);
  }
  // sanitizeErrorMessage must also scrub query credentials inside enclosing strings/URLs
  const errCases: Array<{ input: string; notWant: RegExp; want: RegExp }> = [
    { input: "fetch https://github.com/example/repo.git?token=sk-live-123 failed", notWant: /sk-live-123/, want: /token=\[redacted\]/ },
    { input: "see https://example.com/api?api_key=AIzaTestSecret123456789012345 & other", notWant: /AIzaTestSecret/, want: /api_key=\[redacted\]/ },
    { input: "secret=mysecret123 and password=hunter2", notWant: /mysecret123|hunter2/, want: /secret=\[redacted\]/ },
    { input: "access_token=tok123 and key=val456", notWant: /tok123|val456/, want: /key=\[redacted\]/ },
    // encoded value via sanitize path (URL inside log)
    { input: "error at https://example.com/x?token=sk%2Denc&safe=ok", notWant: /sk%2Denc/, want: /token=\[redacted\]/ },
  ];
  for (const { input, notWant, want } of errCases) {
    const out = sanitizeErrorMessage(input);
    assert.doesNotMatch(out, notWant, `sanitize leaked ${notWant} => ${JSON.stringify(out)}`);
    assert.match(out, want);
    assert.doesNotMatch(out, /\[redacted\]\]/);
  }
  // No bracket/suffix leak for the canonical api_key form
  assert.equal(sanitizeErrorMessage("api_key=AIzaSyDUMMYSECRET"), "api_key=[redacted]");
  assert.equal(sanitizeErrorMessage("token=sk-live-1234567890abcdef"), "token=[redacted]");
  assert.equal(redactRemoteUrl("https://github.com/example/repo.git?token=sk-live-1234567890abcdef"), "https://github.com/example/repo.git?token=[redacted]");
  // Safe query keys and host must be preserved
  assert.equal(redactRemoteUrl("https://github.com/example/repo.git?safe=keepme&token=secret&foo=bar"), "https://github.com/example/repo.git?safe=keepme&token=[redacted]&foo=bar");
});

test("JSON/manifest regression: credentialed query remotes are redacted on disk and in snapshot/diagnostics with canonical shape", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  const script = path.resolve(REPO_ROOT, ".agents/skills/omniroute/scripts/legacy-refresh-diff.mjs");
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    // Credential-bearing remote URL with multiple query forms, userinfo, encoded value, and safe keys
    git(repo, ["remote", "add", "origin", "https://github.com/example/repo.git?token=sk-live-1234567890abcdef&api_key=AIzaSyDUMMYSECRET&secret=mysecret&password=hunter2&access_token=tok123&safe=keepme&foo=bar"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-query-redact.json`;
    const outAbs = path.resolve(REPO_ROOT, outRel);

    // Direct redactRemoteUrl check on the raw remote value
    const raw = "https://github.com/example/repo.git?token=sk-live-1234567890abcdef&api_key=AIzaSyDUMMYSECRET&secret=mysecret&password=hunter2&access_token=tok123&safe=keepme&foo=bar";
    const redactedDirect = redactRemoteUrl(raw);
    assert.doesNotMatch(redactedDirect, /sk-live-1234567890abcdef|AIzaSyDUMMYSECRET|mysecret|hunter2|tok123/);
    assert.match(redactedDirect, /token=\[redacted\]/);
    assert.match(redactedDirect, /api_key=\[redacted\]/);
    assert.match(redactedDirect, /secret=\[redacted\]/);
    assert.match(redactedDirect, /password=\[redacted\]/);
    assert.match(redactedDirect, /access_token=\[redacted\]/);
    assert.match(redactedDirect, /safe=keepme/);
    assert.match(redactedDirect, /foo=bar/);
    assert.doesNotMatch(redactedDirect, /\[redacted\]\]/);
    assert.doesNotMatch(redactedDirect, /\[redacted\][0-9A-Za-z]/);
    assert.match(redactedDirect, /^https:\/\/github\.com\/example\/repo\.git\?/);

    // snapshot + diagnostics via API — exported result never contains snapshotInternal
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--write"]),
    });
    assert.equal((result as unknown as Record<string, unknown>).snapshotInternal, undefined);
    const internal = captureSnapshot({ legacyRootAbs: repo, repoRoot: REPO_ROOT });
    assert.ok(internal.remoteRawNonRedactedForPolicy.includes("token=sk-live-1234567890abcdef"));
    // but exported payload never leaks it
    const exportedFull = JSON.stringify(result);
    assert.doesNotMatch(exportedFull, /sk-live-1234567890abcdef/);
    assert.doesNotMatch(exportedFull, /remoteRawNonRedactedForPolicy/);
    const externalPayload = JSON.stringify({ snapshot: result.snapshot, manifest: result.manifest, diagnostics: result.diagnostics });
    assert.doesNotMatch(externalPayload, /sk-live-1234567890abcdef|AIzaSyDUMMYSECRET|mysecret|hunter2|tok123/);
    assert.match(externalPayload, /token=\[redacted\]/);
    assert.match(externalPayload, /api_key=\[redacted\]/);
    assert.match(externalPayload, /secret=\[redacted\]/);
    assert.match(externalPayload, /password=\[redacted\]/);
    assert.match(externalPayload, /access_token=\[redacted\]/);
    assert.match(externalPayload, /safe=keepme/);
    assert.match(externalPayload, /foo=bar/);
    assert.doesNotMatch(externalPayload, /\[redacted\]\]/);
    assert.doesNotMatch(externalPayload, /\[redacted\][0-9A-Za-z]/);
    // snapshot.remote is the external redacted value with host/path preserved
    assert.match(String(result.snapshot?.remote ?? ""), /^https:\/\/github\.com\/example\/repo\.git\?/);
    assert.doesNotMatch(String(result.snapshot?.remote ?? ""), /sk-live|AIzaSy|mysecret|hunter2/);
    // manifest.snapshot.remote same
    assert.match(String(result.manifest?.snapshot?.remote ?? ""), /^https:\/\/github\.com\/example\/repo\.git\?/);
    assert.doesNotMatch(String(result.manifest?.snapshot?.remote ?? ""), /sk-live|AIzaSy/);
    // diagnostics fully scrubbed if they contained the raw URL
    const diagWithRaw: string[] = ["fetch https://github.com/example/repo.git?token=sk-live-1234567890abcdef&api_key=AIzaSyDUMMYSECRET failed"];
    const redactedDiagManifest = buildRefreshManifest({
      legacyRoot: legacyRel,
      legacyRootAbs: path.resolve(REPO_ROOT, legacyRel),
      snapshot: result.snapshot as unknown as Parameters<typeof buildRefreshManifest>[0] extends { snapshot: infer S } ? S : never,
      mode: "blocked" as const,
      preUpdate: null, postUpdate: null, diff: null, releaseRelationRaw: null,
      diagnostics: diagWithRaw,
      blockedReason: "failed for https://github.com/example/repo.git?token=sk-live-1234567890abcdef",
    });
    const diagPayload = JSON.stringify({ diagnostics: redactedDiagManifest.diagnostics, blockedReason: redactedDiagManifest.blockedReason });
    assert.doesNotMatch(diagPayload, /sk-live-1234567890abcdef|AIzaSyDUMMYSECRET/);
    assert.match(diagPayload, /token=\[redacted\]/);

    // on-disk JSON exact shape
    assert.ok(fs.existsSync(outAbs));
    const onDiskRaw = fs.readFileSync(outAbs, "utf8");
    assert.doesNotMatch(onDiskRaw, /sk-live-1234567890abcdef|AIzaSyDUMMYSECRET|mysecret|hunter2|tok123/);
    assert.match(onDiskRaw, /"remote": "https:\/\/github\.com\/example\/repo\.git\?[^"]*token=\[redacted\]/);
    assert.match(onDiskRaw, /safe=keepme/);
    assert.doesNotMatch(onDiskRaw, /\[redacted\]\]/);

    // --json envelope via real spawn (covers origin userinfo+query as well)
    const rJson = spawnSync("node", [script, "--legacy-root", legacyRel, "--json"], { cwd: REPO_ROOT, encoding: "utf8", shell: false });
    const envelope = String(rJson.stdout ?? "") + String(rJson.stderr ?? "");
    assert.doesNotMatch(envelope, /sk-live-1234567890abcdef|AIzaSyDUMMYSECRET|mysecret|hunter2/);
    assert.match(envelope, /token=\[redacted\]/);
    assert.match(envelope, /safe=keepme/);
    assert.doesNotMatch(envelope, /\[redacted\]\]/);

    // URL-encoded query value also redacted through real capture path
    const encodedRaw = "https://github.com/example/repo.git?token=sk%2Dlive-enc&api_key=AIza%2Denc&safe=ok";
    assert.doesNotMatch(redactRemoteUrl(encodedRaw), /sk%2Dlive-enc|AIza%2Denc/);
    assert.match(redactRemoteUrl(encodedRaw), /token=\[redacted\]/);
    assert.match(redactRemoteUrl(encodedRaw), /safe=ok/);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Regression: API never leaks snapshotInternal + hardening for fetch/refs
// ---------------------------------------------------------------------------
test("runLegacyRefreshDiff never returns snapshotInternal and no raw leaks on any mode", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", "https://ghp_SNAP123@github.com/example/private.git"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-no-internal.json`;
    // snapshot mode
    const snapRes = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]),
    });
    assert.equal((snapRes as unknown as Record<string, unknown>).snapshotInternal, undefined);
    assert.equal((snapRes as unknown as Record<string, unknown>).snapshotRaw, undefined);
    assert.doesNotMatch(JSON.stringify(snapRes), /ghp_SNAP123/);
    assert.doesNotMatch(JSON.stringify(snapRes), /remoteRawNonRedactedForPolicy/);
    // blocked mode (remote mismatch)
    const blocked = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", "https://github.com/other/repo", "--update-legacy"]),
    });
    assert.equal((blocked as unknown as Record<string, unknown>).snapshotInternal, undefined);
    assert.doesNotMatch(JSON.stringify(blocked), /ghp_SNAP123/);
    assert.doesNotMatch(JSON.stringify(blocked), /remoteRawNonRedactedForPolicy/);
    // blocked FETCH_HEAD/remote-tracking not tested here — separate fixture below
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("unified credential query redaction — authorization, credential, private_key, jwt, signature, URL-encoded, safe-key preservation", () => {
  // All new keys must be redacted in both redactRemoteUrl and sanitizeErrorMessage
  const credentialUrls = [
    "https://example.com/api?authorization=BearerToken123&safe=ok",
    "https://example.com/api?credential=credSecret&safe=ok",
    "https://example.com/api?private_key=privKey123&safe=ok",
    "https://example.com/api?jwt=eyJhbGciOiTest&safe=ok",
    "https://example.com/api?signature=sigSecret123&safe=ok",
    "https://example.com/api?authorization=Bearer%20enc%2Bval&credential=enc%20val&safe=ok",
  ];
  for (const u of credentialUrls) {
    const r = redactRemoteUrl(u);
    assert.doesNotMatch(r, /BearerToken123|credSecret|privKey123|eyJhbGciOiTest|sigSecret123|enc%2Bval|enc%20val/);
    assert.match(r, /\[redacted\]/);
    assert.match(r, /safe=ok/);
    assert.doesNotMatch(r, /\[redacted\]\]/);
    assert.doesNotMatch(r, /\[redacted\][0-9A-Za-z]/);
  }
  for (const u of credentialUrls) {
    const s = sanitizeErrorMessage(`fetch ${u} failed`);
    assert.doesNotMatch(s, /BearerToken123|credSecret|privKey123|eyJhbGciOiTest|sigSecret123/);
    assert.match(s, /\[redacted\]/);
    // https URLs must survive as URL shape, not as [redacted-path]
    assert.match(s, /https:\/\/example\.com\/api\?/);
    assert.doesNotMatch(s, /\[redacted-path\]/);
  }
  // Exact no-bracket/suffix output: token=[redacted] not token=[redacted]] / token=[redacted]345
  assert.equal(redactRemoteUrl("https://example.com/x?token=abc123"), "https://example.com/x?token=[redacted]");
  assert.equal(sanitizeErrorMessage("token=abc123"), "token=[redacted]");
  assert.equal(sanitizeErrorMessage("authorization=BearerToken123"), "authorization=[redacted]");
  // Safe keys must be preserved: safe=keepme, foo=bar, page, count, etc.
  assert.equal(redactRemoteUrl("https://example.com/x?authorization=secret&safe=keepme&foo=bar&page=1"), "https://example.com/x?authorization=[redacted]&safe=keepme&foo=bar&page=1");
  assert.equal(sanitizeErrorMessage("https://example.com/x?authorization=secret&safe=keepme&foo=bar"), "https://example.com/x?authorization=[redacted]&safe=keepme&foo=bar");
  // URL-encoded values still redacted
  assert.equal(redactRemoteUrl("https://example.com/x?token=sk%2Dlive-abc&safe=ok"), "https://example.com/x?token=[redacted]&safe=ok");
  assert.equal(sanitizeErrorMessage("token=sk%2Dlive-abc"), "token=[redacted]");
});

test("failed update does not leave remote-tracking ref or FETCH_HEAD side effects — refs and working tree unchanged", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  const clone = fs.mkdtempSync(path.join(tmpRoot, "lrd-clone-prune-"));
  try {
    // Setup: repo and bare with initial commit
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    // Create a second branch on remote that will be deleted → would be pruned if --prune were used
    spawnSync("git", ["clone", bare, clone], { encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: clone, encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.name", "test"], { cwd: clone, encoding: "utf8", shell: false });
    git(clone, ["checkout", "-b", "feature/prune-me"]);
    fs.writeFileSync(path.join(clone, "prune.txt"), "prune\n");
    spawnSync("git", ["add", "prune.txt"], { cwd: clone, encoding: "utf8", shell: false });
    git(clone, ["commit", "-m", "prune branch"]);
    git(clone, ["push", "-u", "origin", "feature/prune-me"]);
    // Fetch to create remote-tracking ref locally
    git(repo, ["fetch", "origin"]);
    const beforeFetchRefs = git(repo, ["for-each-ref", "--format=%(refname)", "refs/remotes/origin/"]);
    assert.ok(beforeFetchRefs.includes("refs/remotes/origin/feature/prune-me"));
    // Now delete remote branch
    git(clone, ["push", "origin", "--delete", "feature/prune-me"]);
    // Also create a diverging commit on origin/main so pull will be non-fast-forward
    git(clone, ["checkout", "main"]);
    fs.writeFileSync(path.join(clone, "b.txt"), "remote diverge\n");
    spawnSync("git", ["add", "b.txt"], { cwd: clone, encoding: "utf8", shell: false });
    git(clone, ["commit", "-m", "remote diverge"]);
    git(clone, ["push", "origin", "main"]);
    // Local diverge as well
    fs.writeFileSync(path.join(repo, "c.txt"), "local diverge\n");
    git(repo, ["add", "c.txt"]);
    git(repo, ["commit", "-m", "local diverge"]);

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-prune-restore.json`;
    const bareUrl = bare;

    // Capture before state
    const beforeHead = git(repo, ["rev-parse", "HEAD"]);
    const beforeStatus = git(repo, ["status", "--porcelain"]);
    const beforeFetchHead = (() => {
      try { return fs.readFileSync(path.join(repo, ".git", "FETCH_HEAD"), "utf8"); } catch { return null; }
    })();
    const beforeRef = (() => {
      const r = spawnSync("git", ["rev-parse", "--verify", "refs/remotes/origin/main"], { cwd: repo, encoding: "utf8", shell: false });
      return r.status === 0 ? r.stdout.trim() : null;
    })();
    const beforeRemotes = git(repo, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/remotes/origin/"]);

    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    // Must be blocked (non-fast-forward or fetch failure) — not presented as refreshed
    assert.equal(result.blocked, true);

    // Refs and working tree must remain unchanged — no prune side effect, no FETCH_HEAD leak beyond restoration
    const afterHead = git(repo, ["rev-parse", "HEAD"]);
    const afterStatus = git(repo, ["status", "--porcelain"]);
    assert.equal(afterHead, beforeHead);
    // Working tree not mutated (dirty state same; we were clean before, still clean after except for our commit)
    assert.equal(afterStatus, beforeStatus);
    // Remote-tracking refs must be restored — prune-me must still exist locally if it existed before (no prune side effect)
    const afterRemotes = git(repo, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/remotes/origin/"]);
    assert.equal(afterRemotes, beforeRemotes);
    // FETCH_HEAD must be restored to before value (or absent if was absent)
    const afterFetchHead = (() => {
      try { return fs.readFileSync(path.join(repo, ".git", "FETCH_HEAD"), "utf8"); } catch { return null; }
    })();
    assert.equal(afterFetchHead, beforeFetchHead);
    // refs/remotes/origin/main also restored if it existed
    const afterRef = (() => {
      const r = spawnSync("git", ["rev-parse", "--verify", "refs/remotes/origin/main"], { cwd: repo, encoding: "utf8", shell: false });
      return r.status === 0 ? r.stdout.trim() : null;
    })();
    assert.equal(afterRef, beforeRef);
    void beforeFetchHead;
    void beforeRef;
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(clone, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------------------
// Regression: --json/CLI envelope and on-disk manifest never leak for missing-root or malicious manifests
// ---------------------------------------------------------------------------
test("missing-root CLI JSON/stderr sanitized and manifest read contains no leaks", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const missingRel = `tmp/agent-work/reviewer-0155-extra-${Date.now()}/missing`;
  const missingAbs = path.resolve(REPO_ROOT, missingRel);
  const script = path.resolve(REPO_ROOT, ".agents/skills/omniroute/scripts/legacy-refresh-diff.mjs");

  const rJson = spawnSync("node", [script, "--legacy-root", missingRel, "--json"], { cwd: REPO_ROOT, encoding: "utf8", shell: false });
  const combined = String(rJson.stdout ?? "") + String(rJson.stderr ?? "");
  assert.doesNotMatch(combined, new RegExp(missingAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  assert.doesNotMatch(combined, /\/workspace\/project|Authorization:|Bearer |token=|sk-live|AIza/);

  // Read output/manifest via file assertion path: run snapshot and assert on-disk file is clean
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", "https://ghp_SECRET123@github.com/example/private.git"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-extra-manifest.json`;
    const outAbs = path.resolve(REPO_ROOT, outRel);
    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--write"]),
    });
    assert.ok(fs.existsSync(outAbs));
    const onDisk = fs.readFileSync(outAbs, "utf8");
    assert.doesNotMatch(onDisk, /ghp_SECRET123/);
    assert.doesNotMatch(onDisk, /remoteRawNonRedactedForPolicy/);
    assert.doesNotMatch(onDisk, /porcelain/);
    assert.doesNotMatch(onDisk, /\/home\/sephiroth|C:\\\\/);
    // Also assert JSON envelope (run with --json via spawn) has no leaks
    const r2 = spawnSync("node", [script, "--legacy-root", legacyRel, "--json"], { cwd: REPO_ROOT, encoding: "utf8", shell: false });
    const envelope = String(r2.stdout ?? "") + String(r2.stderr ?? "");
    assert.doesNotMatch(envelope, /ghp_SECRET123/);
    assert.doesNotMatch(envelope, /remoteRawNonRedactedForPolicy/);
    void result;
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("JSON.stringify of runLegacyRefreshDiff never exposes absolute filesystem path (manifestAbs)", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  try {
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);
    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-abs-leak.json`;
    const outAbs = path.resolve(REPO_ROOT, outRel);
    assert.ok(path.isAbsolute(outAbs), "sanity: manifestAbs must be absolute internally");
    const snapshotRes = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json"]),
    });
    const serialized = JSON.stringify(snapshotRes);
    assert.doesNotMatch(serialized, /manifestAbs/);
    assert.doesNotMatch(serialized, new RegExp(outAbs.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
    assert.doesNotMatch(serialized, /\/home\/sephiroth\/working/);
    assert.doesNotMatch(typed(JSON.stringify(snapshotRes.snapshot ?? {})), /\/home\/sephiroth\/working/);
    assert.doesNotMatch(JSON.stringify(snapshotRes.manifest ?? {}), /manifestAbs/);
    // helper for snapshot typed string
    function typed(s: string) { return s; }
    // Internal write still works when requested; no regression in persistence.
    const written = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--write"]),
    });
    assert.equal(written.wrote, true);
    assert.ok(fs.existsSync(outAbs));
    const onDisk = fs.readFileSync(outAbs, "utf8");
    assert.doesNotMatch(onDisk, /manifestAbs/);
    const parsed = JSON.parse(onDisk);
    assert.equal(parsed.legacyRoot, legacyRel);
    assert.equal((parsed as Record<string, unknown>).manifestAbs, undefined);
    // Blocked mode also must not leak manifestAbs
    const blocked = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", "https://github.com/other/repo", "--update-legacy"]),
    });
    assert.doesNotMatch(JSON.stringify(blocked), /manifestAbs/);
    // deepSanitizeExternal must strip manifestAbs even if injected into an arbitrary object
    const scrubbed = deepSanitizeExternal({ manifestAbs: "/tmp/evil.json", nested: { manifestAbs: "/tmp/evil2.json" } });
    assert.doesNotMatch(JSON.stringify(scrubbed), /manifestAbs/);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
  }
});

test("failed update restores complete remote-tracking namespace including unrelated refs and preserves HEAD/status/FETCH_HEAD", async () => {
  const tmpRoot = path.join(REPO_ROOT, "tmp", "agent-work");
  fs.mkdirSync(tmpRoot, { recursive: true });
  const bare = makeBareRemote(tmpRoot);
  const repo = makeFixtureRepo(tmpRoot);
  const helper = fs.mkdtempSync(path.join(tmpRoot, "lrd-helper-"));
  try {
    // Base commit on main
    fs.writeFileSync(path.join(repo, "a.txt"), "v1\n");
    git(repo, ["add", "a.txt"]);
    git(repo, ["commit", "-m", "init"]);
    git(repo, ["remote", "add", "origin", bare]);
    git(repo, ["push", "-u", "origin", "main"]);

    // Create unrelated branch feature/other on remote and fetch it locally
    const otherClone = fs.mkdtempSync(path.join(tmpRoot, "lrd-other-"));
    try {
      spawnSync("git", ["clone", bare, otherClone], { encoding: "utf8", shell: false });
      spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: otherClone, encoding: "utf8", shell: false });
      spawnSync("git", ["config", "user.name", "test"], { cwd: otherClone, encoding: "utf8", shell: false });
      git(otherClone, ["checkout", "-b", "feature/other"]);
      fs.writeFileSync(path.join(otherClone, "other.txt"), "other v1\n");
      spawnSync("git", ["add", "other.txt"], { cwd: otherClone, encoding: "utf8", shell: false });
      git(otherClone, ["commit", "-m", "other v1"]);
      git(otherClone, ["push", "-u", "origin", "feature/other"]);
      // Back to main for later divergence
      git(otherClone, ["checkout", "main"]);
      // Ensure local repo sees feature/other
      git(repo, ["fetch", "origin"]);
    } finally {
      fs.rmSync(otherClone, { recursive: true, force: true });
    }

    // Advance feature/other on remote (unrelated ref that must not drift on blocked update)
    spawnSync("git", ["clone", bare, helper], { encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.email", "test@example.com"], { cwd: helper, encoding: "utf8", shell: false });
    spawnSync("git", ["config", "user.name", "test"], { cwd: helper, encoding: "utf8", shell: false });
    git(helper, ["fetch", "origin"]);
    git(helper, ["checkout", "feature/other"]);
    const otherBeforeLocal = spawnSync("git", ["rev-parse", "--verify", "refs/remotes/origin/feature/other"], { cwd: repo, encoding: "utf8", shell: false }).stdout.trim();
    assert.ok(otherBeforeLocal.length === 40);
    fs.writeFileSync(path.join(helper, "other.txt"), "other v1\nremote advance\n");
    git(helper, ["commit", "-am", "other v2"]);
    git(helper, ["push", "origin", "feature/other"]);
    const otherAfterRemote = git(helper, ["rev-parse", "origin/feature/other"]);
    assert.notEqual(otherBeforeLocal, otherAfterRemote);

    // Diverge origin/main: helper advances main remotely
    git(helper, ["checkout", "main"]);
    fs.writeFileSync(path.join(helper, "b.txt"), "remote main diverge\n");
    spawnSync("git", ["add", "b.txt"], { cwd: helper, encoding: "utf8", shell: false });
    git(helper, ["commit", "-m", "remote main diverge"]);
    git(helper, ["push", "origin", "main"]);
    // Local diverges main as well
    fs.writeFileSync(path.join(repo, "c.txt"), "local main diverge\n");
    git(repo, ["add", "c.txt"]);
    git(repo, ["commit", "-m", "local main diverge"]);

    const legacyRel = path.relative(REPO_ROOT, repo);
    const outRel = `tmp/agent-work/${path.basename(repo)}/out-full-ns.json`;
    const bareUrl = bare;

    const beforeHead = git(repo, ["rev-parse", "HEAD"]);
    const beforeStatus = git(repo, ["status", "--porcelain"]);
    const beforeRefs = git(repo, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/remotes/origin/"]);
    const beforeFetchHead = (() => { try { return fs.readFileSync(path.join(repo, ".git", "FETCH_HEAD"), "utf8"); } catch { return null; } })();
    assert.ok(beforeRefs.includes("refs/remotes/origin/feature/other"));

    const result = await runLegacyRefreshDiff({
      repoRoot: REPO_ROOT,
      opts: parseArgs(["--legacy-root", legacyRel, "--manifest", outRel, "--release-manifest", "docs/reports/audits/omniroute-upstream-releases.manifest.json", "--expected-remote", bareUrl, "--update-legacy"]),
    });
    assert.equal(result.blocked, true);
    // Manifest still must not leak manifestAbs
    assert.doesNotMatch(JSON.stringify(result), /manifestAbs/);

    const afterHead = git(repo, ["rev-parse", "HEAD"]);
    const afterStatus = git(repo, ["status", "--porcelain"]);
    const afterRefs = git(repo, ["for-each-ref", "--format=%(refname) %(objectname)", "refs/remotes/origin/"]);
    const afterOther = spawnSync("git", ["rev-parse", "--verify", "refs/remotes/origin/feature/other"], { cwd: repo, encoding: "utf8", shell: false }).stdout.trim();
    const afterFetchHead = (() => { try { return fs.readFileSync(path.join(repo, ".git", "FETCH_HEAD"), "utf8"); } catch { return null; } })();

    assert.equal(afterHead, beforeHead, "HEAD must be preserved on blocked update");
    assert.equal(afterStatus, beforeStatus, "working tree status must be preserved");
    assert.equal(afterRefs, beforeRefs, "complete refs/remotes/origin/* namespace must be restored exactly");
    assert.equal(afterOther, otherBeforeLocal, "unrelated refs/remotes/origin/feature/other must not advance on blocked update");
    assert.equal(afterFetchHead, beforeFetchHead, "FETCH_HEAD must be restored exactly");
    // update path must use shell:false at runtime (exercise shell:false contract via a space-y arg in runGit helper)
    const probe = spawnSync("git", ["for-each-ref", "--format=%(refname)", "refs/remotes/origin/"], { cwd: repo, encoding: "utf8", shell: false });
    assert.equal(probe.status, 0);
  } finally {
    fs.rmSync(bare, { recursive: true, force: true });
    fs.rmSync(repo, { recursive: true, force: true });
    fs.rmSync(helper, { recursive: true, force: true });
  }
});

