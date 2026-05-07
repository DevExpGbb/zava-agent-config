# nextjs-modernizer evals

Regression harness for the `nextjs-modernizer` skill catalog.

## What this does

The fixture at `fixtures/next14-app/` is a deliberate Next.js 14.2.5 mini-app containing **12 known breaking patterns** that span every catalog entry in [`../references/next-14-to-15-breaking-changes.md`](../references/next-14-to-15-breaking-changes.md) that has a regex-detectable form. The expected findings (file path + line number per `BC-NNN`) are checked-in at `expected/findings.txt`.

`run.js` is a pure-Node, dep-free script that:

1. Walks the fixture for `.{ts,tsx,js,jsx,mjs,cjs}` files.
2. Runs every catalog regex line-by-line.
3. Diffs actual findings against `expected/findings.txt`.
4. Exits non-zero on any mismatch (CI-friendly).

## Run

```bash
node .apm/skills/nextjs-modernizer/evals/run.js
```

Pass output:

```
✅ nextjs-modernizer eval PASSED (12 findings match expected)
```

## When this fails

If a contributor edits a catalog regex (intentional) → update `expected/findings.txt` with the new lines/IDs.

If the runner reports findings the catalog should not produce → bug in the regex (false positive on an unrelated pattern). Fix the catalog regex.

If the runner reports fewer findings than expected → bug in the regex (regression). Fix the catalog regex.

## Why this is contributor-only

The eval fixture and runner live under `evals/` which is excluded from the marketplace tarball produced by `apm pack`. Trainees consuming the skill at runtime don't need the fixture; only contributors validating catalog changes do.

## Coverage map

| Catalog entry | Detection? | Fixture location |
|---|---|---|
| BC-001 sync `cookies()` | regex | `app/page.tsx:4` |
| BC-002 sync `headers()` | regex | `app/page.tsx:5` |
| BC-003 sync `draftMode()` | regex | `app/page.tsx:6` |
| BC-004 sync `params` destructure | regex | `app/dashboard/[id]/page.tsx:1` |
| BC-101 default-cached `fetch()` | regex | `app/page.tsx:7` |
| BC-102 GET Route Handler | regex | `app/api/items/route.ts:3` |
| BC-103 Router Cache `staleTime` | **none** (config-level) | n/a — Phase 3 checklist |
| BC-201 `bundlePagesExternals` | regex | `next.config.js:4` |
| BC-202 `serverComponentsExternalPackages` | regex | `next.config.js:5` |
| BC-203 `'experimental-edge'` | regex | `app/api/items/route.ts:1` |
| BC-301 `NextRequest.geo`/`.ip` | regex | `app/api/items/route.ts:4,5` |
| BC-302 `next/image` `domains` | regex | `next.config.js:8` |
| BC-401 React 19 peer | **none** (package.json) | n/a — discover step |

11 detection-bearing catalog entries → 12 fixture findings (BC-301 fires twice for `request.ip` and `request.geo`).
