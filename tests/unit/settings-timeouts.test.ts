import test from "node:test";
import assert from "node:assert/strict";

import { updateSettingsSchema } from "../../src/shared/validation/settingsSchemas.ts";
import { MAX_TIMER_TIMEOUT_MS } from "../../src/shared/utils/runtimeTimeouts.ts";

test("updateSettingsSchema validates fine-grained timeout settings", () => {
  const valid = updateSettingsSchema.safeParse({
    globalTimeoutMs: 60000,
    comboTestTimeoutMs: 15000,
    providerTestTimeoutMs: 25000,
    modelTestTimeoutMs: 5000,
  });

  assert.equal(valid.success, true);
  if (valid.success) {
    assert.equal(valid.data.globalTimeoutMs, 60000);
    assert.equal(valid.data.comboTestTimeoutMs, 15000);
    assert.equal(valid.data.providerTestTimeoutMs, 25000);
    assert.equal(valid.data.modelTestTimeoutMs, 5000);
  }
});

test("updateSettingsSchema rejects out-of-bounds timeout settings", () => {
  // Below min(1000)
  const tooLow = updateSettingsSchema.safeParse({
    globalTimeoutMs: 500,
  });
  assert.equal(tooLow.success, false);

  // Above MAX_TIMER_TIMEOUT_MS
  const tooHigh = updateSettingsSchema.safeParse({
    comboTestTimeoutMs: MAX_TIMER_TIMEOUT_MS + 1,
  });
  assert.equal(tooHigh.success, false);

  // Non-integer
  const floatVal = updateSettingsSchema.safeParse({
    modelTestTimeoutMs: 1234.5,
  });
  assert.equal(floatVal.success, false);
});
