# Classifier rubric

Every finding from the scan step gets exactly one class. Use this table; do not invent new classes.

## SAFE
- The pattern compiles and runs in v5 **without code change**.
- Behavior **may differ** (e.g. defaults flipped). Worth surfacing to the team but **do not edit**.
- Examples: `BC-201` (urlencoded extended default), `BC-202` (static dotfiles default).
- **Skill action:** Add to "Phase 3 — Validation checklist" in MIGRATION-PLAN.md. No `Edit` call.

## AUTOFIX
- The transformation is **textually deterministic** — a single search+replace produces correct v5 code in every reasonable case.
- The transformation is **scope-local** — does not require reading other files or understanding the surrounding control flow.
- Risk of a malformed edit is effectively zero.
- Examples: `BC-001` (`app.del` → `app.delete`), `BC-006` (`'back'` redirect), `BC-007` (`sendfile` → `sendFile`).
- **Skill action:** Apply via `Edit` tool. Log a one-line diff. Add to "Phase 1 — Autofixed" section.

## MANUAL
- Detection works, but the safe rewrite requires:
  - Reading other files (e.g. `req.params[0]` consumers downstream of a wildcard rename), OR
  - Multi-token reordering with expression awareness (e.g. `res.send({...obj}, 200)`), OR
  - A semantic decision the team owns (e.g. is this `req.param('x')` actually `req.body.x` or `req.query.x`?).
- **Skill action:** Insert a TODO comment **on the line above** the finding. Add to "Phase 2 — Manual edits required" with the file path, line number, and a link to the migration guide section. **Do not edit the offending line itself.**

## Tie-breakers

- If a pattern *could* be AUTOFIX but the regex has any chance of matching unrelated code → MANUAL. **Bias to safety.**
- If the official Express team ships a codemod (`@expressjs/...`) for the change but the regex match is ambiguous → MANUAL with TODO that recommends running the codemod.
- Never invent a new class. If a finding fits none of these three, the catalog entry is wrong — fix the catalog.
