---
name: panel-review
description: "Pre-push panel review of staged changes by architect + security personas. Catches design flaws and security gaps before the PR is even opened. Trigger before `git push` on any branch with non-trivial changes."
license: MIT
metadata:
  author: "Zava Engineering"
  source: "Zava platform team — derived from PR-review fatigue retrospective Q3"
---

# panel-review

Run a **two-persona review** (architect + security) on staged changes before you push. Surface findings as inline comments you can act on, fix, and amend — so the human PR reviewer sees clean, considered work, not first-draft.

## When to use this

- You have non-trivial staged changes (more than a typo fix, more than a config bump).
- You want to catch your own blind spots before paying the human-reviewer tax.
- You're working on a PR that touches: a new endpoint, schema change, auth boundary, dependency add, or anything in `infra/`.

## When NOT to use this

- Trivial fixes (typo, comment, version bump). The panel will surface noise.
- You're in the middle of an incident and need to ship a hotfix. Skip; the on-call panel reviews after.

## Inputs

- **Required:** staged changes (`git diff --staged`). Skill auto-reads.
- **Optional:** scope hint (`--scope auth`, `--scope storage`, `--scope ui`) to focus the personas.

## Output

A markdown report with two sections — one per persona — each containing:

```markdown
## 🏛️ Architect review

### What I see
<one-paragraph summary of the change in architectural terms>

### Concerns
- **<concern>** — <why it matters> — <suggested fix or "open question">
- ...

### Looks good
- <brief positive note when things are well-structured>

---

## 🛡️ Security review

### What I see
<one-paragraph summary in security terms>

### Findings
- **[BLOCKER] <finding>** — <impact> — <required fix>
- **[WARNING] <finding>** — <impact> — <suggested fix>
- **[INFO] <finding>** — <observation only>

### Checklist (from `secure-coding-base.instructions.md`)
- [x] / [ ] No new secrets
- [x] / [ ] AuthN + AuthZ on new handlers
- [x] / [ ] Parameterized queries
- [x] / [ ] Dependencies justified
- [x] / [ ] PII masked in logs
```

## Process

1. **Read the diff.** `git diff --staged` is the source of truth, not the working tree.
2. **Invoke the architect persona** (`.apm/agents/architect.agent.md`) with the diff as input. Ask for: scaling implications, coupling, missing abstractions, testability, deviation from existing patterns.
3. **Invoke the security persona** (`.apm/agents/security.agent.md`) with the diff. Ask for: each item in the `secure-coding-base` checklist, plus any new attack surface.
4. **Aggregate findings** into the report format above. Tag severity honestly — not every concern is a blocker.
5. **Surface the report to the human** for action. Do not auto-amend the commit.

## Hard rules

- **Diff-only input.** Do not read files outside the diff unless explicitly asked. Reviewers' job is the change, not the codebase tour.
- **Severity is honest.** A `[BLOCKER]` means "do not push." Inflating severity destroys trust in the panel.
- **No silent skips.** If a persona has nothing to say, write "no concerns" explicitly. Empty sections look like the skill broke.

## Wired to the `pr-review-gate` hook

The `pr-review-gate.hook.md` triggers `panel-review` automatically on `pre-push` for branches matching `feat/*`, `fix/*`, `chore/*`. You can run it manually anytime.

## Example invocation

```
> Run panel-review on my staged changes. Scope: auth.
```

## See also

- `architect.agent.md` — persona invoked for architectural review
- `security.agent.md` — persona invoked for security review
- `secure-coding-base.instructions.md` — the security checklist applied
- `pr-review-gate.hook.md` — automated trigger
