---
name: framework-modernizer
description: >-
  Use this skill when the user asks to migrate, upgrade, or modernize a
  Node.js codebase from Express 4 to Express 5 — including phrasings like
  "bump express to v5", "upgrade express", "migrate to express 5",
  "express deprecation warnings", "we're stuck on express 4", or when
  preparing a major-version dependency PR involving express ^4.x.
  Also fires when the user mentions removed Express APIs (app.del, res.send(status),
  the deprecated body-parser bundling), discontinued path-to-regexp 0.x
  patterns (e.g. unnamed wildcards `*` or optional segments `:id?`), or
  asks for a migration plan / breaking changes audit on an Express 4 repo.
  This skill audits, classifies (SAFE / AUTOFIX / MANUAL), applies safe
  autofixes, and emits a phased migration plan grounded in the official
  Express 5 migration guide. It does NOT run the consumer's tests; it
  emits a plan the team executes.
license: MIT
allowed-tools: Read, Grep, Glob, Edit
---

# framework-modernizer

> **Reference skill — Express 4 → Express 5 migration.**
> Built with [Genesis](https://github.com/DevExpGbb/genesis) as a worked example for the workshop. Read it, fork the pattern, build your own (Next 13→14, React 17→18, Angular 16→17…).

## When to use this skill

- The repo's `package.json` has a top-level `express` dependency on `^4.x` and the user wants to move to `^5.x`.
- The user reports deprecation warnings from Express 4 they want resolved.
- A major-version Dependabot/Renovate PR is open and a human asks "is this safe to merge?"

**Do NOT use this skill when:**
- The repo is not Express (Fastify, Koa, Hapi → wrong tool).
- The Express version is already `^5.x` (no work).
- The user wants you to also write/run tests post-migration (out of scope — emit the plan, the team validates).

## What this skill does

1. **Discover.** `Glob` for `package.json` files. `Read` each, confirm `express` is a direct dependency on `^4.x`. Stop early if not found.
2. **Scan.** For each Express 4 app rooted in a discovered `package.json`:
   - `Grep -n` the breaking-change patterns from [`references/express-4-to-5-breaking-changes.md`](references/express-4-to-5-breaking-changes.md) across `**/*.{js,mjs,cjs,ts}`.
   - Collect each hit with its file path, line number, and matched pattern ID (e.g. `BC-001`).
3. **Classify** every finding via [`references/classifier-rubric.md`](references/classifier-rubric.md):
   - **SAFE** — no behavior change in v5; informational only.
   - **AUTOFIX** — mechanical replacement; this skill applies it via `Edit`.
   - **MANUAL** — semantics changed; emit a TODO comment + reference link, do **not** edit.
4. **Apply autofixes.** For each AUTOFIX finding, perform the exact `Edit` specified in the catalog. Print a one-line diff summary per edit.
5. **Emit migration plan.** Write `MIGRATION-PLAN.md` at the repo root using [`references/phased-plan-template.md`](references/phased-plan-template.md). Include three phases: **Phase 1 — Autofixed (this skill)**, **Phase 2 — Manual edits required**, **Phase 3 — Validation checklist**. Cross-reference every MANUAL item back to the official Express 5 migration guide.

## Outputs

| Artifact | Where | When |
|---|---|---|
| Per-file `Edit`s for AUTOFIX class | In-place | Step 4 |
| `MIGRATION-PLAN.md` at repo root | New file | Step 5 |
| Console summary: `N safe, M autofixed, K manual` | stdout | End |

## Constraints

- **Source-grounded only.** Every finding must trace to a pattern in [`references/express-4-to-5-breaking-changes.md`](references/express-4-to-5-breaking-changes.md). Do not invent breaking changes from memory — Express 5 is the reference, not your training data.
- **No package.json bump in this skill.** The migration plan instructs the team to bump `express` to `^5.0.0`; the skill does not rewrite it. (Reason: bumping invalidates the lockfile and triggers a npm install side-effect; that's a deliberate human gate.)
- **No test runs.** Emitting the plan is the deliverable. The team's CI is the oracle.
- **Idempotent.** Re-running the skill on an already-migrated repo emits `0 findings` and no edits.

## Examples

### Invocation

> "Migrate `services/api/` from Express 4 to Express 5."

### Expected end-state

```
Discovered: services/api/package.json (express ^4.18.2)
Scanned: 14 files
Findings:
  SAFE     × 2  (informational)
  AUTOFIX  × 3  → applied
  MANUAL   × 4  → see MIGRATION-PLAN.md

Wrote: services/api/MIGRATION-PLAN.md
```

## How this was designed

This skill went through the full [Genesis](https://github.com/DevExpGbb/genesis) 8-step process. The handoff packet is in [`references/DESIGN.md`](references/DESIGN.md). Reproducing it for your own framework migration (Next 13→14, React 17→18, etc.):

1. **Step 1 — intent.** Single capability, single framework pair. Don't try to migrate 5 frameworks in one skill.
2. **Step 2 — components.** PIPELINE pattern: scan → classify → autofix → plan. No fan-out, no panel.
3. **Step 5 — Architecture artifacts.** Three files do the heavy lifting: the **catalog** (cited breaking changes) is loaded as context; the **rubric** (SAFE/AUTOFIX/MANUAL classifier) is the decision boundary; the **skill** orchestrates them. The eval runner is the regression harness — change a regex, watch CI.

## Evals

Run against the fixture:

```bash
node .apm/skills/framework-modernizer/evals/run.js
```

The fixture is a deliberate Express-4 mini-app at `.apm/skills/framework-modernizer/evals/fixtures/express4-app/` with **8 known breaking patterns** (3 SAFE, 3 AUTOFIX, 2 MANUAL). The expected findings are checked-in at `evals/expected/findings.txt`. The runner diffs actual vs expected and exits non-zero on mismatch. See [`evals/README.md`](evals/README.md).
