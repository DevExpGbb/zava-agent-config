---
name: incident-to-pr
description: "Turn a Sev-1/Sev-2 incident postmortem into a remediation PR with the fix, regression test, and runbook update. Trigger when given a postmortem document containing identified root cause + agreed remediation."
license: MIT
metadata:
  author: "Zava Engineering"
  source: "Zava platform team — derived from incident-response retro Q2"
---

# incident-to-pr

Take a finalized incident postmortem and produce a **single, focused PR** that implements the agreed remediation, adds a regression test that would have caught the original incident, and updates the service runbook.

## When to use this

- A Sev-1 or Sev-2 incident has been resolved.
- The postmortem is **finalized** (root cause confirmed, remediation agreed by on-call + service owner).
- The remediation is **a code/config change** — not a process change, not a "we'll think about it."

## When NOT to use this

- Postmortem is still draft / under discussion. Run on the final version.
- Remediation is purely organizational (e.g., "rotate on-call schedule"). Wrong tool.
- Multiple unrelated remediations in one postmortem — split into multiple invocations, one PR each.

## Inputs

- **Required:** path to the finalized postmortem (markdown).
- **Optional:** target service repo (default: the one named in the postmortem's "service" field), milestone, severity label.

## Output

One PR with this shape:

### Branch name
`fix/incident-<YYYY-MM-DD>-<short-slug>`

### Commit structure (squash-ready)
1. `fix: <one-line root-cause-driven summary>`
2. `test: regression test for <incident-id>`
3. `docs: runbook entry for <failure-mode>`

### PR description template

```markdown
## Incident reference

- **Postmortem:** <link or path>
- **Incident ID:** <ID>
- **Severity:** Sev-<1|2>
- **Date:** <YYYY-MM-DD>
- **Detected by:** <alert / customer / synthetic>

## Root cause (verbatim from postmortem)

> <quote the root-cause section verbatim — no paraphrase>

## What this PR changes

<2–3 sentences mapping the postmortem remediation to the code/config diff>

## Regression test

- File: `<path/to/test>`
- This test, run against the pre-fix code, **fails**. Verified locally on commit `<sha>`.

## Runbook update

- Added new section to `docs/runbook.md`: "<failure-mode> — symptoms, immediate mitigation, long-term fix."

## Out of scope

<what's deliberately not in this PR — link to follow-up issues if needed>

## Reviewers

- Service owner (required)
- On-call who handled the incident (required — they validate the regression test catches what they saw)
- Security (required if Sev-1 or if root cause touches auth/PII/crypto)
```

## Process

1. **Parse the postmortem.** Extract: root cause (verbatim), remediation (verbatim), service, severity, incident ID, date, detection method.
2. **Confirm the remediation is in scope.** If the postmortem proposes both code and process changes, only carry the code change. Note the process changes in "Out of scope."
3. **Check out a fresh branch** from the service repo's `main`.
4. **Implement the fix.** Smallest possible diff that addresses the root cause. No drive-by refactors — those are separate PRs.
5. **Write the regression test.** It must fail against the pre-fix code (verify by checking out `main`, applying only the test, running, observing failure). Then check out the fix branch and verify it passes.
6. **Update `docs/runbook.md`.** New section with: symptom, immediate mitigation (what on-call should do), long-term fix (this PR), prevention.
7. **Open the PR** with the description template above. Tag the right reviewers.

## Hard rules

- **Root cause is verbatim.** No softening, no paraphrase. The postmortem is the source of truth.
- **One incident = one PR.** Bundling remediations across incidents destroys the audit trail.
- **Regression test or no PR.** A fix without a test that would have caught the incident is not done. If the test is genuinely impossible (e.g., requires production scale), document that in the PR and require an explicit owner sign-off.
- **No drive-by changes.** Fix only what the root cause demands. Other improvements go in separate PRs that link this one.

## Example invocation

```
> Use incident-to-pr on docs/postmortems/2025-05-08-checkout-payment-timeout.md.
> Target repo: DevExpGbb/zava-checkout.
```

## See also

- `panel-review` skill — runs on the resulting branch before push
- `secure-coding-base.instructions.md` — applied to the fix
