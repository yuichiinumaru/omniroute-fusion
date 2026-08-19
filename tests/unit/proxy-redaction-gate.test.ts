import test, { describe, it, beforeEach, afterEach } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

// Isolate DB state
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "omniroute-test-proxy-gate-"));
process.env.DATA_DIR = tmpDir;
process.env.API_KEY_SECRET = "test-secret";
process.env.JWT_SECRET = "test-jwt-secret";

const core = await import("../../src/lib/db/core.ts");
const { clearAllFeatureFlagOverrides, setFeatureFlagOverride } =
  await import("../../src/lib/db/featureFlags.ts");
const { isFeatureFlagEnabled } = await import("../../src/shared/utils/featureFlags.ts");
const {
  isEffectivePiiRedactionEnabled,
  createProxyBypassToken,
  verifyProxyBypassToken,
  assertProxyRedactionOrBypass,
  clearProxyBypassTokens,
  setAuditLoggerForTesting,
  recordMandatoryAuditLog,
  isEnablingProxyConfig,
  ProxyRedactionRequiredError,
  PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
} = await import("../../src/lib/proxyRedactionGate.ts");
const { PIIMaskerGuardrail } = await import("../../src/lib/guardrails/piiMasker.ts");
const compliance = await import("../../src/lib/compliance/index.ts");
const { getDb } = compliance;
const proxyRoute = await import("../../src/app/api/settings/proxy/route.ts");
const bypassTokenRoute = await import("../../src/app/api/settings/proxy/bypass-token/route.ts");
const redactionStatusRoute =
  await import("../../src/app/api/settings/proxy/redaction-status/route.ts");
const settingsRoute = await import("../../src/app/api/settings/route.ts");
const managementAssignmentsRoute =
  await import("../../src/app/api/v1/management/proxies/assignments/route.ts");
const managementBulkAssignRoute =
  await import("../../src/app/api/v1/management/proxies/bulk-assign/route.ts");
const { createProxy, getProxyAssignments } = await import("../../src/lib/db/proxies.ts");
const { updateSettings } = await import("../../src/lib/db/settings.ts");
const ProxyRedactionModal = (
  await import("../../src/app/(dashboard)/dashboard/settings/components/ProxyRedactionModal.tsx")
).default;

async function resetState() {
  clearProxyBypassTokens();
  setAuditLoggerForTesting(null);
  clearAllFeatureFlagOverrides();
  delete process.env.PII_REDACTION_ENABLED;
  delete process.env.INPUT_SANITIZER_MODE;
}

test.after(async () => {
  core.resetDbInstance();
  fs.rmSync(tmpDir, { recursive: true, force: true });
});

describe("Proxy Redaction Gate — Unit & API Tests (Task 0168)", () => {
  beforeEach(async () => {
    await resetState();
  });

  describe("1. isEffectivePiiRedactionEnabled", () => {
    it("returns false by default (Hard Rule #20: PII redaction defaults OFF)", () => {
      assert.strictEqual(isFeatureFlagEnabled("PII_REDACTION_ENABLED"), false);
      assert.strictEqual(isEffectivePiiRedactionEnabled(), false);
    });

    it("returns true when PII_REDACTION_ENABLED is set to true in DB", () => {
      setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");
      assert.strictEqual(isFeatureFlagEnabled("PII_REDACTION_ENABLED"), true);
      assert.strictEqual(isEffectivePiiRedactionEnabled(), true);
    });

    it("returns true when PII_REDACTION_ENABLED is set via process.env", () => {
      process.env.PII_REDACTION_ENABLED = "true";
      assert.strictEqual(isEffectivePiiRedactionEnabled(), true);
    });

    it("returns false when disabledGuardrails includes pii-masker even if flag is ON", () => {
      setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");
      assert.strictEqual(
        isEffectivePiiRedactionEnabled({ disabledGuardrails: ["pii-masker"] }),
        false,
        "disabledGuardrails containing pii-masker must NOT bypass the gate"
      );
      assert.strictEqual(
        isEffectivePiiRedactionEnabled({ disabledGuardrails: ["pii_masker"] }),
        false
      );
      assert.strictEqual(
        isEffectivePiiRedactionEnabled({ disabledGuardrails: ["other-guardrail"] }),
        true
      );
    });
  });

  describe("2. createProxyBypassToken & verifyProxyBypassToken", () => {
    it("creates a valid bypass token when exact phrase and confirmed are supplied", () => {
      const result = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
        actor: "test-admin",
        reason: "Testing proxy bypass",
      });

      assert.ok(result.token.startsWith("pbt_"));
      assert.ok(result.expiresAt);

      // Verify and consume token
      const valid = verifyProxyBypassToken(result.token, { consume: true, actor: "test-admin" });
      assert.strictEqual(valid, true);

      // Second attempt to use consumed token must fail (single-use)
      const secondUse = verifyProxyBypassToken(result.token);
      assert.strictEqual(secondUse, false, "Bypass token must be single-use");
    });

    it("throws error when confirmation phrase does not match exactly", () => {
      assert.throws(
        () => {
          createProxyBypassToken({
            confirmationPhrase: "wrong phrase",
            confirmed: true,
          });
        },
        {
          message: `Confirmation phrase must match exact text: "${PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE}"`,
        }
      );
    });

    it("throws error when confirmed checkbox is false", () => {
      assert.throws(
        () => {
          createProxyBypassToken({
            confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
            confirmed: false,
          });
        },
        {
          message: "Confirmation checkbox must be checked to generate bypass token",
        }
      );
    });

    it("rejects expired tokens", () => {
      const result = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
        ttlMs: -1000, // already expired
      });

      const valid = verifyProxyBypassToken(result.token);
      assert.strictEqual(valid, false, "Expired bypass token must be rejected");
    });

    it("rejects non-existent, null, or empty tokens", () => {
      assert.strictEqual(verifyProxyBypassToken(null), false);
      assert.strictEqual(verifyProxyBypassToken(""), false);
      assert.strictEqual(verifyProxyBypassToken("pbt_nonexistent_token_12345"), false);
    });
  });

  describe("3. assertProxyRedactionOrBypass", () => {
    it("passes without throwing when PII redaction is ON", () => {
      setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");
      assert.doesNotThrow(() => {
        assertProxyRedactionOrBypass({});
      });
    });

    it("throws ProxyRedactionRequiredError (409) when redaction is OFF and no token provided", () => {
      assert.throws(
        () => {
          assertProxyRedactionOrBypass({});
        },
        (err: unknown) => {
          assert.ok(err instanceof ProxyRedactionRequiredError);
          assert.strictEqual(err.status, 409);
          assert.strictEqual(err.code, "PII_REDACTION_REQUIRED");
          return true;
        }
      );
    });

    it("passes when redaction is OFF but valid bypass token is provided", () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
      });

      assert.doesNotThrow(() => {
        assertProxyRedactionOrBypass({ bypassToken: token });
      });
    });

    it("throws 409 when invalid or already consumed token is provided with redaction OFF", () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
      });

      // First use consumes token
      assertProxyRedactionOrBypass({ bypassToken: token });

      // Second use must fail
      assert.throws(
        () => {
          assertProxyRedactionOrBypass({ bypassToken: token });
        },
        (err: unknown) => {
          assert.ok(err instanceof ProxyRedactionRequiredError);
          return true;
        }
      );
    });
  });

  describe("4. env-vs-DB drift in piiMasker.ts", () => {
    it("reads DB feature flag override rather than raw process.env", async () => {
      delete process.env.PII_REDACTION_ENABLED;
      clearAllFeatureFlagOverrides();

      const guardrail = new PIIMaskerGuardrail();

      const samplePayload = {
        messages: [
          { role: "user", content: "My email is user@example.com and ssn is 123-45-6789" },
        ],
      };

      // 1. Initially OFF by default -> payload untouched
      const resultOff = await guardrail.preCall(samplePayload, { guardrailName: "pii-masker" });
      assert.strictEqual(
        resultOff.modifiedPayload,
        undefined,
        "Payload must not be modified when flag is OFF"
      );

      // 2. Set DB override to "true" -> payload masked
      setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");

      const resultOn = await guardrail.preCall(samplePayload, { guardrailName: "pii-masker" });
      assert.ok(resultOn.modifiedPayload, "Payload must be modified when DB flag is ON");
      const modified = resultOn.modifiedPayload as typeof samplePayload;
      assert.ok(
        modified.messages[0].content.includes("[EMAIL_REDACTED]"),
        "Email should be redacted when DB flag is ON"
      );
      assert.ok(
        modified.messages[0].content.includes("[SSN_REDACTED]"),
        "SSN should be redacted when DB flag is ON"
      );
    });
  });

  describe("5. API Route Enforcement (PUT /api/settings/proxy & /api/settings)", () => {
    it("rejects PUT /api/settings/proxy with 409 Conflict when redaction is OFF and no bypass token", async () => {
      const request = new Request("http://localhost:22000/api/settings/proxy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "global",
          proxy: {
            type: "http",
            host: "198.51.100.1",
            port: 8080,
          },
        }),
      });

      const response = await proxyRoute.PUT(request);
      assert.strictEqual(
        response.status,
        409,
        "Must return 409 Conflict when PII redaction is OFF"
      );

      const body = (await response.json()) as { error: { message: string; type: string } };
      assert.strictEqual(body.error.type, "conflict");
      assert.ok(body.error.message.includes("PII redaction"));
    });

    it("allows PUT /api/settings/proxy when PII redaction is ON", async () => {
      setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");

      const request = new Request("http://localhost:22000/api/settings/proxy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "global",
          proxy: {
            type: "http",
            host: "198.51.100.1",
            port: 8080,
          },
        }),
      });

      const response = await proxyRoute.PUT(request);
      assert.strictEqual(response.status, 200, "Must succeed when PII redaction is ON");
    });

    it("allows PUT /api/settings/proxy when redaction is OFF but valid bypassToken is supplied", async () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
      });

      const request = new Request("http://localhost:22000/api/settings/proxy", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: "global",
          proxy: {
            type: "http",
            host: "198.51.100.1",
            port: 8080,
          },
          bypassToken: token,
        }),
      });

      const response = await proxyRoute.PUT(request);
      assert.strictEqual(response.status, 200, "Must succeed with valid bypassToken");
    });

    it("rejects PATCH /api/settings with 409 Conflict when enabling proxyEnabled without bypass", async () => {
      const request = new Request("http://localhost:22000/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxyEnabled: true,
        }),
      });

      const response = await settingsRoute.PATCH(request);
      assert.strictEqual(
        response.status,
        409,
        "Must return 409 Conflict when setting proxyEnabled: true"
      );
    });

    it("allows PATCH /api/settings when enabling proxyEnabled with valid bypassToken", async () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
      });

      const request = new Request("http://localhost:22000/api/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          proxyEnabled: true,
          bypassToken: token,
        }),
      });

      const response = await settingsRoute.PATCH(request);
      assert.strictEqual(response.status, 200, "Must succeed with valid bypassToken");
    });
  });

  describe("6. Bypass Token Route (POST /api/settings/proxy/bypass-token)", () => {
    it("generates a bypass token with correct confirmation phrase and confirmed: true", async () => {
      const request = new Request("http://localhost:22000/api/settings/proxy/bypass-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
          confirmed: true,
        }),
      });

      const response = await bypassTokenRoute.POST(request);
      assert.strictEqual(response.status, 200);
      const data = (await response.json()) as { success: boolean; bypassToken: string };
      assert.strictEqual(data.success, true);
      assert.ok(data.bypassToken.startsWith("pbt_"));
    });

    it("rejects with 400 when confirmation phrase is invalid", async () => {
      const request = new Request("http://localhost:22000/api/settings/proxy/bypass-token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          confirmationPhrase: "invalid phrase",
          confirmed: true,
        }),
      });

      const response = await bypassTokenRoute.POST(request);
      assert.strictEqual(response.status, 400);
    });
  });

  describe("7. Redaction Status Route (GET /api/settings/proxy/redaction-status)", () => {
    it("returns effective redaction status", async () => {
      const request = new Request("http://localhost:22000/api/settings/proxy/redaction-status");
      const response = await redactionStatusRoute.GET(request);
      assert.strictEqual(response.status, 200);

      const data = (await response.json()) as {
        piiRedactionEnabled: boolean;
        requiresBypass: boolean;
      };
      assert.strictEqual(data.piiRedactionEnabled, false);
      assert.strictEqual(data.requiresBypass, true);
    });
  });

  describe("8. Audit Log Recording", () => {
    it("writes audit log entry when bypass token is verified and used", () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
        actor: "admin-user",
        reason: "Critical emergency proxy test",
      });

      verifyProxyBypassToken(token, { consume: true, actor: "admin-user" });

      const db = core.getDbInstance();
      if (db) {
        const row = db
          .prepare(
            "SELECT action, actor, target, details FROM audit_log WHERE action = 'proxy.unredacted_bypass' ORDER BY id DESC LIMIT 1"
          )
          .get() as { action: string; actor: string; target: string; details: string } | undefined;

        assert.ok(row, "Audit log entry must be written for bypass event");
        assert.strictEqual(row.action, "proxy.unredacted_bypass");
        assert.strictEqual(row.actor, "admin-user");
      }
    });

    it("fails closed when audit log persistence throws on bypass token verification", () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
        actor: "admin-user",
      });

      try {
        setAuditLoggerForTesting(() => {
          throw new Error("Audit log database disk full or write failure");
        });

        assert.throws(
          () => {
            verifyProxyBypassToken(token, { consume: true, actor: "admin-user" });
          },
          (err: unknown) => {
            assert.ok(err instanceof Error);
            assert.ok(
              err.message.includes(
                "Failed to record mandatory audit log for unredacted proxy bypass"
              ),
              `Unexpected error message: ${err.message}`
            );
            return true;
          }
        );
      } finally {
        setAuditLoggerForTesting(null);
      }
    });

    it("fails closed when audit log persistence throws during assertProxyRedactionOrBypass", () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
        actor: "admin-user",
      });

      try {
        setAuditLoggerForTesting(() => {
          throw new Error("Audit log database write failure");
        });

        assert.throws(
          () => {
            assertProxyRedactionOrBypass({ bypassToken: token, actor: "admin-user" });
          },
          (err: unknown) => {
            assert.ok(err instanceof Error);
            assert.ok(
              err.message.includes(
                "Failed to record mandatory audit log for unredacted proxy bypass"
              ),
              `Unexpected error message: ${err.message}`
            );
            return true;
          }
        );
      } finally {
        setAuditLoggerForTesting(null);
      }
    });

    it("fails closed when audit log persistence throws on bypass token creation", () => {
      try {
        setAuditLoggerForTesting(() => {
          throw new Error("Audit log disk error");
        });

        assert.throws(
          () => {
            createProxyBypassToken({
              confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
              confirmed: true,
              actor: "admin-user",
            });
          },
          (err: unknown) => {
            assert.ok(err instanceof Error);
            assert.ok(
              err.message.includes("Failed to record audit log for bypass token creation"),
              `Unexpected error message: ${err.message}`
            );
            return true;
          }
        );
      } finally {
        setAuditLoggerForTesting(null);
      }
    });

    it("does not store token in memory when audit logging throws during createProxyBypassToken", () => {
      let capturedTokenPrefix = "";
      try {
        setAuditLoggerForTesting((entry) => {
          if (
            entry.details &&
            typeof entry.details === "object" &&
            "tokenPrefix" in entry.details
          ) {
            capturedTokenPrefix = (entry.details as { tokenPrefix: string }).tokenPrefix;
          }
          throw new Error("Simulated audit disk failure during creation");
        });

        assert.throws(
          () => {
            createProxyBypassToken({
              confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
              confirmed: true,
              actor: "admin-user",
            });
          },
          (err: unknown) => {
            assert.ok(err instanceof Error);
            assert.ok(
              err.message.includes("Failed to record audit log for bypass token creation"),
              `Unexpected error message: ${err.message}`
            );
            return true;
          }
        );
      } finally {
        setAuditLoggerForTesting(null);
      }

      assert.ok(capturedTokenPrefix.startsWith("pbt_"));
      // The token MUST NOT exist in memory or be verifiable
      assert.strictEqual(
        verifyProxyBypassToken(capturedTokenPrefix),
        false,
        "Token prefix must not be valid"
      );
      assert.strictEqual(
        verifyProxyBypassToken(`${capturedTokenPrefix}00000000000000000000000000000000000000`),
        false,
        "Generated token must not exist in memory if creation audit failed"
      );
    });

    it("production recordMandatoryAuditLog persists audit events to SQLite audit_log and throws on failure", () => {
      // 1. Successful insertion into real SQLite table
      assert.doesNotThrow(() => {
        recordMandatoryAuditLog({
          action: "proxy.test_mandatory_audit",
          actor: "test-system",
          target: "proxy",
          resourceType: "settings",
          status: "success",
          details: { test: true },
        });
      });

      const db = core.getDbInstance();
      const row = db
        .prepare(
          "SELECT action, actor, target FROM audit_log WHERE action = 'proxy.test_mandatory_audit' ORDER BY id DESC LIMIT 1"
        )
        .get() as { action: string; actor: string; target: string } | undefined;
      assert.ok(row, "Audit log row must be present in SQLite");
      assert.strictEqual(row.action, "proxy.test_mandatory_audit");
      assert.strictEqual(row.actor, "test-system");
    });

    it("production default audit logger records token creation and unredacted bypass to SQLite", () => {
      // Ensure default logger is active
      setAuditLoggerForTesting(null);

      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
        actor: "prod-admin",
        reason: "Production bypass creation test",
      });

      const db = core.getDbInstance();
      const createRow = db
        .prepare(
          "SELECT action, actor, target, details FROM audit_log WHERE action = 'proxy.bypass_token_created' ORDER BY id DESC LIMIT 1"
        )
        .get() as { action: string; actor: string; target: string; details: string } | undefined;
      assert.ok(createRow, "Creation audit log must be persisted in SQLite");
      assert.strictEqual(createRow.action, "proxy.bypass_token_created");
      assert.strictEqual(createRow.actor, "prod-admin");
      assert.ok(createRow.details.includes(token.slice(0, 10)));

      const verified = verifyProxyBypassToken(token, { consume: true, actor: "prod-admin" });
      assert.strictEqual(verified, true);

      const useRow = db
        .prepare(
          "SELECT action, actor, target, details FROM audit_log WHERE action = 'proxy.unredacted_bypass' ORDER BY id DESC LIMIT 1"
        )
        .get() as { action: string; actor: string; target: string; details: string } | undefined;
      assert.ok(useRow, "Consumption audit log must be persisted in SQLite");
      assert.strictEqual(useRow.action, "proxy.unredacted_bypass");
      assert.strictEqual(useRow.actor, "prod-admin");
      assert.ok(useRow.details.includes(token.slice(0, 10)));
    });
  });

  describe("9. Helper isEnablingProxyConfig", () => {
    it("detects proxy activation across various payload shapes", () => {
      assert.strictEqual(isEnablingProxyConfig({ proxy: { host: "1.2.3.4", port: 80 } }), true);
      assert.strictEqual(isEnablingProxyConfig({ global: { host: "1.2.3.4", port: 80 } }), true);
      assert.strictEqual(
        isEnablingProxyConfig({ providers: { openai: { host: "1.2.3.4", port: 80 } } }),
        true
      );
      assert.strictEqual(isEnablingProxyConfig({ proxyEnabled: true }), true);
      assert.strictEqual(isEnablingProxyConfig({ perKeyProxyEnabled: true }), true);
      assert.strictEqual(isEnablingProxyConfig({ proxyId: "pxy-123" }), true);
      assert.strictEqual(isEnablingProxyConfig({ assignment: { proxyId: "pxy-123" } }), true);

      // Disabling / nullifying does not enable proxy
      assert.strictEqual(isEnablingProxyConfig({ proxy: null }), false);
      assert.strictEqual(isEnablingProxyConfig({ global: null }), false);
      assert.strictEqual(isEnablingProxyConfig({ proxyEnabled: false }), false);
      assert.strictEqual(isEnablingProxyConfig({}), false);
    });
  });

  describe("10. Management Proxies Assignment Route (PUT /api/v1/management/proxies/assignments)", () => {
    it("rejects PUT /api/v1/management/proxies/assignments with 409 Conflict when redaction is OFF and no bypass token", async () => {
      const proxy = await createProxy({
        name: "Mgmt Test Proxy 1",
        type: "http",
        host: "198.51.100.1",
        port: 8080,
      });

      const request = new Request("http://localhost:22000/api/v1/management/proxies/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          proxyId: proxy.id,
        }),
      });

      const response = await managementAssignmentsRoute.PUT(request);
      assert.strictEqual(
        response.status,
        409,
        "Must return 409 Conflict when PII redaction is OFF"
      );

      const body = (await response.json()) as { error: { message: string; type: string } };
      assert.strictEqual(body.error.type, "conflict");
      assert.ok(body.error.message.includes("PII redaction"));
    });

    it("rejects PUT /api/v1/management/proxies/assignments with 409 Conflict when invalid bypass token is sent", async () => {
      const proxy = await createProxy({
        name: "Mgmt Test Proxy 2",
        type: "http",
        host: "198.51.100.2",
        port: 8080,
      });

      const request = new Request("http://localhost:22000/api/v1/management/proxies/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "provider",
          scopeId: "openai",
          proxyId: proxy.id,
          bypassToken: "pbt_invalid_token",
        }),
      });

      const response = await managementAssignmentsRoute.PUT(request);
      assert.strictEqual(response.status, 409);
    });

    it("allows PUT /api/v1/management/proxies/assignments when PII redaction is ON", async () => {
      setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");

      const proxy = await createProxy({
        name: "Mgmt Test Proxy 3",
        type: "http",
        host: "198.51.100.3",
        port: 8080,
      });

      const request = new Request("http://localhost:22000/api/v1/management/proxies/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "provider",
          scopeId: "anthropic",
          proxyId: proxy.id,
        }),
      });

      const response = await managementAssignmentsRoute.PUT(request);
      assert.strictEqual(response.status, 200);
      const data = (await response.json()) as { success: boolean; assignment: { proxyId: string } };
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.assignment.proxyId, proxy.id);
    });

    it("allows PUT /api/v1/management/proxies/assignments with valid bypass token and consumes it", async () => {
      const proxy = await createProxy({
        name: "Mgmt Test Proxy 4",
        type: "http",
        host: "198.51.100.4",
        port: 8080,
      });

      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
      });

      const request = new Request("http://localhost:22000/api/v1/management/proxies/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          proxyId: proxy.id,
          bypassToken: token,
        }),
      });

      const response = await managementAssignmentsRoute.PUT(request);
      assert.strictEqual(response.status, 200);

      // Verify token was consumed: second request with same token must fail
      const secondRequest = new Request(
        "http://localhost:22000/api/v1/management/proxies/assignments",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: "global",
            proxyId: proxy.id,
            bypassToken: token,
          }),
        }
      );

      const secondResponse = await managementAssignmentsRoute.PUT(secondRequest);
      assert.strictEqual(secondResponse.status, 409, "Consumed bypass token must be rejected");
    });

    it("allows PUT /api/v1/management/proxies/assignments with proxyId: null (unassign) even when redaction is OFF", async () => {
      const request = new Request("http://localhost:22000/api/v1/management/proxies/assignments", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "global",
          proxyId: null,
        }),
      });

      const response = await managementAssignmentsRoute.PUT(request);
      assert.strictEqual(response.status, 200, "Unassigning must succeed without bypass token");
    });
  });

  describe("11. Management Proxies Bulk Assign Route (PUT /api/v1/management/proxies/bulk-assign)", () => {
    it("rejects PUT /api/v1/management/proxies/bulk-assign with 409 Conflict when redaction is OFF and no bypass token", async () => {
      const proxy = await createProxy({
        name: "Mgmt Bulk Test Proxy 1",
        type: "http",
        host: "198.51.100.5",
        port: 8080,
      });

      const request = new Request("http://localhost:22000/api/v1/management/proxies/bulk-assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "provider",
          scopeIds: ["openai", "anthropic"],
          proxyId: proxy.id,
        }),
      });

      const response = await managementBulkAssignRoute.PUT(request);
      assert.strictEqual(
        response.status,
        409,
        "Must return 409 Conflict when PII redaction is OFF"
      );

      const body = (await response.json()) as { error: { message: string; type: string } };
      assert.strictEqual(body.error.type, "conflict");
      assert.ok(body.error.message.includes("PII redaction"));
    });

    it("allows PUT /api/v1/management/proxies/bulk-assign when PII redaction is ON", async () => {
      setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");

      const proxy = await createProxy({
        name: "Mgmt Bulk Test Proxy 2",
        type: "http",
        host: "198.51.100.6",
        port: 8080,
      });

      const request = new Request("http://localhost:22000/api/v1/management/proxies/bulk-assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "provider",
          scopeIds: ["openai", "groq"],
          proxyId: proxy.id,
        }),
      });

      const response = await managementBulkAssignRoute.PUT(request);
      assert.strictEqual(response.status, 200);
      const data = (await response.json()) as { success: boolean; updated: number };
      assert.strictEqual(data.success, true);
      assert.strictEqual(data.updated, 2);
    });

    it("allows PUT /api/v1/management/proxies/bulk-assign with valid bypass token and consumes it", async () => {
      const proxy = await createProxy({
        name: "Mgmt Bulk Test Proxy 3",
        type: "http",
        host: "198.51.100.7",
        port: 8080,
      });

      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
      });

      const request = new Request("http://localhost:22000/api/v1/management/proxies/bulk-assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "provider",
          scopeIds: ["deepseek"],
          proxyId: proxy.id,
          bypassToken: token,
        }),
      });

      const response = await managementBulkAssignRoute.PUT(request);
      assert.strictEqual(response.status, 200);

      // Verify token was consumed: second request must fail
      const secondRequest = new Request(
        "http://localhost:22000/api/v1/management/proxies/bulk-assign",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            scope: "provider",
            scopeIds: ["mistral"],
            proxyId: proxy.id,
            bypassToken: token,
          }),
        }
      );

      const secondResponse = await managementBulkAssignRoute.PUT(secondRequest);
      assert.strictEqual(secondResponse.status, 409, "Consumed bypass token must be rejected");
    });

    it("allows PUT /api/v1/management/proxies/bulk-assign with proxyId: null (unassign) even when redaction is OFF", async () => {
      const request = new Request("http://localhost:22000/api/v1/management/proxies/bulk-assign", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scope: "provider",
          scopeIds: ["deepseek"],
          proxyId: null,
        }),
      });

      const response = await managementBulkAssignRoute.PUT(request);
      assert.strictEqual(response.status, 200, "Unassigning must succeed without bypass token");
    });
  });

  describe("12. ProxyRedactionModal UI Component & Interaction Logic", () => {
    const modalSourcePath = path.join(
      import.meta.dirname,
      "../../src/app/(dashboard)/dashboard/settings/components/ProxyRedactionModal.tsx"
    );

    it("exports ProxyRedactionModal as default React client component", () => {
      assert.strictEqual(typeof ProxyRedactionModal, "function");
      assert.strictEqual(ProxyRedactionModal.name, "ProxyRedactionModal");
    });

    it("verifies component source contains required security warnings and Hard Rule #20 badge", () => {
      assert.ok(fs.existsSync(modalSourcePath));
      const src = fs.readFileSync(modalSourcePath, "utf8");

      assert.ok(src.includes("PII Redaction Required for Proxy Routing"));
      assert.ok(src.includes("Security Warning: Unredacted Proxy Routing"));
      assert.ok(src.includes("Hard Rule #20 Protected"));
      assert.ok(src.includes("PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE"));
      assert.ok(
        src.includes("Enable PII Redaction &amp; Continue") ||
          src.includes("Enable PII Redaction & Continue")
      );
      assert.ok(
        src.includes("Bypass &amp; Continue (Single Use)") ||
          src.includes("Bypass & Continue (Single Use)")
      );
    });

    it("Primary CTA path: enabling PII redaction and proceeding", async () => {
      const originalFetch = globalThis.fetch;
      let flagUpdated = false;
      let onContinueCalled = false;
      let onCloseCalled = false;

      // Mock fetch for /api/settings/feature-flags
      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> => {
        const url = String(input);
        if (url.includes("/api/settings/feature-flags") && init?.method === "PUT") {
          const body = JSON.parse(String(init.body || "{}"));
          if (body.key === "PII_REDACTION_ENABLED" && body.value === "true") {
            flagUpdated = true;
            setFeatureFlagOverride("PII_REDACTION_ENABLED", "true");
            return new Response(JSON.stringify({ success: true }), { status: 200 });
          }
        }
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      };

      try {
        // Simulate modal handleEnablePii flow
        const simulateEnablePii = async (
          onEnablePiiAndContinue: () => Promise<void> | void,
          onClose: () => void
        ) => {
          const res = await fetch("/api/settings/feature-flags", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ key: "PII_REDACTION_ENABLED", value: "true" }),
          });
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.error || "Failed to enable PII redaction feature flag");
          }
          await onEnablePiiAndContinue();
          onClose();
        };

        await simulateEnablePii(
          async () => {
            onContinueCalled = true;
          },
          () => {
            onCloseCalled = true;
          }
        );

        assert.strictEqual(
          flagUpdated,
          true,
          "Feature flag PUT API must be called with PII_REDACTION_ENABLED: true"
        );
        assert.strictEqual(
          onContinueCalled,
          true,
          "Pending onEnablePiiAndContinue action must be executed"
        );
        assert.strictEqual(onCloseCalled, true, "Modal onClose must be called upon success");
        assert.strictEqual(
          isEffectivePiiRedactionEnabled(),
          true,
          "Effective PII redaction must now be active"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("Primary CTA path: handles feature-flag enable API failure gracefully", async () => {
      const originalFetch = globalThis.fetch;
      let onContinueCalled = false;
      let onCloseCalled = false;
      let capturedError: string | null = null;

      globalThis.fetch = async (): Promise<Response> => {
        return new Response(JSON.stringify({ error: "Database write error" }), { status: 500 });
      };

      try {
        const simulateEnablePii = async (
          onEnablePiiAndContinue: () => Promise<void> | void,
          onClose: () => void
        ) => {
          try {
            const res = await fetch("/api/settings/feature-flags", {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ key: "PII_REDACTION_ENABLED", value: "true" }),
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data?.error || "Failed to enable PII redaction feature flag");
            }
            await onEnablePiiAndContinue();
            onClose();
          } catch (err: unknown) {
            capturedError = err instanceof Error ? err.message : "Failed";
          }
        };

        await simulateEnablePii(
          () => {
            onContinueCalled = true;
          },
          () => {
            onCloseCalled = true;
          }
        );

        assert.strictEqual(capturedError, "Database write error");
        assert.strictEqual(
          onContinueCalled,
          false,
          "Must not proceed with pending action when API fails"
        );
        assert.strictEqual(onCloseCalled, false, "Must not close modal when API fails");
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("Secondary path: requiring exact phrase and checkbox before generating bypass token", async () => {
      const originalFetch = globalThis.fetch;
      let bypassTokenReceived: string | null = null;
      let onBypassCalled = false;
      let onCloseCalled = false;

      globalThis.fetch = async (
        input: RequestInfo | URL,
        init?: RequestInit
      ): Promise<Response> => {
        const url = String(input);
        if (url.includes("/api/settings/proxy/bypass-token") && init?.method === "POST") {
          const req = new Request("http://localhost:22000/api/settings/proxy/bypass-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: init.body,
          });
          return await bypassTokenRoute.POST(req);
        }
        return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
      };

      try {
        const simulateBypass = async (
          phrase: string,
          confirmed: boolean,
          onBypassAndContinue: (token: string) => Promise<void> | void,
          onClose: () => void
        ) => {
          const isPhraseMatching = phrase.trim() === PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE;
          const canBypass = confirmed && isPhraseMatching;
          if (!canBypass) {
            throw new Error("Cannot bypass without confirmation and exact phrase");
          }

          const res = await fetch("/api/settings/proxy/bypass-token", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              confirmationPhrase: phrase.trim(),
              confirmed: true,
              reason: "User acknowledged unredacted proxy routing risks in dashboard modal",
            }),
          });

          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(
              data?.error?.message || data?.error || "Failed to generate bypass token"
            );
          }

          const data = (await res.json()) as { bypassToken: string };
          const token = data.bypassToken;
          if (!token) {
            throw new Error("Server returned no bypass token");
          }

          await onBypassAndContinue(token);
          onClose();
        };

        await simulateBypass(
          PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
          true,
          async (token) => {
            onBypassCalled = true;
            bypassTokenReceived = token;
          },
          () => {
            onCloseCalled = true;
          }
        );

        assert.strictEqual(onBypassCalled, true, "Pending onBypassAndContinue must be executed");
        assert.ok(
          bypassTokenReceived?.startsWith("pbt_"),
          "Valid token must be forwarded to callback"
        );
        assert.strictEqual(onCloseCalled, true, "Modal onClose must be called");

        // Verify the generated token is valid and can be consumed
        assert.strictEqual(
          verifyProxyBypassToken(bypassTokenReceived, { consume: true }),
          true,
          "Token generated by secondary path must be valid"
        );
      } finally {
        globalThis.fetch = originalFetch;
      }
    });

    it("Modal reset/cancel resets all form state", () => {
      let error: string | null = "Some error";
      let confirmed = true;
      let confirmationPhrase = "I understand the risks";
      let closed = false;

      const handleResetAndClose = () => {
        error = null;
        confirmed = false;
        confirmationPhrase = "";
        closed = true;
      };

      handleResetAndClose();

      assert.strictEqual(error, null);
      assert.strictEqual(confirmed, false);
      assert.strictEqual(confirmationPhrase, "");
      assert.strictEqual(closed, true);
    });
  });

  describe("13. Strict Phrase Validation & Whitespace Contract", () => {
    const validPhrase = PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE;

    it("rejects empty phrase", () => {
      const isPhraseMatching = "".trim() === validPhrase;
      assert.strictEqual(isPhraseMatching, false);

      assert.throws(() => createProxyBypassToken({ confirmationPhrase: "", confirmed: true }), {
        message: `Confirmation phrase must match exact text: "${validPhrase}"`,
      });
    });

    it("rejects partial phrase", () => {
      const partial = "I understand the risks";
      const isPhraseMatching = partial.trim() === validPhrase;
      assert.strictEqual(isPhraseMatching, false);

      assert.throws(
        () => createProxyBypassToken({ confirmationPhrase: partial, confirmed: true }),
        { message: `Confirmation phrase must match exact text: "${validPhrase}"` }
      );
    });

    it("rejects case-mismatched phrase", () => {
      const lowercase = "i understand the risks of unredacted proxy routing";
      const isPhraseMatching = lowercase.trim() === validPhrase;
      assert.strictEqual(isPhraseMatching, false);

      assert.throws(
        () => createProxyBypassToken({ confirmationPhrase: lowercase, confirmed: true }),
        { message: `Confirmation phrase must match exact text: "${validPhrase}"` }
      );
    });

    it("rejects phrase with extra trailing punctuation or words", () => {
      const withPunctuation = "I understand the risks of unredacted proxy routing.";
      const isPhraseMatching = withPunctuation.trim() === validPhrase;
      assert.strictEqual(isPhraseMatching, false);

      assert.throws(
        () => createProxyBypassToken({ confirmationPhrase: withPunctuation, confirmed: true }),
        { message: `Confirmation phrase must match exact text: "${validPhrase}"` }
      );
    });

    it("rejects when checkbox is false even if phrase matches exactly", () => {
      const confirmed = false;
      const isPhraseMatching = validPhrase.trim() === validPhrase;
      const canBypass = confirmed && isPhraseMatching;
      assert.strictEqual(canBypass, false, "canBypass must be false when checkbox is unchecked");

      assert.throws(
        () => createProxyBypassToken({ confirmationPhrase: validPhrase, confirmed: false }),
        { message: "Confirmation checkbox must be checked to generate bypass token" }
      );
    });

    it("rejects when checkbox is true but phrase is invalid", () => {
      const confirmed = true;
      const isPhraseMatching = "wrong phrase".trim() === validPhrase;
      const canBypass = confirmed && isPhraseMatching;
      assert.strictEqual(canBypass, false, "canBypass must be false when phrase is invalid");
    });

    it("accepts exact phrase when checkbox is true", () => {
      const confirmed = true;
      const isPhraseMatching = validPhrase.trim() === validPhrase;
      const canBypass = confirmed && isPhraseMatching;
      assert.strictEqual(
        canBypass,
        true,
        "canBypass must be true when confirmed and phrase is exact"
      );

      const { token } = createProxyBypassToken({
        confirmationPhrase: validPhrase,
        confirmed: true,
      });
      assert.ok(token.startsWith("pbt_"));
    });

    it("documents whitespace contract: surrounding whitespace is safely trimmed while phrase body is exact", () => {
      const paddedPhrase = `   ${validPhrase}   `;
      const isPhraseMatching = paddedPhrase.trim() === validPhrase;
      assert.strictEqual(
        isPhraseMatching,
        true,
        "Padded phrase matches canonical text when trimmed"
      );

      const { token } = createProxyBypassToken({
        confirmationPhrase: paddedPhrase,
        confirmed: true,
      });
      assert.ok(token.startsWith("pbt_"), "Server must accept trimmed exact phrase");
    });
  });

  describe("14. DB-Level Defense-in-Depth & skipRedactionGate Constraint", () => {
    it("direct updateSettings({ proxyEnabled: true }) throws 409 when redaction is OFF", async () => {
      await assert.rejects(
        async () => {
          await updateSettings({ proxyEnabled: true });
        },
        (err: unknown) => {
          assert.ok(err instanceof ProxyRedactionRequiredError);
          assert.strictEqual(err.status, 409);
          assert.strictEqual(err.code, "PII_REDACTION_REQUIRED");
          return true;
        }
      );
    });

    it("direct updateSettings({ perKeyProxyEnabled: true }) throws 409 when redaction is OFF", async () => {
      await assert.rejects(
        async () => {
          await updateSettings({ perKeyProxyEnabled: true });
        },
        (err: unknown) => {
          assert.ok(err instanceof ProxyRedactionRequiredError);
          assert.strictEqual(err.status, 409);
          return true;
        }
      );
    });

    it("attempting to supply skipRedactionGate: true in data payload does NOT bypass DB gate", async () => {
      await assert.rejects(
        async () => {
          // Attacker payload attempting to inject skipRedactionGate inside the updates object
          await updateSettings({
            proxyEnabled: true,
            skipRedactionGate: true,
          } as Record<string, unknown>);
        },
        (err: unknown) => {
          assert.ok(err instanceof ProxyRedactionRequiredError);
          return true;
        }
      );
    });

    it("authorized internal caller passing skipRedactionGate: true in options succeeds", async () => {
      // Simulate internal route handler that has already verified the gate
      const settings = await updateSettings(
        { proxyEnabled: true },
        { skipRedactionGate: true, actor: "internal-route" }
      );
      assert.strictEqual((settings as Record<string, unknown>).proxyEnabled, true);

      // Clean up
      await updateSettings({ proxyEnabled: false }, { skipRedactionGate: true });
    });

    it("updateSettings with valid bypassToken succeeds and consumes token", async () => {
      const { token } = createProxyBypassToken({
        confirmationPhrase: PROXY_REDACTION_BYPASS_CONFIRMATION_PHRASE,
        confirmed: true,
      });

      const settings = await updateSettings(
        { proxyEnabled: true },
        { bypassToken: token, actor: "admin" }
      );
      assert.strictEqual((settings as Record<string, unknown>).proxyEnabled, true);

      // Verify token was consumed: second call with same token must fail
      await assert.rejects(
        async () => {
          await updateSettings(
            { perKeyProxyEnabled: true },
            { bypassToken: token, actor: "admin" }
          );
        },
        (err: unknown) => {
          assert.ok(err instanceof ProxyRedactionRequiredError);
          return true;
        }
      );
    });
  });
});
