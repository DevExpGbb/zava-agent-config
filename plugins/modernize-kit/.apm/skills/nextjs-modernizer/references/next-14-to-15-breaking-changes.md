# Next.js 14 → 15 breaking changes catalog

> **Source:** Official [Next.js 15 upgrade guide](https://nextjs.org/docs/app/guides/upgrading/version-15) and the [Next 15 release notes](https://nextjs.org/blog/next-15). Every pattern below cites the section heading. Do not extend this catalog with patterns from your training data — fetch the upgrade guide and add citations.

This catalog drives the `nextjs-modernizer` skill. Each entry has:
- **ID** — stable identifier (BC-NNN) for cross-reference
- **Class** — `SAFE` / `AUTOFIX` / `MANUAL` (from [`classifier-rubric.md`](classifier-rubric.md))
- **Detect** — a `Grep` pattern (PCRE) the skill runs across `**/*.{ts,tsx,js,jsx,mjs}` (config entries also scan `next.config.{js,mjs,ts}`)
- **Fix** — for AUTOFIX: the exact `Edit` to apply. For MANUAL: the TODO comment to insert.
- **Codemod** — when `@next/codemod` ships an automated fix, the invocation is cited; surface it in `MIGRATION-PLAN.md`, do not run it from the skill.
- **Source** — anchor in the upgrade guide

The full automated codemod entry point is `npx @next/codemod@canary upgrade latest` — the catalog cites individual codemods for granularity.

---

## Async Request APIs (the headline breaking change of Next 15)

In Next 15, `cookies()`, `headers()`, `draftMode()`, `params`, and `searchParams` are **asynchronous**. Synchronous access shows runtime warnings in 15.x and breaks in 16. Most call sites are MANUAL because they require adding `await` AND making the enclosing function `async` AND propagating `Promise<...>` types through `params`/`searchParams` props.

### BC-001 — sync `cookies()` access
- **Class:** MANUAL
- **Detect:** `\bcookies\s*\(\s*\)\s*\.(get|getAll|has|set|delete)`
- **TODO:** `// MANUAL: nextjs-modernizer BC-001 — next 15 made cookies() async. Make the enclosing function async and: const cookieStore = await cookies(); cookieStore.get(...). See https://nextjs.org/docs/app/guides/upgrading/version-15#async-request-apis-breaking-change`
- **Codemod:** `npx @next/codemod@canary next-async-request-api .` (handles many cases; review output)
- **Why MANUAL:** Adding `await` requires the enclosing function to be `async`; in non-async layouts/middleware/route handlers the codemod transforms safely, but in mixed sync/async helper utilities the rewrite needs human judgement.

### BC-002 — sync `headers()` access
- **Class:** MANUAL
- **Detect:** `\bheaders\s*\(\s*\)\s*\.(get|has|forEach|entries|keys|values)`
- **TODO:** `// MANUAL: nextjs-modernizer BC-002 — next 15 made headers() async. Make the enclosing function async and: const h = await headers(); h.get(...). See https://nextjs.org/docs/app/guides/upgrading/version-15#async-request-apis-breaking-change`
- **Codemod:** `npx @next/codemod@canary next-async-request-api .`

### BC-003 — sync `draftMode()` access
- **Class:** MANUAL
- **Detect:** `\bdraftMode\s*\(\s*\)\s*\.(isEnabled|enable|disable)`
- **TODO:** `// MANUAL: nextjs-modernizer BC-003 — next 15 made draftMode() async. Make the enclosing function async and: const dm = await draftMode(); dm.isEnabled. See https://nextjs.org/docs/app/guides/upgrading/version-15#async-request-apis-breaking-change`
- **Codemod:** `npx @next/codemod@canary next-async-request-api .`

### BC-004 — sync `params` destructure in page/layout/route props
- **Class:** MANUAL
- **Detect:** `\b(?:params|searchParams)\s*:\s*\{\s*[a-zA-Z_$][\w$]*\s*[:,}]`
- **TODO:** `// MANUAL: nextjs-modernizer BC-004 — next 15 made params/searchParams Promises. Type as Promise<{...}> in props, await it inside the (now async) component. See https://nextjs.org/docs/app/guides/upgrading/version-15#async-request-apis-breaking-change`
- **Codemod:** `npx @next/codemod@canary next-async-request-api .`
- **Why MANUAL:** The detection regex is intentionally broad (any destructure of `params` or `searchParams` in a props position); a safe rewrite needs to know whether the enclosing component is server or client and whether it's already async.

---

## Caching defaults flipped

### BC-101 — `fetch()` no longer cached by default
- **Class:** MANUAL
- **Detect:** `\bfetch\s*\(\s*['"\`][^'"\`]+['"\`]\s*\)`
- **TODO:** `// MANUAL: nextjs-modernizer BC-101 — next 15 fetch() default is cache: 'no-store' (was 'force-cache'). If this call relied on default caching, add { cache: 'force-cache' } and consider revalidate. See https://nextjs.org/docs/app/guides/upgrading/version-15#fetch-requests`
- **Why MANUAL:** Whether the call needs caching is a per-endpoint decision (security, freshness). The catalog finds every `fetch()` with a string URL; the team triages.

### BC-102 — GET Route Handler default-cached → default-uncached
- **Class:** MANUAL
- **Detect:** `^\s*export\s+(?:async\s+)?function\s+GET\s*\(`
- **TODO:** `// MANUAL: nextjs-modernizer BC-102 — next 15 GET route handlers are no longer cached by default. To keep static caching add: export const dynamic = 'force-static'. See https://nextjs.org/docs/app/guides/upgrading/version-15#route-handlers`
- **Why MANUAL:** Caching opt-in is a deployment-shape decision.

### BC-103 — Client Router Cache `staleTime` defaulted to 0
- **Class:** SAFE
- **Detect:** N/A (config-level behavior change; surfaces only as a Phase-3 validation note)
- **Skill action:** Add to "Phase 3 — Validation checklist": *"Page navigations no longer reuse a 30s in-memory route cache by default. If your UX assumed instant back/forward via Router Cache, set `experimental.staleTimes.dynamic` in `next.config.js`. See https://nextjs.org/docs/app/guides/upgrading/version-15#client-router-cache-no-longer-caches-page-components-by-default"*

---

## Removed / renamed config keys

### BC-201 — `experimental.bundlePagesExternals` renamed to stable
- **Class:** AUTOFIX
- **Detect:** `\bbundlePagesExternals\s*:`
- **Fix:** Replace `experimental.bundlePagesExternals` → `bundlePagesRouterDependencies` (top-level config key, no longer nested under `experimental`). The codemod does the relocation safely.
- **Codemod:** `npx @next/codemod@canary next-request-geo-ip .` *(includes config renames in this group)*
- **Source:** [§ NextRequest geolocation properties + config](https://nextjs.org/docs/app/guides/upgrading/version-15#config)

### BC-202 — `experimental.serverComponentsExternalPackages` renamed to stable
- **Class:** AUTOFIX
- **Detect:** `\bserverComponentsExternalPackages\s*:`
- **Fix:** Replace `experimental.serverComponentsExternalPackages` → `serverExternalPackages` (top-level). The codemod does the relocation safely.
- **Codemod:** `npx @next/codemod@canary next-request-geo-ip .`

### BC-203 — `runtime: 'experimental-edge'`
- **Class:** AUTOFIX
- **Detect:** `\bruntime\s*[:=]\s*['"]experimental-edge['"]`
- **Fix:** Replace `'experimental-edge'` → `'edge'` (and same for double-quoted). Matches both the route-segment-config form (`export const runtime = 'experimental-edge'`) and the object-key form (`{ runtime: 'experimental-edge' }`).
- **Source:** [§ Runtime config](https://nextjs.org/docs/app/guides/upgrading/version-15#runtime-configuration)

---

## Removed APIs

### BC-301 — `NextRequest.geo` and `NextRequest.ip` removed
- **Class:** MANUAL
- **Detect:** `\b(?:request|req)\s*\.\s*(?:geo|ip)\b`
- **TODO:** `// MANUAL: nextjs-modernizer BC-301 — next 15 removed NextRequest.geo and NextRequest.ip. On Vercel use @vercel/functions geolocation()/ipAddress(); self-hosted, read x-forwarded-for / x-real-ip headers. See https://nextjs.org/docs/app/guides/upgrading/version-15#nextrequest-geolocation`
- **Codemod:** `npx @next/codemod@canary next-request-geo-ip .` (Vercel target only; self-hosted requires manual rewrite)
- **Why MANUAL:** Replacement depends on hosting target.

### BC-302 — `next/image` `domains` config deprecated
- **Class:** MANUAL
- **Detect:** `\bdomains\s*:\s*\[`
- **TODO:** `// MANUAL: nextjs-modernizer BC-302 — next/image domains is deprecated. Migrate to remotePatterns: [{ protocol: 'https', hostname: '...' }]. Semantics differ — remotePatterns is stricter (path matching). See https://nextjs.org/docs/app/api-reference/components/image#remotepatterns`
- **Why MANUAL:** Detection regex matches any `domains:` array (including unrelated config). A safe rewrite needs context; flag it.

---

## React 19 peer requirement

### BC-401 — React 19 required
- **Class:** SAFE
- **Detect:** N/A (package.json check at discover step)
- **Skill action:** During discover, if `react` in `package.json` is `^18.x`, add to "Phase 3 — Validation checklist": *"Bump `react` and `react-dom` to `^19.0.0`. Run `npx @next/codemod@canary upgrade latest` for compat issues. The Pages Router still supports React 18 if a transitive dep blocks 19. See https://nextjs.org/docs/app/guides/upgrading/version-15#react-19"*

---

## Phase 3 validation checklist (always emit)

These items are not detected by `Grep` but every Next 15 migration plan must include them:

- Run `npx @next/codemod@canary upgrade latest` and review the diff before committing.
- Run `next build` locally before pushing — Next 15's stricter type checking on async request APIs surfaces issues at build time.
- Verify that the `staleTimes` Router Cache change does not regress UX (back-button perceived performance).
- Verify ESLint resolves: Next 15 uses ESLint 9 by default; if the repo pins ESLint 8, set `eslint.useFlatConfig: false` or migrate the config.
