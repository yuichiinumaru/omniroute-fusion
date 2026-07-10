import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const pagePath = path.join(
  repoRoot,
  "src/app/(dashboard)/dashboard/api-manager/ApiManagerPageClient.tsx"
);
const messagesDir = path.join(repoRoot, "src/i18n/messages");

const selfServiceScopeMessageKeys = [
  "selfServiceVisibility",
  "selfServiceVisibilityDesc",
  "ownUsageVisibility",
  "ownUsageVisibilityDesc",
  "sharedAccountQuotaVisibility",
  "sharedAccountQuotaVisibilityDesc",
];

function readApiManagerPage() {
  return fs.readFileSync(pagePath, "utf8");
}

test("permissions modal uses i18n for management access description", () => {
  const source = readApiManagerPage();
  const managementBlock = source.slice(
    source.indexOf("{/* Management Access */}", source.indexOf("const PermissionsModal")),
    source.indexOf("{/* Self-service Visibility */}", source.indexOf("const PermissionsModal"))
  );

  assert.match(managementBlock, /\{t\("managementAccessDesc"\)\}/);
  assert.doesNotMatch(managementBlock, /Allow this API key to manage OmniRoute configuration\./);
});

test("permissions modal converts API key expiration ISO timestamps to local datetime input values", () => {
  const source = readApiManagerPage();
  const expirationBlock = source.slice(
    source.indexOf("{/* Expiration Date */}", source.indexOf("const PermissionsModal")),
    source.indexOf("{/* Management Access */}", source.indexOf("const PermissionsModal"))
  );

  assert.match(expirationBlock, /value=\{toLocalDateTimeInputValue\(expiresAt\)\}/);
  assert.match(expirationBlock, /const date = new Date\(val\)/);
  assert.match(expirationBlock, /setExpiresAt\(date\.toISOString\(\)\)/);
  assert.match(expirationBlock, /onClick=\{\(\) => setExpiresAt\(""\)\}/);
  assert.match(expirationBlock, /\{tc\("clear"\)\}/);
  assert.doesNotMatch(expirationBlock, /expiresAt\.slice\(0, 16\)/);
});

test("permissions modal self-service cluster uses SettingsToggleRow (no hand-rolled switches)", () => {
  const source = readApiManagerPage();
  const modalStart = source.indexOf("const PermissionsModal");
  const visibilityStart = source.indexOf("{/* Self-service Visibility */}", modalStart);
  const visibilityEnd = source.indexOf("{/* Selected Models Summary", visibilityStart);
  const selfServiceBlock = source.slice(visibilityStart, visibilityEnd);

  // Self-service Visibility + disable-non-public-models: 4 SettingsToggleRow instances
  // (own-usage, shared-account quota, local usage command, disable-non-public).
  // USD quota lives in UsageLimitSettings (also SettingsToggleRow).
  const settingsToggleRowCount = (selfServiceBlock.match(/<SettingsToggleRow/g) ?? []).length;
  assert.equal(settingsToggleRowCount, 4);

  // No residual hand-rolled role="switch" in the migrated cluster.
  assert.equal((selfServiceBlock.match(/role="switch"/g) ?? []).length, 0);
  assert.doesNotMatch(selfServiceBlock, /<button\s+[^>]*role="switch"/);
});

test("ApiManager permissions + create-key clusters have no hand-rolled role=switch", () => {
  const source = readApiManagerPage();
  assert.equal((source.match(/role="switch"/g) ?? []).length, 0);
  assert.match(source, /SettingsToggleRow/);

  // Create-key modal JSX: management + 3 self-service SettingsToggleRow rows
  const createFormStart = source.indexOf("ref={createKeyFormRef}");
  assert.ok(createFormStart >= 0, "create-key form ref should exist");
  const createFormEnd = source.indexOf("{createError &&", createFormStart);
  const createBlock = source.slice(createFormStart, createFormEnd);
  assert.equal(
    (createBlock.match(/<SettingsToggleRow/g) ?? []).length,
    4,
    "create-key form should use SettingsToggleRow for management + 3 self-service toggles"
  );

  // Permissions modal overall SettingsToggleRow adoption (key active, schedule, privacy,
  // auto-resolve, ban, management, 3 self-service, disable-non-public = 10)
  const permissionsStart = source.indexOf("const PermissionsModal");
  const permissionsSource = source.slice(permissionsStart);
  assert.ok(
    (permissionsSource.match(/<SettingsToggleRow/g) ?? []).length >= 10,
    "permissions modal should adopt SettingsToggleRow for settings-row toggles"
  );
});

test("permissions modal exposes Claude Code default wildcard model", () => {
  const source = readApiManagerPage();

  assert.match(source, /const CLAUDE_CODE_DEFAULT_MODEL_ID = "cc\/\*";/);
  assert.match(source, /const CLAUDE_CODE_DEFAULT_MODEL_NAME = "Claude Code default";/);
  assert.match(source, /withClaudeCodeDefaultModel\(allModels\)/);
  assert.match(source, /getModelDisplayName\(model\.id\)/);
  assert.match(
    source,
    /modelId === CLAUDE_CODE_DEFAULT_MODEL_ID\s+\?\s+CLAUDE_CODE_DEFAULT_MODEL_NAME\s+:\s+modelId/
  );
  assert.doesNotMatch(source, /modelById\.get\(modelId\)\?\.name/);
});

test("permissions modal expands Claude Code default families in selected models summary", () => {
  const source = readApiManagerPage();

  assert.match(source, /const CLAUDE_CODE_DEFAULT_FAMILIES = \[/);
  assert.match(source, /id: "other",\s+label: "other"/);
  assert.match(source, /id: "fable",\s+label: "fable"/);
  assert.match(source, /id: "opus",\s+label: "opus"/);
  assert.match(source, /id: "sonnet",\s+label: "sonnet"/);
  assert.match(source, /id: "haiku",\s+label: "haiku"/);
  assert.match(source, /const orderedSelectedModels = useMemo/);
  assert.match(source, /modelId === CLAUDE_CODE_DEFAULT_MODEL_ID/);
  assert.match(source, /setClaudeCodeFamiliesExpanded/);
  assert.match(
    source,
    /const \[claudeCodeFamiliesExpanded,\s*setClaudeCodeFamiliesExpanded\] = useState\(false\)/
  );
  assert.doesNotMatch(source, /setClaudeCodeFamiliesExpanded\(true\)/);
  assert.match(source, /aria-expanded=\{claudeCodeFamiliesExpanded\}/);
  assert.match(source, /bg-primary\/25/);
  assert.match(source, /handleBlockClaudeCodeFamily/);
  assert.match(source, /blockedModels: validBlockedModels/);
  assert.match(
    source,
    /blockedModels\.push\(\.\.\.CLAUDE_CODE_FAMILY_BLOCK_PATTERNS\[familyId\]\)/
  );
  assert.doesNotMatch(source, /Block Fable family/);
});

test("self-service API key scope labels do not expose missing placeholders", () => {
  const messageFiles = fs.readdirSync(messagesDir).filter((file) => file.endsWith(".json"));

  for (const file of messageFiles) {
    const messages = JSON.parse(fs.readFileSync(path.join(messagesDir, file), "utf8"));

    for (const key of selfServiceScopeMessageKeys) {
      const value = messages.apiManager?.[key];

      assert.equal(typeof value, "string", `${file}: apiManager.${key} should exist`);
      assert.ok(value.length > 0, `${file}: apiManager.${key} should not be empty`);
      assert.ok(
        !value.startsWith("__MISSING__:"),
        `${file}: apiManager.${key} should not expose a missing placeholder`
      );
    }
  }
});
