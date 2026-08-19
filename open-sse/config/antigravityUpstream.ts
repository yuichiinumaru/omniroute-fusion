export const ANTIGRAVITY_RUNTIME_BASE_URLS = Object.freeze([
  "https://daily-cloudcode-pa.googleapis.com",
  "https://cloudcode-pa.googleapis.com",
]);

export const ANTIGRAVITY_DISCOVERY_BASE_URLS = Object.freeze([
  ...ANTIGRAVITY_RUNTIME_BASE_URLS,
  "https://daily-cloudcode-pa.sandbox.googleapis.com",
]);

export const ANTIGRAVITY_BOOTSTRAP_BASE_URLS = Object.freeze([
  "https://cloudcode-pa.googleapis.com",
]);

const ANTIGRAVITY_MODELS_PATH = "/v1internal:models";
const ANTIGRAVITY_FETCH_AVAILABLE_MODELS_PATH = "/v1internal:fetchAvailableModels";
const ANTIGRAVITY_LOAD_CODE_ASSIST_PATH = "/v1internal:loadCodeAssist";

function buildAntigravityUrls(baseUrls: readonly string[], path: string): string[] {
  return baseUrls.map((baseUrl) => `${baseUrl}${path}`);
}

export function getAntigravityModelsDiscoveryUrls(): string[] {
  return buildAntigravityUrls(ANTIGRAVITY_DISCOVERY_BASE_URLS, ANTIGRAVITY_MODELS_PATH);
}

export function getAntigravityFetchAvailableModelsUrls(): string[] {
  return buildAntigravityUrls(ANTIGRAVITY_DISCOVERY_BASE_URLS, ANTIGRAVITY_FETCH_AVAILABLE_MODELS_PATH);
}

export function getAntigravityLoadCodeAssistUrls(): string[] {
  return buildAntigravityUrls(ANTIGRAVITY_BOOTSTRAP_BASE_URLS, ANTIGRAVITY_LOAD_CODE_ASSIST_PATH);
}
