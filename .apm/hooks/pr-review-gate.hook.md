---
name: pr-review-gate
description: "Pre-push hook that runs the panel-review skill on staged changes for non-trivial branches. Blocks the push if BLOCKER findings remain unaddressed."
trigger: pre-push
applies_to_branches:
  - "feat/*"
  - "fix/*"
  - "chore/*"
  - "refactor/*"
license: MIT
---

# pr-review-gate hook

**Runs:** before `git push` on branches matching the patterns above.

**Purpose:** catch your own architecture and security blind spots before the human reviewer pays the cost of seeing them. Faster review, less back-and-forth, fewer "you missed X" comments.

## Behavior

1. **On `pre-push`**, the hook resolves the diff against the upstream branch (`git diff @{upstream}...HEAD`).
2. If the diff is **trivial** (only docs/comments/whitespace, < 20 lines changed), the hook exits 0 silently. No noise.
3. Otherwise, the hook **invokes the `panel-review` skill** on the diff. Output streams to stderr.
4. The hook **parses the output** for `[BLOCKER]` findings.
5. If **zero BLOCKERs**, the hook exits 0 and the push proceeds.
6. If **one or more BLOCKERs**, the hook exits 1 and the push is rejected. The user sees the findings inline in the terminal.

## Bypass

```bash
git push --no-verify
```

⚠️ Bypassing emits a tracked event (`hook.pr-review-gate.bypass`) so the team can spot patterns. Bypassing is fine for genuine emergencies — but if it becomes routine, the hook is wrong, not the user.

## Configuration

This hook is registered automatically when consumers `apm install` `zava-agent-config`. It is wired via the harness's hook installer (Claude Code → `.claude/hooks/`, Copilot CLI → `.copilot/hooks/`, Cursor → `.cursor/hooks/`). The same hook definition compiles to each.

## Why a hook and not a CI check

Both. The CI check (`apm-audit.yml`) is the authoritative gate. The hook is the **fast-feedback loop** so you do not push, wait 4 minutes, and find out you forgot the security checklist. CI confirms; the hook prevents.

## See also

- `panel-review` skill — the work the hook actually triggers
- `architect.agent.md`, `security.agent.md` — the personas invoked by the panel
- `.github/workflows/apm-audit.yml` — the canonical CI gate
