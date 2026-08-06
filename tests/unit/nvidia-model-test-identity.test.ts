import { test } from "node:test";
import assert from "node:assert/strict";
import { getModelInfoCore, resolveProviderAlias, parseModel } from "@omniroute/open-sse/services/model.ts";
import { runSingleModelTest } from "@/lib/api/modelTestRunner.ts";
import { validateProviderApiKey } from "@/lib/providers/validation.ts";
import { POST as postModelTest } from "@/app/api/models/test/route.ts";
import { makeManagementSessionRequest } from "../helpers/managementSession.ts";

test("resolveProviderAlias normalizes known provider aliases", () => {
  assert.equal(resolveProviderAlias("cl"), "cline");
  assert.equal(resolveProviderAlias("nv"), "nvidia");
  assert.equal(resolveProviderAlias("nvidia"), "nvidia");
  assert.equal(resolveProviderAlias("cline"), "cline");
});

test("getModelInfoCore distinguishes explicit NVIDIA prefix from Cline passthrough model", async () => {
  // An explicitly NVIDIA-prefixed model must resolve to provider: "nvidia", not "cline"
  const nvidiaRes = await getModelInfoCore("nvidia/nemotron-3-ultra-550b-a55b", {});
  assert.equal(nvidiaRes.provider, "nvidia");
  assert.equal(nvidiaRes.model, "nemotron-3-ultra-550b-a55b");

  // An explicit Cline route for a passthrough model resolves to provider: "cline"
  const clineRes = await getModelInfoCore("cline/nvidia/nemotron-3-ultra-550b-a55b", {});
  assert.equal(clineRes.provider, "cline");
  assert.equal(clineRes.model, "nvidia/nemotron-3-ultra-550b-a55b");

  // Another Cline passthrough model
  const clineMinimax = await getModelInfoCore("cline/minimax/minimax-m3", {});
  assert.equal(clineMinimax.provider, "cline");
  assert.equal(clineMinimax.model, "minimax/minimax-m3");
});

test("getModelInfoCore preserves non-passthrough exact model ids like openai/gpt-oss-120b for NVIDIA", async () => {
  const gptOssNvidiaAlias = await getModelInfoCore("nvidia/gpt-oss-120b", {});
  assert.equal(gptOssNvidiaAlias.provider, "nvidia");
  assert.equal(gptOssNvidiaAlias.model, "openai/gpt-oss-120b");

  const gptOssNvidiaExact = await getModelInfoCore("nvidia/openai/gpt-oss-120b", {});
  assert.equal(gptOssNvidiaExact.provider, "nvidia");
  assert.equal(gptOssNvidiaExact.model, "openai/gpt-oss-120b");
});

test("runSingleModelTest reports expected and resolved provider/model", async () => {
  const resultNvidia = await runSingleModelTest({
    providerId: "nvidia",
    modelId: "nemotron-3-ultra-550b-a55b",
  });
  assert.equal(resultNvidia.providerId, "nvidia");
  assert.equal(resultNvidia.resolvedProvider, "nvidia");
  assert.equal(resultNvidia.resolvedModel, "nemotron-3-ultra-550b-a55b");

  const resultCline = await runSingleModelTest({
    providerId: "cline",
    modelId: "nvidia/nemotron-3-ultra-550b-a55b",
  });
  assert.equal(resultCline.providerId, "cline");
  assert.equal(resultCline.resolvedProvider, "cline");
  assert.equal(resultCline.resolvedModel, "nvidia/nemotron-3-ultra-550b-a55b");
});

test("validateProviderApiKey resolves provider alias before checking constraints", async () => {
  const resultAlias = await validateProviderApiKey({
    provider: "cl",
    apiKey: "",
  });
  // cline is an optional/oauth key provider or requires auth, but should not report "Provider validation not supported" / unsupported: true due to alias mismatch
  assert.equal(resultAlias.unsupported, false);
});

test("POST /api/models/test returns providerId, resolvedProvider, resolvedModel in response JSON", async () => {
  const req = await makeManagementSessionRequest("http://localhost:23456/api/models/test", {
    method: "POST",
    body: {
      providerId: "nvidia",
      modelId: "nemotron-3-ultra-550b-a55b",
    },
  });
  const res = await postModelTest(req);
  const json = await res.json();
  assert.equal(json.providerId, "nvidia");
  assert.equal(json.resolvedProvider, "nvidia");
  assert.equal(json.resolvedModel, "nemotron-3-ultra-550b-a55b");
});
