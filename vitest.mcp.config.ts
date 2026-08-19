import { defineConfig } from "vitest/config";
import path from "path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    pool: "threads",
    maxWorkers: 20,
    fileParallelism: true,
    maxConcurrency: 20,
    include: [
      "open-sse/mcp-server/__tests__/**/*.test.ts",
      "open-sse/services/autoCombo/__tests__/**/*.test.ts",
      "open-sse/services/combo/__tests__/**/*.test.ts",
      "open-sse/services/__tests__/antigravity-quota-family.test.ts",
      "tests/unit/autoCombo/**/*.test.ts",
      // OAuthModal React component suites (jsdom via per-file @vitest-environment
      // directive). The node native runner owns *.test.ts elsewhere in tests/unit/shared;
      // these *.test.tsx files are vitest-only. Narrow family glob on purpose: other
      // .test.tsx files in this dir (ProxyConfigModal, AutoRoutingBanner, KiroAuthModal)
      // are frozen orphans tracked in config/quality/test-discovery-baseline.json.
      "tests/unit/shared/components/OAuthModal*.test.tsx",
      "tests/unit/shared/components/ProxyRedactionModal.test.tsx",
      "tests/unit/encryption.spec.ts",
      "src/shared/components/**/*.test.tsx",
      "src/shared/hooks/__tests__/**/*.test.tsx",
      "src/app/(dashboard)/**/__tests__/**/*.test.tsx",
    ],
    exclude: [
      "**/node_modules/**",
      "**/.git/**",
      "open-sse/services/autoCombo/__tests__/providerDiversity.test.ts",
      // Documented wrapper (providerDiversity.test.ts precedent): this file is a path-only
      // re-export of the canonical suite at
      // src/app/(dashboard)/dashboard/settings/components/__tests__/ProxyRedactionModal.test.tsx
      // which IS included below — including the wrapper too would double-run the suite under
      // test:vitest. It exists for explicit-file runs
      // (`npx vitest run tests/unit/shared/components/ProxyRedactionModal.test.tsx`).
      "tests/unit/shared/components/ProxyRedactionModal.test.tsx",
    ],
    coverage: {
      reportsDirectory: "coverage",
    },
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
