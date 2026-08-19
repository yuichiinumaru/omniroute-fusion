import assert from "node:assert/strict";
import test from "node:test";
import fs from "node:fs/promises";
import path from "node:path";

const root = process.cwd();
const routePath = path.join(root, "src/app/api/oauth/[provider]/[action]/route.ts");
const modalPath = path.join(root, "src/shared/components/OAuthModal.tsx");

const [routeSource, modalSource] = await Promise.all([
  fs.readFile(routePath, "utf8"),
  fs.readFile(modalPath, "utf8"),
]);

test("route guard blocks every Grok CLI capture action for remote requests", async () => {
  const { isLocalOnlyPath } = await import("@/server/authz/routeGuard");
  for (const action of ["start-cli-login", "capture-cli-auth", "cancel-cli-auth"]) {
    assert.equal(isLocalOnlyPath(`/api/oauth/grok-cli/${action}`, "POST"), true);
    assert.equal(isLocalOnlyPath(`/api/oauth/grok-cli/${action}/extra`, "POST"), false);
  }
});

test("Task 0161 route boundary validates and server-binds the capture session", () => {
  assert.match(routeSource, /const captureCliAuthSchema = z\.object\(\{[\s\S]*captureSessionId/);
  assert.match(routeSource, /captureCliAuthSchema/);
  assert.match(routeSource, /requireOAuthRouteAuth\(request\)/);
  assert.match(routeSource, /validateBody\(action === "capture-cli-auth" \? captureCliAuthSchema/);
  assert.match(routeSource, /startLocalGrokLogin\(\{ signal: request\.signal \}\)/);
  assert.match(routeSource, /confirmAndCaptureGrokLogin\(\{ captureSessionId: body\.captureSessionId \}\)/);
  assert.doesNotMatch(routeSource, /preLoginSnapshot/);
  assert.match(routeSource, /action === "cancel-cli-auth"/);
});

test("Task 0161 route boundary keeps response identity-only", () => {
  const captureBranch = routeSource.slice(routeSource.indexOf('if (action === "capture-cli-auth")'));
  const captureEnd = captureBranch.indexOf('if (action === "cancel-cli-auth")');
  const captureSource = captureEnd >= 0 ? captureBranch.slice(0, captureEnd) : captureBranch;
  assert.doesNotMatch(captureSource, /accessToken|refreshToken|rawAuthJson|preLoginSnapshot|\.key\b/);
  assert.match(captureSource, /email: result\.identity\?\.email/);
  assert.match(captureSource, /displayName:/);
});

test("Task 0161 modal never stores pre-login secrets and cancels server session on close", () => {
  assert.doesNotMatch(modalSource, /preLoginSnapshot/);
  assert.match(modalSource, /captureSessionId/);
  assert.match(modalSource, /cancel-cli-auth/);
  assert.match(modalSource, /abortActivePolling\(\)/);
  assert.match(modalSource, /setAuthData\(\{\s*isCliCapture: true/);
});
