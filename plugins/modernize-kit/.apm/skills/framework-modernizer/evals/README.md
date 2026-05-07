# Evals — framework-modernizer

Lightweight regression eval that locks the catalog regexes against a deliberate fixture.

## Run

```bash
node .apm/skills/framework-modernizer/evals/run.js
```

Exit `0` = all expected findings matched; exit `1` = drift (catalog regex changed, fixture changed, or expected file out of date). CI-friendly.

## What's here

| Path | Purpose |
|---|---|
| `run.js` | Pure-Node runner. Re-implements catalog regexes line-by-line and diffs vs `expected/findings.txt`. |
| `fixtures/express4-app/server.js` | Deliberate Express 4 mini-app exercising 8 of the 12 catalog patterns (BC-001, BC-002, BC-006, BC-007, BC-101, BC-102, BC-201, BC-202). |
| `fixtures/express4-app/package.json` | Pins `express ^4.18.2` so the fixture is unambiguously v4. |
| `expected/findings.txt` | Ground truth — `BC-ID<TAB>file<TAB>line` rows the runner must reproduce exactly. |

## Why it works this way

- **The catalog is the contract.** Every detection regex in [`../references/express-4-to-5-breaking-changes.md`](../references/express-4-to-5-breaking-changes.md) must have a corresponding entry in `run.js` and (for any pattern exercised by the fixture) a row in `expected/findings.txt`.
- **The fixture is intentionally broken.** Don't "fix" the v4 patterns — the file's whole purpose is to fail v5 detection so the eval has something to assert on.
- **Annotations use `EXPECT-NNN` form**, not the literal pattern, so comments don't trigger false positives in the regex pass.

## Extending — add a new BC-NNN pattern

1. Add the pattern to [`../references/express-4-to-5-breaking-changes.md`](../references/express-4-to-5-breaking-changes.md) with: ID, classification, source citation, detect regex, fix.
2. Add `['BC-NNN', /your-regex/]` to the `PATTERNS` array in `run.js`.
3. Add a triggering example to `fixtures/express4-app/server.js` (annotated `// EXPECT-NNN ...`).
4. Add the expected `BC-NNN<TAB>server.js<TAB><line>` row to `expected/findings.txt`.
5. Run `node .apm/skills/framework-modernizer/evals/run.js` and adjust line numbers if needed.

## Forking the pattern (Next 13→14, React 17→18, etc.)

Same structure, swap the catalog and fixture. See [`../references/DESIGN.md`](../references/DESIGN.md) for the Genesis handoff packet.
