---
name: nextjs-modernizer
description: >-
  Use this skill when the user asks to migrate, upgrade, or modernize a
  Next.js codebase from Next 14 to Next 15 — including phrasings like
  "bump next to 15", "upgrade next.js", "migrate to next 15", "next 15
  upgrade", "we're stuck on next 14", or when preparing a major-version
  dependency PR involving next ^14.x. Also fires when the user mentions
  Next 15 indirect symptoms: async cookies/headers errors, sync
  params/searchParams warnings, fetch no longer cached by default,
  removed experimental.bundlePagesExternals or
  experimental.serverComponentsExternalPackages, react 19 peer warnings,
  GET route handlers losing default caching, NextRequest geo/ip removed,
  or asks for a migration plan / breaking changes audit on a Next 14
  repo. This skill audits, classifies (SAFE / AUTOFIX / MANUAL), applies
  safe autofixes, and emits a phased migration plan grounded in the
  official Next.js 15 upgrade guide. It does NOT run the consumer's
  tests; it does NOT bump package.json; it emits a plan the team
  executes under review.
license: MIT
allowed-tools: Read, Grep, Glob, Edit
---

# nextjs-modernizer

> **Sibling of [`framework-modernizer`](../framework-modernizer/SKILL.md) — Next.js 14 → 15 migration.**
> Built with [Genesis](https://github.com/DevExpGbb/genesis) using the same PIPELINE shape. Read both, fork the pattern, build your own (React 17→18, Spring Boot 2→3, Java 8→17, Angular 16→17…).

## When to use this skill

- The repo's `package.json` has a top-level `next` dependency on `^14.x` and the user wants to move to `^15.x`.
- The user reports Next 15 deprecation warnings (sync `cookies()`, sync `params`, default-cached `fetch`) they want resolved.
- A major-version Dependabot/Renovate PR for `next` is open and a human asks "is this safe to merge?"

**Do NOT use this skill when:**
- The repo is not Next.js (Remix, Astro, plain React → wrong tool).
- The Next version is already `^15.x` (no work).
- The user wants you to also write/run tests post-migration (out of scope — emit the plan, the team validates).
- The migration is Next 13 → 14 (different catalog; not covered here).

## What this skill does

1. **Discover.** `Glob` for `package.json` AND `next.config.{js,mjs,ts}` files. `Read` each `package.json`, confirm `next` is a direct dependency on `^14.x`. Stop early if not found.
2. **Scan.** For each Next 14 app rooted in a discovered `package.json`:
   - `Grep -n` the breaking-change patterns from [`references/next-14-to-15-breaking-changes.md`](references/next-14-to-15-breaking-changes.md) across `**/*.{ts,tsx,js,jsx,mjs}` AND across `next.config.{js,mjs,ts}` (config patterns are catalog entries too).
   - Collect each hit with file path, line number, and matched pattern ID (e.g. `BC-001`).
3. **Classify** every finding via [`references/classifier-rubric.md`](references/classifier-rubric.md):
   - **SAFE** — no behavior change in v15; informational only.
   - **AUTOFIX** — mechanical replacement; this skill applies it via `Edit`.
   - **MANUAL** — semantics changed; emit a TODO comment + reference link, do **not** edit.
4. **Apply autofixes.** For each AUTOFIX finding, perform the exact `Edit` specified in the catalog. Print a one-line diff summary per edit.
5. **Emit migration plan.** Write `MIGRATION-PLAN.md` at the repo root using [`references/phased-plan-template.md`](references/phased-plan-template.md). Include three phases: **Phase 1 — Autofixed (this skill)**, **Phase 2 — Manual edits required**, **Phase 3 — Validation checklist**. Cross-reference every MANUAL item back to the official Next.js 15 upgrade guide AND recommend the matching `@next/codemod` invocation where one exists.

## Outputs

| Artifact | Where | When |
|---|---|---|
| Per-file `Edit`s for AUTOFIX class | In-place | Step 4 |
| `MIGRATION-PLAN.md` at repo root | New file | Step 5 |
| Console summary: `N safe, M autofixed, K manual` | stdout | End |

## Constraints

- **Source-grounded only.** Every finding must trace to a pattern in [`references/next-14-to-15-breaking-changes.md`](references/next-14-to-15-breaking-changes.md). Do not invent breaking changes from memory — the official Next.js 15 upgrade guide is the reference, not your training data.
- **No package.json bump in this skill.** The migration plan instructs the team to bump `next` to `^15.0.0` and `react`/`react-dom` to `^19.0.0`; the skill does not rewrite them. (Reason: bumping invalidates the lockfile and triggers `npm install`; that's a deliberate human gate.)
- **No `@next/codemod` invocation.** The catalog *cites* the matching codemod for AUTOFIX entries; the skill *recommends* running it in `MIGRATION-PLAN.md` but does not run it. The codemod is its own tool with its own trust boundary.
- **No test runs, no `next build`.** Emitting the plan is the deliverable. The team's CI is the oracle.
- **Idempotent.** Re-running the skill on an already-migrated repo emits `0 findings` and no edits.

## Examples

### Invocation

> "Migrate `apps/web/` from Next 14 to Next 15."

### Expected end-state

```
Discovered: apps/web/package.json (next ^14.2.5)
Scanned: 22 files (+ next.config.mjs)
Findings:
  SAFE     × 1  (informational)
  AUTOFIX  × 4  → applied
  MANUAL   × 6  → see MIGRATION-PLAN.md

Wrote: apps/web/MIGRATION-PLAN.md
```

## How this was designed

This skill went through the full [Genesis](https://github.com/DevExpGbb/genesis) 8-step process. The handoff packet is in [`references/DESIGN.md`](references/DESIGN.md). It is a **deliberate sibling** of [`framework-modernizer`](../framework-modernizer/SKILL.md) — same PIPELINE shape, same rubric, same plan template, different catalog. The duplication is intentional: when a 3rd modernizer ships, the rule-of-three trigger fires and the shared body extracts into a kit-level reference (R3 EXTRACT). Today, two parallel skills make the shape obvious for trainees forking the pattern.

## Evals

Run against the fixture:

```bash
node .apm/skills/nextjs-modernizer/evals/run.js
```

The fixture is a deliberate Next-14 mini-app at `.apm/skills/nextjs-modernizer/evals/fixtures/next14-app/` with **12 known breaking patterns** across SAFE / AUTOFIX / MANUAL. The expected findings are checked-in at `evals/expected/findings.txt`. The runner diffs actual vs expected and exits non-zero on mismatch. See [`evals/README.md`](evals/README.md).
