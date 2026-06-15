# Zava platform — golden-path provisioning

This directory is the **platform control surface** for Demo 2: an agentic
golden path that turns a service name into a fully provisioned, governed repo.

```
developer / agent  ──▶  "🚀 Provision golden-path service" (workflow_dispatch)
                              │  runs as the platform identity
                              ▼
        platform/provision/zava-provision.sh
                              │
   repo from zava-app-template ─ Entra identity + GitHub-federated OIDC ─
   RG-scoped RBAC ─ repo vars + dev environment ─ first deploy
                              ▼
        DevExpGbb/<service>  ──▶  Deploy (golden path) ──▶  Azure Container Apps (HTTP 200)
```

## The three governance planes this demo lands

| Plane | What it governs | Where it shows up |
|-------|-----------------|-------------------|
| **APM** (supply chain) | What goes *into* the agent's repos | `apm.yml` + `ci.yml` audit gate inherited from the template |
| **GitHub Enterprise** | The agent's runtime / SDLC | OIDC deploy, gated `platform` environment, branch protections |
| **Azure** | The agent's cloud blast radius | RG-per-service, RG-scoped RBAC, federated (secretless) identities |

## Two golden paths

- **Service 1 — deploy golden path** (`zava-app-template`): a repo deploys itself
  to Azure via OIDC. Proven: `DevExpGbb/zava-orders` → HTTP 200.
- **Service 2 — provision golden path** (this workflow): one trigger creates a
  Service-1-shaped repo with OIDC pre-wired. "Developer → working provisioned
  environment."

## Platform identity (one-time setup)

The provisioning workflow acts on the **whole org and subscription**, so it runs
as a dedicated platform identity — never as a developer's credentials.

### Azure — `zava-platform-provisioner` (secretless, already wired)

- App registration + service principal, **OIDC-federated** to this repo's
  `platform` environment (subject `repo:DevExpGbb/zava-agent-config:environment:platform`).
- Least privilege: **Owner** at the subscription (to create resource groups and
  RBAC) + Microsoft Graph **Application.ReadWrite.OwnedBy** (manage only the app
  registrations it creates).
- Exposed to CI as repo **variables** (not secrets): `AZURE_CLIENT_ID`,
  `AZURE_TENANT_ID`, `AZURE_SUBSCRIPTION_ID`.

Verify it with the **Platform auth smoke (OIDC)** workflow.

### GitHub — `ZAVA_PLATFORM_TOKEN` (one secret you must add)

A workflow's default `GITHUB_TOKEN` is scoped to *this* repo and **cannot create
or configure other repos**. To create and wire new service repos, the workflow
needs an org-scoped token. Add it once as a repository **secret** named
`ZAVA_PLATFORM_TOKEN`:

- **Recommended — GitHub App** ("Zava Platform"): install on `DevExpGbb` with
  `Administration: write`, `Contents: write`, `Variables: write`,
  `Environments: write`, `Actions: write`; mint an installation token in-workflow.
  No long-lived PAT.
- **Quick — fine-grained PAT**: same permissions on `DevExpGbb`, stored as the
  secret directly.

Once the secret is present, the provisioning workflow runs unattended end-to-end.

## Engine — `provision/zava-provision.sh`

Idempotent, eight steps: repo-from-template → resource group → Entra app + SP →
federated credential (`environment:dev`) → RG-scoped Owner RBAC → `dev`
environment → repo variables → trigger first deploy. Runs the same locally
(operator `az`/`gh` login) or in CI (platform OIDC + `ZAVA_PLATFORM_TOKEN`).

## Deferred (Phase 1 / 2)

- **Phase 1** — agent/issue front door (a Copilot skill or issue template that
  calls this golden path). The agent-facing prompt lives in
  `skills/provision-golden-path.prompt.md`.
- **Phase 2** — Azure substrate in `zava-landing-zone` (ADE Dev Center for
  environment templates, APIM MCP registry, Key Vault), an Enterprise Managed
  Copilot plugin bundling this golden path, and an org ruleset enforcing it.
