# zava-agent-config

**Central agent configuration marketplace for Zava Engineering.** Every Zava service repo (storefront, checkout, platform, …) pins one or more plugins from this package via `apm.yml`, so a single change here propagates to every developer's IDE, every PR, and every Coding Agent run across the org.

> Part of the joint Microsoft + GitHub Agentic SDLC Demo Platform. See [`PLATFORM.md`](https://github.com/DevExpGbb/agentic-sdlc-ref/blob/main/PLATFORM.md) for the full reference and [`delivery/lloyds-ph1-delivery-plan.md`](https://github.com/DevExpGbb/agentic-sdlc-ref/blob/main/delivery/lloyds-ph1-delivery-plan.md) for the customer-facing workshop slice.

## How the kits compose

```mermaid
flowchart TB
    subgraph SDLC["AGENTIC SDLC  ·  the consumer team's compounding layer"]
        direction LR
        P1[IDEATE]
        P2[CODE]
        P3[REVIEW]
        P4[RELEASE]
        P5[OPERATE]
    end

    subgraph KITS["Phase kits  ·  one per SDLC stage, independently versioned"]
        direction LR
        K1["<b>ideate-kit</b><br/>meeting-to-issue<br/><i>skill</i>"]
        K2["<b>code-kit</b><br/>architect<br/><i>persona</i>"]
        K3["<b>review-kit</b><br/>panel-review<br/><i>skill</i>"]
        K4["<b>release-kit</b><br/>ci-cd-golden-paths<br/><i>instructions</i>"]
        K5["<b>operate-kit</b><br/>incident-to-pr<br/><i>skill</i>"]
    end

    subgraph COMMON["Common substrate  ·  shared instructions + personas, applied across every phase"]
        direction LR
        CB1["<b>secure-baseline</b><br/>secure-coding<br/><i>instructions</i>"]
        CB2["<b>secure-baseline</b><br/>docs-style<br/><i>instructions</i>"]
        CB3["<b>secure-baseline</b><br/>security<br/><i>persona</i>"]
    end

    P1 --> K1
    P2 --> K2
    P3 --> K3
    P4 --> K4
    P5 --> K5

    SDLC -.->|underpins every phase| COMMON

    classDef phase fill:#9eff66,stroke:#9eff66,color:#1a1f3a,font-weight:bold
    classDef kit fill:#1a1f3a,stroke:#9eff66,stroke-width:2px,color:#f5f1e8
    classDef baseline fill:#1a1f3a,stroke:#c9a36b,stroke-width:2px,color:#f5f1e8

    class P1,P2,P3,P4,P5 phase
    class K1,K2,K3,K4,K5 kit
    class CB1,CB2,CB3 baseline

    style SDLC fill:#0f1428,stroke:#3d4560,color:#9eff66
    style KITS fill:#0f1428,stroke:#3d4560,color:#f5f1e8
    style COMMON fill:#1a1f3a,stroke:#c9a36b,color:#c9a36b
```

> *Modular packages. Composable agent behaviour.* — One kit per SDLC phase, plus a common substrate of shared instructions and personas (today: `secure-baseline`; tomorrow: more). Each kit is independently versioned, pinned by consumers in `apm.yml`, audited every PR, and distributed as signed tarballs (see [Governance](#governance)).

## What's in here (v5.0.1)

A 6-plugin APM marketplace aligned to the [PLATFORM.md §6.1](https://github.com/DevExpGbb/agentic-sdlc-ref/blob/main/PLATFORM.md#61-layer-a--the-sdlc-ribbon) SDLC ribbon:

| Plugin | SDLC stage | Source |
|---|---|---|
| [`secure-baseline`](plugins/secure-baseline/) | cross-cutting | secure-coding + docs-style instructions; security persona |
| [`ideate-kit`](plugins/ideate-kit/) | IDEATE | `meeting-to-issue` skill |
| [`code-kit`](plugins/code-kit/) | CODE | architect persona (design-intent guidance during authoring) |
| [`review-kit`](plugins/review-kit/) | REVIEW | `panel-review` skill (pre-PR self-review by author) |
| [`release-kit`](plugins/release-kit/) | RELEASE | `ci-cd-golden-paths` instructions |
| [`operate-kit`](plugins/operate-kit/) | OPERATE | `incident-to-pr` skill |

See [`CATALOG.md`](CATALOG.md) for the full index, migration table from v1.0.x, and consumer pin recipes.

## How a Zava service repo consumes this

```yaml
# zava-storefront/apm.yml — pick only the kits you need
dependencies:
  apm:
    - DevExpGbb/zava-agent-config/plugins/secure-baseline#v5.0.1
    - DevExpGbb/zava-agent-config/plugins/code-kit#v5.0.1
    - DevExpGbb/zava-agent-config/plugins/review-kit#v5.0.1
    - DevExpGbb/zava-agent-config/plugins/release-kit#v5.0.1
```

After `apm install`, the service inherits the selected plugins' skills, instructions, and personas. Layered service-local instructions in the consumer's `.apm/` always win over inherited ones.

## Governance

Org-wide policy lives at [`DevExpGbb/.github/apm-policy.yml`](https://github.com/DevExpGbb/.github/blob/main/apm-policy.yml) and is automatically inherited by every repo. CI gates (`apm audit --ci`) run on every PR via the reusable workflow at [`.github/workflows/apm-audit.yml`](.github/workflows/apm-audit.yml). A GHE org-level ruleset (configured on `zava-engineering`) makes the green check **required for merge**.

This repo eats its own dog food via [`.github/workflows/self-audit.yml`](.github/workflows/self-audit.yml): every push runs `apm install` + `apm audit --ci` + `apm pack` against the marketplace and fails the build on drift.

## Local dev

```bash
git clone https://github.com/DevExpGbb/zava-agent-config.git
cd zava-agent-config
apm install                  # no-op (marketplace repo, zero deps), catches CLI regressions
apm audit --ci               # org-policy + supply-chain checks
apm pack --offline           # rebuild .claude-plugin/marketplace.json (commit any diff)
```
