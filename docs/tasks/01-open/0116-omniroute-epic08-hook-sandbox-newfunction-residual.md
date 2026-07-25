# Task 0116: EPIC-08 residual — Hook middleware sandbox to eliminate `new Function`

> **Status**: `[ ]` Open  
> **Priority**: 🟢 P2  
> **Type**: `remediation` / `security` / `housekeeping`  
> **Origin**: Gortex architectural analysis `docs/reports/builders/gortex-architectural-analysis-2026-07-24.md` — residual `new Function` in hook registry; Task 0040 already closed remote RCE surface, leaving local-only residual  
> **Blocks**: none  
> **Depends on**: none (conception and prototyping can proceed independently)  
> **Parallelism**: `parallel-safe` — touches `src/lib/middleware/registry.ts` and new sandbox module only  
> **Review routing**: security · `gt-security-reviewer`

---

## Objective

Design and deliver a safe hook middleware execution sandbox that removes the `new Function("context", ...)` call in `src/lib/middleware/registry.ts:58`, while preserving the existing hook execution contract for local-only management use. The remote RCE surface was already neutralized by Task 0040; this task removes the underlying residual.

---

## Background Context

### O que já existe:
- `src/lib/middleware/registry.ts:58` compiles hook code with `new Function("context", \`return (async () => { ${code} })();\`)`
- Task **0040** (completed P0) already made `/api/middleware/hooks` remote-compile impossible via `ALWAYS_PROTECTED` + `LOCAL_ONLY` route guards
- Task 0040 explicitly listed as out-of-scope: "Full DSL sandbox rewrite for hooks (disable remote install first; deeper sandbox = stretch)"
- AGENTS.md **Hard Rule #3**: "Never use `eval()` / `new Function()` / implied eval"

### O que está faltando:
- A path to delete `compileHookCode` entirely or replace it with a confined interpreter / JSON-based DSL / VM sandbox
- Backward-compatible migration plan for existing stored hook scripts
- Tests proving the sandbox cannot escape and preserves hook contract

---

## Test Requirements

- [ ] Existing hook tests still pass with the new sandbox
- [ ] A malicious hook cannot read `process.env`, require modules, or access `globalThis` outside the provided context
- [ ] Performance of hook execution is within 2x of the `new Function` baseline for simple transforms
- [ ] Migration path for stored legacy hooks is documented or automated
- [ ] `new Function`, `eval`, and `Function` constructor are absent from the new implementation path

---

## Exit Conditions (GDD/TDD)

> OmniRoute npm matrix — see `docs/tasks/OMNIROUTE-CREATE-TASKS-EXITS.md`.
> Do **not** require cargo check/test for this stack.

- [ ] Read existing `src/lib/middleware/registry.ts`, `src/server/authz/routeGuard.ts`, docs/security/ROUTE_GUARD_TIERS.md
- [ ] Design decision recorded: JSON DSL vs quickjs/wasm sandbox vs vm2-safe equivalent
- [ ] New sandbox module created and integrated into `registry.ts`
- [ ] `new Function` path removed or gated behind an impossible-to-trigger legacy branch
- [ ] Relevant unit tests pass:
      `node --import tsx/esm --test tests/unit/<file>.test.ts`
- [ ] `npm run typecheck:core` passes without errors
- [ ] `npm run lint` passes without **new** errors
- [ ] Entrada no ledger `.changelog/` via manage-changelog + `rebuild.sh build` (do **not** hand-edit root `CHANGELOG.md`)
- [ ] Completion Evidence filled with real npm command output (no cargo lines)

---

## Details

### What

Subtasks:
- [ ] **Ler existentes**: `registry.ts`, Task 0040 closeout, `docs/security/ROUTE_GUARD_TIERS.md`
- [ ] **Escolher sandbox**: evaluate `quickjs-emscripten` (zero native deps), a JSON patch DSL, or a pure restricted AST interpreter
- [ ] **Implementar** sandbox module e.g. `src/lib/middleware/hookSandbox.ts`
- [ ] **Migração**: stored hook migration strategy (skip/rewrite/deprecate)
- [ ] **Testes**: confinement, contract equivalence, performance baseline
- [ ] **Refatoração**: remove `compileHookCode` after sandbox wiring is green
- [ ] **Regressão**: run middleware + authz tests

### Where

| Arquivo | Propósito |
|---------|-----------|
| `src/lib/middleware/registry.ts` | **Modificar** — replace `compileHookCode` |
| `src/lib/middleware/hookSandbox.ts` | **Criar** — confined execution engine |
| `tests/unit/hook-sandbox*.test.ts` | **Criar** — confinement + contract tests |
| `docs/security/` | **Criar** — decision note |

### How

1. Prefer a dependency-free approach if possible (restricted JSON DSL or AST interpreter) to avoid adding native WASM/QuickJS dependency to the product.
2. If the DSL approach is chosen, provide a migration helper that pre-validates old JS hooks.
3. Keep route guard behavior unchanged; Task 0040 already closed that path.

### Why

`new Function` is banned by project hard rules and remains a latent liability even when route guards are correct. A sandbox eliminates the residual and improves defensiveness-in-depth.

---

## Parallelism / file ownership

| Class | Detail |
|-------|--------|
| **Collision** | `src/lib/middleware/registry.ts`, new `hookSandbox.ts`, new tests |
| **Depends** | none |

---

## ⛔ Anti-Hallucination Guardrails

> [!CAUTION]
> DO NOT relax Task 0040 route guards as a substitute for removing `new Function`.
> DO NOT add new runtime dependencies without comparing footprint and supply-chain risk.
> DO NOT claim sandbox confinement without exploit-negative tests.
> DO NOT break existing stored hooks without a documented migration.

---

## 🛡️ Compliance Checklist

- [ ] **Doc Accuracy**: paths verified in report
- [ ] **Zod**: N/A
- [ ] **Security**: security reviewer mandatory
- [ ] **Error Sanitization**: N/A
- [ ] **No Raw SQL**: N/A
- [ ] **Archive Protocol**: N/A

---

## 📋 Completion Evidence

- **Design decision**: Dual JSON Rule DSL + Restricted AST JS Interpreter in TS (`src/lib/middleware/hookSandbox.ts`). Zero external/native dependencies (avoids supply chain / build footprint risks of quickjs-emscripten/vm2). Total confinement with disallowed globals (`process`, `require`, `globalThis`, etc.), property access restrictions (`.constructor`, `.__proto__`), and execution step limiter (5,000 steps).
- **Arquivos**:
  - `src/lib/middleware/hookSandbox.ts` (Criado - confined execution engine)
  - `src/lib/middleware/registry.ts` (Modificado - replaced `new Function` compilation with `compileHookSandbox`)
  - `tests/unit/hook-sandbox.test.ts` (Criado - 16 unit tests covering confinement, contract, performance, JSON DSL, and static grep)
- **Testes**:
  - `node --import tsx/esm --test tests/unit/hook-sandbox.test.ts`: PASS (16 tests, 0 failures, 16.49ms)
  - Initial run before `compileHookSandbox` sync fix failed on exception expectations as expected (TDD red-green cycle verified).
  - Regression: `node --import tsx/esm --test tests/unit/authz/middleware-hooks-route-guard.test.ts tests/unit/db-middleware.test.ts tests/unit/plugins-hooks.test.ts tests/unit/plugins-hooks-rate-limit.test.ts`: PASS (34 tests, 0 failures)
- **Resultado do lint**:
  - `npx eslint src/lib/middleware/ tests/unit/hook-sandbox.test.ts`: PASS (0 errors, 0 warnings)
- **Resultado do typecheck**:
  - `npm run typecheck:core`: PASS (clean tsc)
- **Static Grep**:
  - `npx ripgrep -n 'new Function\(|eval\(|Function\(' src/lib/middleware/`: PASS (0 live code hits, 1 doc comment reference in `hookSandbox.ts:5`)
- **Entrada no changelog**: Parent to register in `.changelog/` per worker handoff contract.
- **Agente**: gt-ts-engineer (builders)
- **Data**: 2026-07-25

---

## 🔍 Review Trail

- **Reviewer**:
- **Data da review**:
- **Veredito**:
- **Score (path to 100)**:
- **Notas**:
