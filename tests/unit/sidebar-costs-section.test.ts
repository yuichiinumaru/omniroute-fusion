import test from "node:test";
import assert from "node:assert/strict";

const sidebarVisibility = await import("../../src/shared/constants/sidebarVisibility.ts");

function findSection(id: string) {
  return sidebarVisibility.SIDEBAR_SECTIONS.find((s) => s.id === id);
}

test("governance section exists and hosts cost economics (S6)", () => {
  const section = findSection("governance");
  assert.ok(section, "governance section must exist");
});

test("governance cost items keep order costs → pricing → budget → free-tiers → rankings", () => {
  const section = findSection("governance");
  assert.ok(section, "governance section must exist");

  const items = sidebarVisibility.getSectionItems(section);
  const costish = items
    .map((i) => i.id)
    .filter((id) =>
      ["costs", "costs-pricing", "costs-budget", "costs-free-tiers", "free-provider-rankings"].includes(
        id
      )
    );
  assert.deepEqual(costish, [
    "costs",
    "costs-pricing",
    "costs-budget",
    "costs-free-tiers",
    "free-provider-rankings",
  ]);
});

test("governance cost items have correct hrefs", () => {
  const section = findSection("governance");
  assert.ok(section, "governance section must exist");

  const byId = new Map(sidebarVisibility.getSectionItems(section).map((i) => [i.id, i.href]));
  assert.equal(byId.get("costs"), "/dashboard/costs");
  assert.equal(byId.get("costs-pricing"), "/dashboard/costs/pricing");
  assert.equal(byId.get("costs-budget"), "/dashboard/costs/budget");
  assert.equal(byId.get("costs-free-tiers"), "/dashboard/free-tiers");
  assert.equal(byId.get("free-provider-rankings"), "/dashboard/free-provider-rankings");
});

test("costs item uses costsOverview i18nKey (not costs)", () => {
  const section = findSection("governance");
  assert.ok(section, "governance section must exist");

  const costsItem = sidebarVisibility.getSectionItems(section).find((i) => i.id === "costs");
  assert.ok(costsItem, "costs item must exist in governance section");
  assert.equal(costsItem.i18nKey, "costsOverview");
  assert.equal(costsItem.subtitleKey, "costsOverviewSubtitle");
});

test("costs item was removed from observability analytics cluster", () => {
  const observability = findSection("observability");
  assert.ok(observability, "observability section must exist");

  const itemIds = sidebarVisibility.getSectionItems(observability).map((i) => i.id);
  assert.equal(
    itemIds.includes("costs" as sidebarVisibility.HideableSidebarItemId),
    false,
    "costs item must not be in observability section"
  );
});

test("governance sits between routing and operations in pillar order", () => {
  const sectionIds = sidebarVisibility.SIDEBAR_SECTIONS.map((s) => s.id);
  const routingIdx = sectionIds.indexOf("routing");
  const governanceIdx = sectionIds.indexOf("governance");
  const operationsIdx = sectionIds.indexOf("operations");

  assert.ok(routingIdx !== -1);
  assert.ok(governanceIdx !== -1);
  assert.ok(operationsIdx !== -1);
  assert.ok(routingIdx < governanceIdx);
  assert.ok(governanceIdx < operationsIdx);
});

test("governance section titleKey is governanceSection", () => {
  const section = findSection("governance");
  assert.ok(section, "governance section must exist");
  assert.equal(section.titleKey, "governanceSection");
  assert.equal(section.titleFallback, "Governance");
});
