# zava-agent-config

**Central agent configuration for Zava Engineering.** Every Zava service repo (storefront, checkout, platform, …) pins this package via `apm.yml`, so a single change here propagates to every developer's IDE, every PR, and every Coding Agent run across the org.

> Part of the joint Microsoft + GitHub Agentic SDLC Demo Platform. See [`PLATFORM.md`](https://github.com/DevExpGbb/agentic-sdlc-ref/blob/main/PLATFORM.md) for the full reference and [`delivery/lloyds-ph1-delivery-plan.md`](https://github.com/DevExpGbb/agentic-sdlc-ref/blob/main/delivery/lloyds-ph1-delivery-plan.md) for the customer-facing workshop slice.

## What's in here

| Surface | Files | Purpose |
|---|---|---|
| Skills | `.apm/skills/` — `meeting-to-issue/`, `panel-review/`, `incident-to-pr/` | Reusable agent behaviors any service can invoke |
| Instructions | `.apm/instructions/` — `secure-coding-base.instructions.md`, `ci-cd-golden-paths.instructions.md`, `docs-style-guide.instructions.md` | Standing context every agent loads (scoped via `applyTo:`) |
| Personas | `.apm/agents/` — `architect.agent.md`, `security.agent.md` | Reusable expert mindsets for review and design |
| Hooks | `.apm/hooks/` — `pr-review-gate.hook.md` | Lifecycle gates triggered by repo events |
| Policy | `apm-policy.yaml` | Org-level allow/deny lists enforced by `apm audit --ci --policy` |
| CI | `.github/workflows/apm-audit.yml` | Drift + policy fail-closed on PR |

## How a Zava service repo consumes this

```yaml
# zava-storefront/apm.yml
dependencies:
  apm:
    - DevExpGbb/zava-agent-config#v0.1.0
```

After `apm install`, the service inherits all skills, instructions, personas, and hooks. Layered service-local instructions in the consumer's `.apm/` always win over inherited ones — see [APM layering docs](https://microsoft.github.io/apm/).

## Governance

`apm-policy.yaml` here is the **org-level policy** that:
- Restricts `dependencies.allow:` to `DevExpGbb/*` (no random community skills)
- Blocks specific MCP servers known to leak
- Enforces `enforced: true` instruction overrides — service repos cannot bypass `secure-coding-base`

CI gates (`apm audit --ci --policy org`) run on every PR. A GHE org-level ruleset (configured outside this repo, on `zava-engineering`) makes the green check **required for merge**.

## Local dev

```bash
git clone https://github.com/DevExpGbb/zava-agent-config.git
cd zava-agent-config
apm install        # no external deps, validates manifest
apm audit          # scan for hidden Unicode in any included files
```
