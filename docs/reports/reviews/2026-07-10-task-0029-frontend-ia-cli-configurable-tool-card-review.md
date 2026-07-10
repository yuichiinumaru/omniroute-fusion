# Review Report: Task 0029 — Frontend IA CLI ConfigurableToolCard — 2026-07-10

## Review Lineage

- **Current task**: Task 0029 (`frontend-ia-cli-configurable-tool-card`); live path `docs/tasks/03-review/0029-frontend-ia-cli-configurable-tool-card.md`
- **Previous reports read**: none found under `docs/reports/reviews/` for this task ID
- **Related reports considered**:
  - `docs/reports/builders/2026-07-10-wave2-closeout.md` — builder wave claim only; not a quality review
- **Review mode**: `initial`
- **Reviewer profile**: `reviewers` (parent agentID=`reviewers`; lane: frontend-quality + ts-code)

## Score And Verdict

- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Lane recommendation**: `hold-in-review` (do **not** move to `04-completed`; parent publishes CHANGELOG / final gate)

### Axiom Compliance

| Axiom | Status | Notes |
|-------|--------|-------|
| Type Purity | ⚠️ | Compound export uses `as ConfigurableToolCardComponent` without `// SAFETY:`; pilots still cast ManualConfigModal props `as Record<string, unknown>` |
| Boundary Integrity | ✅ | Shell is presentational; fetch/JSON stays in pilots; no second protocol surface |
| Async Determinism | ✅ | Pilots wrap apply/reset/restore with `void`; shell actions are sync callbacks |
| Immutability | ✅ | Path/backup props typed `ReadonlyArray`; message type readonly fields |
| State Exclusivity | ✅ | Message discriminated by `type: "success" \| "error"`; expanded chrome gated on `isExpanded` |
| Contract / adoption | ✅ | ≥2 pilots (Kilo, Cline); residual list honest; single detail-shell system |
| Frontend a11y | ⚠️ | Header keyboard Enter/Space ok; `.Field` label not wired via `htmlFor` |
| Verification | ✅ | Fresh vitest 21/21 + typecheck:core PASS |

## Delta Summary

### Resolved Since Previous Review
- n/a (initial independent review)

### Persistent Findings
- n/a

### Regressions
- none

### New Findings
- `NEW` F1–F4 below (path-to-100 polish; none contract-breaking)

### Evidence Gaps / External Blockers
- none for exit bar; CHANGELOG remains parent-owned draft

## Findings

| ID | Class | Severity | Status | Summary | First seen | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| F1 | NEW | Low | Open | Compound component cast lacks `// SAFETY:` | 2026-07-10 | `ConfigurableToolCard.tsx:505` |
| F2 | NEW | Low | Open | `.Field` uses bare `<label>` without control association | 2026-07-10 | `ConfigurableToolCard.tsx:480-488` |
| F3 | NEW | Low | Open | Pilot ManualConfigModal still uses untyped prop spread cast | 2026-07-10 | `KiloToolCard.tsx:425-432`, `ClineToolCard.tsx:428-435` |
| F4 | NEW | Info | Open | Pilot shell tests are smoke-only (no apply/reset network parity) | 2026-07-10 | `KiloToolCard-shell.test.tsx`, `ClineToolCard-shell.test.tsx` |

### Contract verification (live FS)

| Exit condition | Result |
|----------------|--------|
| Inventory + residual list | ✅ task table lists 10 residuals; only Kilo+Cline migrated |
| `ConfigurableToolCard` exported | ✅ `src/shared/components/cli/index.ts` |
| ≥2 pilots on shell | ✅ Kilo + Cline render via compound slots |
| Shell unit tests | ✅ 15 tests cover header, slots, actions disabled, backups |
| No second card system | ✅ `CliToolCard` remains catalog/list card; detail shell is ConfigurableToolCard |
| LOC honesty | ✅ shell 516 LOC; pilots ~437/440 (− modest, documented); epic savings deferred to residuals |
| typecheck + tests | ✅ re-run green |

**Pilot choice** (Kilo + Cline) is sound: shared VS Code extension config family (manual config, model, API key id, apply/reset/backups) without OAuth protocol risk.

**No second card system**: list chrome (`CliToolCard`) vs detail config shell is intentional and documented in the task inventory.

## Evidence Reviewed

- Task: `docs/tasks/03-review/0029-frontend-ia-cli-configurable-tool-card.md`
- Source:
  - `src/shared/components/cli/ConfigurableToolCard.tsx` (516 LOC)
  - `src/shared/components/cli/index.ts`
  - `src/app/(dashboard)/dashboard/cli-code/components/KiloToolCard.tsx`
  - `src/app/(dashboard)/dashboard/cli-code/components/ClineToolCard.tsx`
- Tests:
  - `tests/unit/ui/ConfigurableToolCard.test.tsx`
  - `tests/unit/ui/KiloToolCard-shell.test.tsx`
  - `tests/unit/ui/ClineToolCard-shell.test.tsx`
- Runtime wiring: pilots are dashboard production components under `cli-code/components/` (non-test call sites)
- Commands run (2026-07-10, this review):

```bash
npx vitest run --config vitest.config.ts \
  tests/unit/ui/ConfigurableToolCard.test.tsx \
  tests/unit/ui/KiloToolCard-shell.test.tsx \
  tests/unit/ui/ClineToolCard-shell.test.tsx
# → 3 files, 21 tests passed

npm run typecheck:core
# → PASS (tsc -p tsconfig.typecheck-core.json)
```

- Commands not run: full monorepo e2e / visual browser (out of scope for shell unit contract)

## Path To 100

1. **F1** — Annotate compound export:

```ts
// SAFETY: Runtime assigns only the static slot functions declared on ConfigurableToolCardComponent.
const ConfigurableToolCard = ConfigurableToolCardRoot as ConfigurableToolCardComponent;
```

2. **F2** — Optional `htmlFor` / `id` on `.Field` so pilots can associate labels with inputs/selects.
3. **F3** — Type `ManualConfigModal` props properly and drop `as Record<string, unknown>` in Kilo/Cline.
4. **F4** — Extend one pilot test to assert apply is disabled without model and enable+click invokes fetch (regression guard for Actions wiring).

## Suggested patches (narrow)

### Patch A — SAFETY on compound cast

```diff
--- a/src/shared/components/cli/ConfigurableToolCard.tsx
+++ b/src/shared/components/cli/ConfigurableToolCard.tsx
@@ -502,6 +502,7 @@ type ConfigurableToolCardComponent = typeof ConfigurableToolCardRoot & {
   Field: typeof Field;
 };
 
+// SAFETY: Root is the only callable; slots are assigned immediately below and never reassigned.
 const ConfigurableToolCard = ConfigurableToolCardRoot as ConfigurableToolCardComponent;
 ConfigurableToolCard.Checking = Checking;
```

### Patch B — Field label association

```diff
 export interface ConfigurableToolCardFieldProps {
   label: ReactNode;
   children: ReactNode;
   className?: string;
+  htmlFor?: string;
 }
 
-function Field({ label, children, className }: ConfigurableToolCardFieldProps) {
+function Field({ label, children, className, htmlFor }: ConfigurableToolCardFieldProps) {
   return (
     <div className={cn("flex flex-col gap-2", className)} data-testid="configurable-tool-card-field">
-      <label className="text-sm text-text-muted">{label}</label>
+      <label htmlFor={htmlFor} className="text-sm text-text-muted">{label}</label>
       {children}
     </div>
   );
 }
```

## Task Ledger Patch Suggestion

```markdown
## Review Ledger

### Latest Review
- **Date**: 2026-07-10
- **Reviewer profile**: `reviewers`
- **Score**: `93/100`
- **Verdict**: `HELD_IN_REVIEW_PATH_TO_100`
- **Full report**: `docs/reports/reviews/2026-07-10-task-0029-frontend-ia-cli-configurable-tool-card-review.md`
- **Lane outcome**: remains in review
- **Task reference**: Task 0029 (`frontend-ia-cli-configurable-tool-card`)

#### Current Open Blockers
- none (contract met)

#### Path-to-100 Summary
- SAFETY comment on compound cast
- Field `htmlFor` association
- Drop ManualConfigModal cast
- One apply-disabled pilot regression assertion

### Previous Reports
- none
```

## Score rationale

Elite implementation of the largest IA componentization slice with honest residuals and real production pilots. Deducted 7 points for type-cast hygiene, Field a11y association, thin pilot behavioral coverage, and CHANGELOG still draft-only (parent-owned, non-blocking for this lane).
