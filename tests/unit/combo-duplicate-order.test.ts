import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// ── Isolation ────────────────────────────────────────────────────────────────

const TEST_DATA_DIR = fs.mkdtempSync(
  path.join(os.tmpdir(), "omniroute-combo-duplicate-order-")
);
process.env.DATA_DIR = TEST_DATA_DIR;
process.env.API_KEY_SECRET = process.env.API_KEY_SECRET ?? "duplicate-order-test-secret";

const core = await import("../../src/lib/db/core.ts");
const combosDb = await import("../../src/lib/db/combos.ts");
const apiKeysDb = await import("../../src/lib/db/apiKeys.ts");
const settingsDb = await import("../../src/lib/db/settings.ts");

// Routes loaded AFTER env + DATA_DIR are set
const combosRoute = await import("../../src/app/api/combos/route.ts");
const reorderRoute = await import("../../src/app/api/combos/reorder/route.ts");

// ── Helpers ──────────────────────────────────────────────────────────────────

function makePostRequest(url: string, body: unknown, apiKey?: string): Request {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (apiKey) {
    headers["authorization"] = `Bearer ${apiKey}`;
  }
  return new Request(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
}

function makeGetRequest(url: string, apiKey?: string): Request {
  const headers: Record<string, string> = {};
  if (apiKey) {
    headers["authorization"] = `Bearer ${apiKey}`;
  }
  return new Request(url, {
    method: "GET",
    headers,
  });
}

async function managementKey() {
  const { key } = await apiKeysDb.createApiKey("duplicate-order-test", "machine-test", ["manage"]);
  return key;
}

async function postCombo(body: unknown, apiKey: string) {
  return combosRoute.POST(makePostRequest("http://localhost/api/combos", body, apiKey));
}

async function getCombosList(apiKey: string) {
  return combosRoute.GET(makeGetRequest("http://localhost/api/combos", apiKey));
}

// ── Lifecycle ────────────────────────────────────────────────────────────────

async function resetStorage() {
  core.resetDbInstance();

  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      if (fs.existsSync(TEST_DATA_DIR)) {
        fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
      }
      break;
    } catch (error: any) {
      if ((error?.code === "EBUSY" || error?.code === "EPERM") && attempt < 9) {
        await new Promise((resolve) => setTimeout(resolve, 50 * (attempt + 1)));
      } else {
        throw error;
      }
    }
  }

  fs.mkdirSync(TEST_DATA_DIR, { recursive: true });
}

test.beforeEach(async () => {
  await resetStorage();
  await settingsDb.updateSettings({ requireLogin: false });
});

test.after(async () => {
  core.resetDbInstance();
  try {
    fs.rmSync(TEST_DATA_DIR, { recursive: true, force: true });
  } catch {
    // best-effort cleanup
  }
});

// ── Tests ────────────────────────────────────────────────────────────────────

test("db: createCombo honors explicit sortOrder", async () => {
  await combosDb.createCombo({ name: "A", models: [], sortOrder: 10 });
  await combosDb.createCombo({ name: "B", models: [] });

  const combos = await combosDb.getCombos();
  assert.deepEqual(combos.map((c) => c.name), ["A", "B"]);
  assert.deepEqual(combos.map((c) => c.sortOrder), [10, 11]);
});

test("route: POST /api/combos preserves explicit sortOrder (currently RED)", async () => {
  const key = await managementKey();

  const createRes = await postCombo(
    {
      name: "Source",
      models: [],
      strategy: "priority",
      sortOrder: 5,
    },
    key
  );
  assert.equal(createRes.status, 201, `expected 201, got ${createRes.status}`);

  const listRes = await getCombosList(key);
  assert.equal(listRes.status, 200);
  const body = await listRes.json();
  const source = body.combos.find((c: any) => c.name === "Source");
  assert.ok(source, "source combo should exist");
  assert.equal(source.sortOrder, 5, `expected sortOrder 5, got ${source.sortOrder}`);
});

test("route: duplicate created immediately below source (end-to-end placement)", async () => {
  const key = await managementKey();

  await postCombo({ name: "Alpha", models: [], strategy: "priority", sortOrder: 1 }, key);
  await postCombo({ name: "Bravo", models: [], strategy: "priority", sortOrder: 3 }, key);

  // Simulate handleDuplicate: compute midpoint and send explicit sortOrder
  const alphaRes = await getCombosList(key);
  const alphaBody = await alphaRes.json();
  const alpha = alphaBody.combos.find((c: any) => c.name === "Alpha");
  const bravo = alphaBody.combos.find((c: any) => c.name === "Bravo");
  const midpoint = (alpha.sortOrder + bravo.sortOrder) / 2;

  const dupRes = await postCombo(
    {
      name: "Alpha-copy",
      models: [],
      strategy: "priority",
      sortOrder: midpoint,
    },
    key
  );
  assert.equal(dupRes.status, 201, `expected 201, got ${dupRes.status}`);

  const finalRes = await getCombosList(key);
  const finalBody = await finalRes.json();
  assert.deepEqual(
    finalBody.combos.map((c: any) => c.name),
    ["Alpha", "Alpha-copy", "Bravo"],
    "duplicate should appear directly below source"
  );
});

test("route: duplicate preserves source config exactly (names/IDs/config unchanged)", async () => {
  const key = await managementKey();

  const sourceConfig = { maxRetries: 3, retryDelayMs: 500, customFlag: true };
  const createRes = await postCombo(
    {
      name: "KeepConfig",
      models: [{ provider: "openai", model: "gpt-4.1" }],
      strategy: "round-robin",
      config: sourceConfig,
      sortOrder: 1,
    },
    key
  );
  assert.equal(createRes.status, 201);
  const created = await createRes.json();

  const dupRes = await postCombo(
    {
      name: "KeepConfig-copy",
      models: created.models,
      strategy: created.strategy,
      config: created.config,
      sortOrder: 1.5,
    },
    key
  );
  assert.equal(dupRes.status, 201);
  const dup = await dupRes.json();

  assert.equal(dup.strategy, "round-robin");
  assert.deepEqual(dup.config, sourceConfig);
  assert.ok(dup.id !== created.id, "duplicate must have a different ID");
  assert.equal(dup.name, "KeepConfig-copy");
});

test("route: reorder still normalizes integer sort_order after duplicates", async () => {
  const key = await managementKey();

  await postCombo({ name: "A", models: [], sortOrder: 1 }, key);
  await postCombo({ name: "B", models: [], sortOrder: 2.5 }, key);
  await postCombo({ name: "C", models: [], sortOrder: 4 }, key);

  const listRes = await getCombosList(key);
  const listBody = await listRes.json();
  const ids = listBody.combos.map((c: any) => c.id);

  const reorderRes = await reorderRoute.POST(
    new Request("http://localhost/api/combos/reorder", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({ comboIds: ids }),
    })
  );

  assert.equal(reorderRes.status, 200, `expected 200, got ${reorderRes.status}`);
  const reorderBody = await reorderRes.json();
  assert.deepEqual(
    reorderBody.combos.map((c: any) => c.sortOrder),
    [1, 2, 3],
    "reorder must normalize to contiguous integers"
  );
});

test("route: failed duplicate creation does not leave partial DB record", async () => {
  const key = await managementKey();

  await postCombo({ name: "Existing", models: [] }, key);

  const listBefore = await getCombosList(key);
  const bodyBefore = await listBefore.json();
  const countBefore = bodyBefore.combos.length;

  // Duplicate the exact same name → should 400
  const dupRes = await postCombo(
    { name: "Existing", models: [], sortOrder: 1 },
    key
  );
  assert.equal(dupRes.status, 400, `expected 400, got ${dupRes.status}`);

  const listAfter = await getCombosList(key);
  const bodyAfter = await listAfter.json();
  assert.equal(bodyAfter.combos.length, countBefore, "no partial record should remain on duplicate-name failure");
});
