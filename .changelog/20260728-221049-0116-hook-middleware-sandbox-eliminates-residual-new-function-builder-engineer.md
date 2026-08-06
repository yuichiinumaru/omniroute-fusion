---
date: 20260728-221049
timestamp: 20260728-221049
project: "omniroute"
agent: "builder-engineer"
task: "0116"
description: "Replace compileHookCode new Function with dependency-free JSON DSL + restricted AST interpreter sandbox in src/lib/middleware/hookSandbox.ts; add 16 confinement/regression tests."
is_rebuild_safe: true
---

# Task 0116: Hook middleware sandbox eliminates residual new Function

## Summary

Introduced HookSandboxSecurityError, FORBIDDEN_IDENTIFIERS, MAX_EXECUTION_STEPS=5000, and compileHookSandbox to replace the residual new Function compilation in src/lib/middleware/registry.ts. The sandbox is dependency-free (zero native/WASM deps) and blocks process, require, globalThis, constructor, __proto__, import/export, fetch, Buffer, timers, and eval/Function constructor at tokenization and evaluation time. Added JSON Rule DSL and restricted AST interpreter. Added tests/unit/hook-sandbox.test.ts with 16 tests covering standard execution, exploit-negative confinement, performance baseline, JSON DSL, registry integration, and static absence of new Function/eval/Function constructor. Regression tests for authz route guard and DB/plugin hooks pass.

## Changes

- Documented task completion details.

## Verification

- [x] node --import tsx/esm --test tests/unit/hook-sandbox.test.ts PASS 16/16
- [x] node --import tsx/esm --test tests/unit/authz/middleware-hooks-route-guard.test.ts tests/unit/db-middleware.test.ts tests/unit/plugins-hooks*.test.ts PASS 34/34
- [x] npm run typecheck:core PASS
- [x] npx eslint src/lib/middleware/ tests/unit/hook-sandbox.test.ts PASS 0/0
- [x] npx ripgrep -n 'new Function\(|eval\(|Function\(' src/lib/middleware/ returns 0 live code hits
