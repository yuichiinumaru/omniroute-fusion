/**
 * Shared sidebar i18n helper — type-purity guards for hub strips / topbars.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  asSidebarTranslator,
  sidebarText,
  type SidebarTranslator,
} from "../../../src/shared/utils/sidebarI18n";

test("sidebarText uses fallback when .has is missing", () => {
  const t = ((key: string) => `translated:${key}`) as SidebarTranslator;
  assert.equal(sidebarText(t, "dashboard", "Dashboard"), "Dashboard");
});

test("sidebarText uses translation when .has returns true", () => {
  const t = Object.assign((key: string) => `translated:${key}`, {
    has: (key: string) => key === "dashboard",
  }) as SidebarTranslator;
  assert.equal(sidebarText(t, "dashboard", "Dashboard"), "translated:dashboard");
  assert.equal(sidebarText(t, "missing", "Missing"), "Missing");
});

test("asSidebarTranslator is a structural narrow that preserves callability", () => {
  const raw = (key: string) => `k:${key}`;
  const t = asSidebarTranslator(raw);
  assert.equal(typeof t, "function");
  assert.equal(t("x"), "k:x");
});
