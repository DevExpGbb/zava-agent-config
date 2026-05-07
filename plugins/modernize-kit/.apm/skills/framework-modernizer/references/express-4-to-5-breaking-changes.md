# Express 4 → 5 breaking changes catalog

> **Source:** Official [Express 5 migration guide](https://expressjs.com/en/guide/migrating-5.html). Every pattern below cites the section heading. Do not extend this catalog with patterns from your training data — fetch the migration guide and add citations.

This catalog drives the `framework-modernizer` skill. Each entry has:
- **ID** — stable identifier (BC-NNN) for cross-reference
- **Class** — `SAFE` / `AUTOFIX` / `MANUAL` (from [`classifier-rubric.md`](classifier-rubric.md))
- **Detect** — a `Grep` pattern (PCRE) the skill runs across `**/*.{js,mjs,cjs,ts}`
- **Fix** — for AUTOFIX: the exact `Edit` to apply. For MANUAL: the TODO comment to insert.
- **Source** — anchor in the migration guide

---

## Removed methods (most are AUTOFIX with deterministic codemods)

### BC-001 — `app.del()` removed
- **Class:** AUTOFIX
- **Detect:** `\bapp\.del\s*\(`
- **Fix:** Replace `app.del(` → `app.delete(`. Same for any `router.del(` → `router.delete(`.
- **Source:** [§ app.del()](https://expressjs.com/en/guide/migrating-5.html#app.del)

### BC-002 — `res.send(status)` (numeric status as only arg) removed
- **Class:** AUTOFIX
- **Detect:** `\bres\.send\s*\(\s*\d{3}\s*\)`
- **Fix:** Replace `res.send(NNN)` → `res.sendStatus(NNN)`.
- **Source:** [§ res.send(status)](https://expressjs.com/en/guide/migrating-5.html#res.send.status)

### BC-003 — `res.send(body, status)` two-arg signature removed
- **Class:** MANUAL
- **Detect:** `\bres\.send\s*\(\s*[^,)]+,\s*\d{3}\s*\)`
- **TODO:** `// MANUAL: framework-modernizer BC-003 — express 5 removed res.send(body, status). Rewrite as: res.status(NNN).send(body). See https://expressjs.com/en/guide/migrating-5.html#res.send.body`
- **Why MANUAL:** Detection regex matches but a safe `Edit` requires re-ordering with full token awareness (multiline, expressions). Codemod (`@expressjs/status-send-order`) handles it; we surface the recommendation but don't risk a malformed edit.

### BC-004 — `res.json(obj, status)` two-arg signature removed
- **Class:** MANUAL
- **Detect:** `\bres\.json\s*\(\s*[^,)]+,\s*\d{3}\s*\)`
- **TODO:** `// MANUAL: framework-modernizer BC-004 — express 5 removed res.json(obj, status). Rewrite as: res.status(NNN).json(obj). See https://expressjs.com/en/guide/migrating-5.html#res.json`

### BC-005 — `res.redirect(url, status)` arg-order swapped
- **Class:** MANUAL
- **Detect:** `\bres\.redirect\s*\(\s*['"][^'"]+['"]\s*,\s*\d{3}\s*\)`
- **TODO:** `// MANUAL: framework-modernizer BC-005 — express 5 swapped redirect arg order. Rewrite as: res.redirect(NNN, '/path'). See https://expressjs.com/en/guide/migrating-5.html#res.redirect`

### BC-006 — `res.redirect('back')` magic string removed
- **Class:** AUTOFIX
- **Detect:** `\bres\.redirect\s*\(\s*['"]back['"]\s*\)`
- **Fix:** Replace `res.redirect('back')` → `res.redirect(req.get('Referrer') || '/')`. Handle both `'back'` and `"back"`.
- **Source:** [§ res.redirect('back')](https://expressjs.com/en/guide/migrating-5.html#magic-redirect)

### BC-007 — `res.sendfile()` (lowercase) renamed
- **Class:** AUTOFIX
- **Detect:** `\bres\.sendfile\s*\(`
- **Fix:** Replace `res.sendfile(` → `res.sendFile(`.
- **Source:** [§ res.sendfile()](https://expressjs.com/en/guide/migrating-5.html#res.sendfile)

### BC-008 — `req.param(name)` removed
- **Class:** MANUAL
- **Detect:** `\breq\.param\s*\(`
- **TODO:** `// MANUAL: framework-modernizer BC-008 — express 5 removed req.param(name). Use req.params, req.body, or req.query directly depending on source. See https://expressjs.com/en/guide/migrating-5.html#req.param`

---

## Path-route matching (path-to-regexp 0.x → 8.x)

### BC-101 — Unnamed wildcard `*` no longer supported
- **Class:** MANUAL
- **Detect:** `\.(?:get|post|put|patch|delete|all|use)\s*\(\s*['"][^'"]*\*(?![a-zA-Z_])[^'"]*['"]`
- **TODO:** `// MANUAL: framework-modernizer BC-101 — express 5 requires named wildcards. Rewrite '*' as '*splat' (or '/{*splat}' to also match root). See https://expressjs.com/en/guide/migrating-5.html#path-syntax`
- **Why MANUAL:** Renaming wildcards requires reading downstream code to understand if `req.params[0]` was used; rename may need to become `req.params.splat`.

### BC-102 — Optional segment `?` no longer supported
- **Class:** MANUAL
- **Detect:** `\.(?:get|post|put|patch|delete|all|use)\s*\(\s*['"][^'"]*:[a-zA-Z_]\w*\?[^'"]*['"]`
- **TODO:** `// MANUAL: framework-modernizer BC-102 — express 5 dropped ':param?' optional syntax. Use brace-wrapped form: '/path/{:param}'. See https://expressjs.com/en/guide/migrating-5.html#path-syntax`

### BC-103 — Regex char class in route string
- **Class:** MANUAL
- **Detect:** `\.(?:get|post|put|patch|delete|all|use)\s*\(\s*['"][^'"]*\[[^\]]*\|[^\]]*\][^'"]*['"]`
- **TODO:** `// MANUAL: framework-modernizer BC-103 — express 5 dropped regex chars '[a|b]' in route strings. Pass an array of paths instead: ['/a/...', '/b/...']. See https://expressjs.com/en/guide/migrating-5.html#path-syntax`

---

## Behavior changes (mostly SAFE — informational)

### BC-201 — `express.urlencoded` `extended` default flipped
- **Class:** SAFE
- **Detect:** `express\.urlencoded\s*\(\s*\)` (no-arg form) OR `express\.urlencoded\s*\(\s*\{[^}]*\}\s*\)` (without explicit `extended`)
- **Note:** In v4 `extended` defaulted to `true`; in v5 it defaults to `false`. If your code relies on parsing rich nested objects, set `extended: true` explicitly. **No edit applied** — emit informational line in plan.
- **Source:** [§ express.urlencoded](https://expressjs.com/en/guide/migrating-5.html#express.urlencoded)

### BC-202 — `express.static` `dotfiles` default flipped to `'ignore'`
- **Class:** SAFE
- **Detect:** `express\.static\s*\(`
- **Note:** v4 served dotfiles by default; v5 ignores them. If serving `.well-known/` etc., set `{ dotfiles: 'allow' }` explicitly. Informational only.
- **Source:** [§ express.static dotfiles](https://expressjs.com/en/guide/migrating-5.html#express.static.dotfiles)

---

## Catalog summary

| Class | Count | Skill action |
|---|---|---|
| AUTOFIX | 3 (BC-001, BC-006, BC-007) | Apply `Edit` in step 4 |
| MANUAL | 7 (BC-003, BC-004, BC-005, BC-008, BC-101, BC-102, BC-103) | Insert TODO comment + reference link |
| SAFE | 2 (BC-201, BC-202) | Note in MIGRATION-PLAN.md "Phase 3 — Validation checklist" |

Total: **12 patterns**. The fixture at `evals/fixtures/express4-app/` triggers 6 of these (validated by `evals/expected/findings.txt`).
