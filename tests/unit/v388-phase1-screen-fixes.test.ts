import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Regression guards for v3.8.8 screen-fix Phase 1 (quick wins).
const root = join(import.meta.dirname, "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");

test("search-tools: export modal mounts on exportOpen (not by default) without invalid isOpen prop", () => {
  const src = read("src/app/(dashboard)/dashboard/search-tools/components/SearchToolsTopBar.tsx");
  assert.ok(src.includes("{exportOpen && exportState != null && ("), "modal guarded by exportOpen");
  assert.equal(/<ExportCodeModal[^>]*\bisOpen=/.test(src), false, "no invalid isOpen prop on ExportCodeModal");
});

test("memory: single-scroll stack order memories -> engine -> playground (0095)", () => {
  // EPIC-20 T20-J: tab topbar killed; sections stacked on MemoryPageClient
  const src = read("src/app/(dashboard)/dashboard/memory/MemoryPageClient.tsx");
  const iMem = src.indexOf('data-section="memories"');
  const iEng = src.indexOf('data-section="engine"');
  const iPlay = src.indexOf('data-section="playground"');
  assert.ok(iMem >= 0 && iEng > iMem && iPlay > iEng, "section order is memories, engine, playground");
});

test("shared Select: renders children and guards placeholder/options when children present", () => {
  const src = read("src/shared/components/Select.tsx");
  assert.ok(src.includes("{children}"), "renders children passed by callers");
  assert.ok(src.includes("!children && placeholder"), "placeholder guarded by !children");
  assert.ok(src.includes("!children &&\n            options.map") || src.includes("!children &&"), "options guarded by !children");
});

test("logs: page is Observe hub redirect (Epic 0005 S4); panel hosts RequestLoggerV2", () => {
  const src = read("src/app/(dashboard)/dashboard/logs/page.tsx");
  assert.ok(src.includes("redirect"), "logs page redirects to Observe hub");
  assert.ok(src.includes("buildObserveHubPath") || src.includes("source=request"), "targets request source");
  assert.equal(src.includes("<ProxyLogger"), false, "ProxyLogger not rendered on redirect page");
  assert.equal(src.includes("<ConsoleLogViewer"), false, "ConsoleLogViewer not rendered on redirect page");
  assert.equal(src.includes("SegmentedControl"), false, "SegmentedControl not on redirect page");

  const panel = read("src/app/(dashboard)/dashboard/logs/RequestLogsPanel.tsx");
  assert.ok(panel.includes("RequestLoggerV2"), "RequestLogsPanel composes RequestLoggerV2");
});
