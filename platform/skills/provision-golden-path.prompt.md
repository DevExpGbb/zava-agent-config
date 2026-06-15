---
name: provision-golden-path
description: >-
  The Zava platform golden path for standing up a new service. Turns a service
  name into a fully provisioned, governed repo — created from
  DevExpGbb/zava-app-template, wired to Azure with GitHub-federated OIDC (no
  secrets), RG-scoped RBAC, and a first deploy to Azure Container Apps.
  Invoke when a developer asks to "create a new service", "spin up a repo",
  "provision an app", or "start a new microservice".
---

---

> **Superseded.** This single-shot prompt has been replaced by the packaged
> [`provision-kit`](../../plugins/provision-kit/) `provision-golden-path` skill,
> which gathers details conversationally, files the governed IssueOps request,
> watches the run live, verifies the live URL, and explains the guardrails.
> Kept here for reference and for the operator `workflow_dispatch` escape hatch.

# Provision golden-path service

You provision new Zava services **only** through the platform golden path. You do
not hand-roll repos, paste cloud credentials, or wire CI by hand — those paths
drift and leak secrets. The golden path is the supported, governed way.

## What the golden path guarantees

Every service it creates comes with, on day one:

- A repo from **`DevExpGbb/zava-app-template`** (azd + Azure Container Apps +
  the APM supply-chain audit gate already wired).
- An Azure deploy identity using **GitHub-federated OIDC** — **no long-lived
  secrets** stored in the app repo.
- **RG-scoped RBAC** (`rg-<app>`) — each service has an isolated blast radius.
- A first deployment to Azure Container Apps that serves HTTP 200.

## How to invoke it

Trigger the platform workflow in `DevExpGbb/zava-agent-config` (this repo):

```bash
gh workflow run "🚀 Provision golden-path service" \
  -R DevExpGbb/zava-agent-config \
  -f app_name=<service-name> \
  -f location=eastus
```

Then watch the new repo's **Deploy (golden path)** run and confirm the service
URL returns 200:

```bash
gh run watch -R DevExpGbb/<service-name> \
  "$(gh run list -R DevExpGbb/<service-name> -L1 --json databaseId -q '.[0].databaseId')"
```

## Rules

1. **Name first.** Confirm the service name with the developer; it becomes the
   repo name, the resource group (`rg-<name>`), and the deploy identity. Use
   lowercase kebab-case, prefixed `zava-`.
2. **One trigger, then verify.** After dispatching, do not declare success until
   the new repo's deploy is green **and** the service URL returns HTTP 200.
3. **Never bypass.** If the golden path can't do something a service needs, that
   is a gap to fix in the template or the engine — not a reason to provision by
   hand.
4. **Governance is inherited, not optional.** The template carries the APM audit
   gate and secure-baseline pins. Do not remove them from generated repos.

## Under the hood

The workflow runs `platform/provision/zava-provision.sh` as the platform
identity (Azure OIDC SP + a GitHub platform token). See `platform/README.md`
for the identity model and the engine's eight steps.
