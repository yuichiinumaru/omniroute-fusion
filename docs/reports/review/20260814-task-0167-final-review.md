# Task 0167 Final Independent Review

- **Reviewer:** `builders` (independent reviewer, parent lane)
- **Date:** 2026-08-15
- **Verdict:** **REJECTED — not ready for promotion**
- **Score:** **88/100**
- **Promotion:** **Not promoted; task remains in `docs/tasks/02-doing/`**

## Scope

Reviewed Task 0167 (`Clarify OpenCode Free account identity and proxy dependency`) against the six stated verification objectives, the task exit conditions, and the builder completion evidence. No application source was edited during this review.

## Verification evidence

| Objective | Result | Evidence |
|---|---|---|
| `NoAuthAccountCard` proxy notice and tooltips | **PASS** | `src/shared/components/NoAuthAccountCard.tsx` renders `data-testid="noauth-proxy-notice"` under `!loading && configuredProxyCount === 0` (line 372), and includes explanatory `title` attributes for Add Account (line 363) and the shield control (line 423). |
| No-auth catalog proxy-gated language | **PASS** | `src/shared/constants/providers/noauth.ts` explicitly states dedicated-proxy requirements for OpenCode Free and MiMoCode in `authHint`, `freeNote`, and `notice.text`. |
| Component tests | **PASS** | `npx vitest run tests/unit/ui/noauth-account-card.test.tsx` — 1 file, **12/12 tests passed**. |
| Proxy rotation tests | **PASS** | `node --import tsx/esm --test tests/unit/opencode-proxy-rotation-4954.test.ts` — **4/4 tests passed**. |
| Core typecheck | **PASS** | `npm run typecheck:core` completed with zero TypeScript errors. |
| Canonical changelog and Completion Evidence reference | **PASS** | `.changelog/20260814-235246-0167-clarify-opencode-free-account-identity-ux-builders.md` exists; the task Completion Evidence names the canonical file; `.changelog/index.md` links it. |

Additional targeted ESLint verification completed with no reported diagnostics for the three task files.

## Blocking finding

### Production build claim is not reproducible (P1 / 12-point deduction)

The task's Exit Conditions and Completion Evidence claim `npm run build` passes, but a fresh independent run does not reproduce that claim:

1. Initial `npm run build` exceeded the 120-second command timeout and the build process received `SIGTERM` while compiling.
2. Retrying with the command's normal memory ceiling reached a Node heap OOM.
3. Retrying with `NODE_OPTIONS=--max-old-space-size=16384 npm run build` progressed to compilation but failed with webpack module-resolution errors: `ioredis` could not resolve Node built-ins `dns`, `net`, and `tls` through the dashboard bundle import chain.

The failure may be an existing build/environment problem rather than a regression caused by Task 0167, but it makes the task's explicit build exit condition and completion claim stale/unverified. The canonical changelog's Verification checklist also remains unchecked, which is inconsistent with the task's asserted evidence.

## Score

| Dimension | Score | Notes |
|---|---:|---|
| Requested UI behavior | 25/25 | Notice condition, copy, Add Account tooltip, and shield tooltip are implemented and covered. |
| Provider catalog accuracy | 15/15 | OpenCode Free and MiMoCode describe proxy-gated rotation. |
| Regression coverage | 20/20 | Required UI and proxy-rotation suites pass at the stated counts. |
| Type/lint integrity | 15/15 | Core typecheck and targeted lint pass. |
| Evidence/changelog hygiene | 8/10 | Canonical file is present and linked, but its own Verification checklist is unchecked. |
| Build/closeout gate | 5/15 | `npm run build` is not currently reproducible; webpack fails on unresolved `dns`/`net`/`tls`. |
| **Total** | **88/100** | Below the 100-point promotion threshold. |

## Path to 100

| Priority | Required action | Acceptance evidence |
|---|---|---|
| P1 | Resolve or explicitly remediate the production webpack build failure involving `ioredis` and Node built-ins (`dns`, `net`, `tls`) in the dashboard import chain. | Fresh `npm run build` exits 0 in the supported environment, with the command and output captured in the task evidence. If confirmed unrelated, record the root-cause/build baseline decision and an approved exception rather than claiming a pass. |
| P1 | Reconcile completion evidence with the canonical changelog. | Mark the changelog Verification items with the actual fresh commands/results, or update the task/changelog to accurately describe any blocker. |
| P2 | Re-run the six required objectives after the build remediation/exception decision. | Fresh outputs retained in Completion Evidence; all six rows remain passing. |

Until the P1 build/evidence issue is closed, the task must remain in `02-doing/` and must not be promoted to `03-review/`.
