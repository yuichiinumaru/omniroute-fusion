import test from "node:test";
import assert from "node:assert/strict";
import { buildAuthHeaders } from "../../open-sse/config/registryUtils.ts";
import { AUDIO_SPEECH_PROVIDERS, AUDIO_TRANSCRIPTION_PROVIDERS } from "../../open-sse/config/audioRegistry.ts";

test("buildAuthHeaders produces bare Authorization header for AssemblyAI (no Bearer prefix)", () => {
  const assemblyaiConfig = AUDIO_TRANSCRIPTION_PROVIDERS.assemblyai;
  assert.ok(assemblyaiConfig, "AssemblyAI provider config should exist");

  const headers = buildAuthHeaders(assemblyaiConfig, "test-assemblyai-key-123");
  assert.deepEqual(headers, { Authorization: "test-assemblyai-key-123" });
});

test("buildAuthHeaders produces expected headers for non-AssemblyAI providers (regression guard)", () => {
  const deepgramConfig = AUDIO_TRANSCRIPTION_PROVIDERS.deepgram;
  assert.ok(deepgramConfig, "Deepgram provider config should exist");
  assert.deepEqual(buildAuthHeaders(deepgramConfig, "dg-key"), { Authorization: "Token dg-key" });

  const elevenlabsConfig = AUDIO_SPEECH_PROVIDERS.elevenlabs;
  assert.ok(elevenlabsConfig, "ElevenLabs provider config should exist");
  assert.deepEqual(buildAuthHeaders(elevenlabsConfig, "el-key"), { "xi-api-key": "el-key" });

  const openaiConfig = AUDIO_TRANSCRIPTION_PROVIDERS.openai;
  assert.ok(openaiConfig, "OpenAI provider config should exist");
  assert.deepEqual(buildAuthHeaders(openaiConfig, "oai-key"), { Authorization: "Bearer oai-key" });
});

test("buildAuthHeaders supports explicit authHeader: 'bare'", () => {
  const customBareConfig = {
    id: "test-bare",
    baseUrl: "https://example.com",
    authType: "apikey",
    authHeader: "bare",
    models: [],
  };
  assert.deepEqual(buildAuthHeaders(customBareConfig, "bare-secret-key"), {
    Authorization: "bare-secret-key",
  });
});
