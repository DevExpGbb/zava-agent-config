---
applyTo: ".github/workflows/**,infra/**,**/*.tf,**/*.bicep,Dockerfile*"
description: "Zava CI/CD golden paths. Reusable workflows, deployment gates, IaC standards. Anything CI/CD must compose from these — no bespoke pipelines."
---

# Zava CI/CD Golden Paths

The platform team ships **reusable GitHub Actions workflows** and **paved-road IaC modules**. Service teams compose; they do not invent.

## Reusable workflows (call, don't copy)

| Workflow | Path | Purpose |
|---|---|---|
| `ci-build-test` | `DevExpGbb/zava-ci-templates/.github/workflows/ci-build-test.yml@v2` | Lint + unit + integration tests, language auto-detect (Node, Python, Java, Go) |
| `apm-audit` | `DevExpGbb/zava-ci-templates/.github/workflows/apm-audit.yml@v2` | `apm audit --ci --policy org` — drift + policy fail-closed |
| `security-scan` | `DevExpGbb/zava-ci-templates/.github/workflows/security-scan.yml@v2` | CodeQL + dependency review + gitleaks + SBOM |
| `deploy-aks` | `DevExpGbb/zava-ci-templates/.github/workflows/deploy-aks.yml@v2` | Blue/green deploy to AKS with OIDC |
| `deploy-functions` | `DevExpGbb/zava-ci-templates/.github/workflows/deploy-functions.yml@v2` | Slot-swap deploy for Functions with OIDC |

### Calling pattern

```yaml
# .github/workflows/ci.yml in any service repo
name: CI
on: [pull_request, push]
jobs:
  build-test:
    uses: DevExpGbb/zava-ci-templates/.github/workflows/ci-build-test.yml@v2
    with:
      language: auto
  apm-audit:
    uses: DevExpGbb/zava-ci-templates/.github/workflows/apm-audit.yml@v2
  security:
    uses: DevExpGbb/zava-ci-templates/.github/workflows/security-scan.yml@v2
    secrets: inherit
```

**Pin to a major version (`@v2`)** — never `@main`. Renovate auto-PRs minor bumps.

## Deployment gates (mandatory)

Every production deploy job **must** declare:

```yaml
environment:
  name: production
  url: ${{ steps.deploy.outputs.app_url }}
permissions:
  id-token: write    # OIDC to Azure — never long-lived secrets
  contents: read
```

Production environments require **two human approvers** + green from: `apm-audit`, `security-scan`, `ci-build-test`. Configure in Settings → Environments → production.

## IaC standards

- **Terraform** for cloud resources, **Bicep** for Azure-native resources where the team prefers ARM transparency.
- All modules from `DevExpGbb/zava-iac-modules` (versioned, peer-reviewed). No raw `azurerm_*` or `Microsoft.*` resources in service repos — call modules.
- State in Azure Storage backend with state-lock; one state file per environment.
- `terraform plan` posted as PR comment; `terraform apply` only on merge to `main` and only via the reusable `tf-apply.yml` workflow.

## Containers

- Base images from `mcr.microsoft.com/cbl-mariner` family or `gcr.io/distroless`. **No `latest`, no Alpine for glibc-dependent stacks.**
- Multi-stage Dockerfile mandatory. Final stage runs as non-root (`USER 10001`).
- Image signed with `cosign` in `deploy-aks` workflow; admission controller verifies signature.

## What NOT to do

- ❌ Hand-rolled deployment scripts in `scripts/deploy.sh`. Use `deploy-aks` / `deploy-functions`.
- ❌ Long-lived service principal secrets. OIDC only.
- ❌ Pinning reusable workflows to `@main` or a SHA — use the published major tag.
- ❌ Disabling required checks "just for this PR." Open an exemption issue with the platform team instead.

## Need something not in the catalog?

Open an issue at `DevExpGbb/zava-ci-templates` titled `[platform-request] <thing>`. Platform team triages weekly. If genuinely org-specific to your service, scaffold under `.github/workflows/_local-<thing>.yml` with a TODO linking the issue.
