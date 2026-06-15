# Golden-path anatomy: what gets created, and the guardrails

Load this at the EDUCATE stage (after a provision succeeds) to explain, in the
developer's own words, exactly what the platform built and why each guardrail
is there. Source of truth: `platform/provision/zava-provision.sh` (the engine)
and `CATALOG.md` in this repo. Keep explanations grounded in these eight steps;
do not invent behavior the engine does not perform.

## The eight steps the engine runs (as the platform identity)

1. **Repo from template.** `gh repo create DevExpGbb/<name> --template
   DevExpGbb/zava-app-template`. The new repo inherits the azd app, the Azure
   Container Apps infra (Bicep), and the APM supply-chain audit gate already
   wired into CI. The developer starts from a deployable repo, not a blank one.
2. **Dedicated resource group.** `rg-<name>` in the chosen region. One RG per
   service is the blast-radius boundary: a mistake in one service cannot reach
   another's resources.
3. **Entra app registration + service principal** named `gh-oidc-<name>`. This
   is the deploy identity for THIS service only.
4. **Federated credential (secretless OIDC).** A GitHub-federated credential is
   added to that app with subject
   `repo:DevExpGbb/<name>:environment:dev`. This is the load-bearing guardrail:
   GitHub Actions in the new repo's `dev` environment can mint a short-lived
   Azure token at deploy time. **No client secret, no PAT, nothing long-lived
   is stored in the app repo.** Only that exact repo + environment can assume
   the identity.
5. **Scoped RBAC.** The deploy identity gets **Owner on `rg-<name>` only** (not
   the subscription). Owner — rather than Contributor — because the golden-path
   Bicep creates a role assignment (AcrPull for the app's managed identity),
   which needs role-write. Scope stays one RG: isolated blast radius per
   service.
6. **`dev` environment** created on the new repo — the deploy gate the
   federated-credential subject binds to.
7. **Repo variables** (`AZURE_CLIENT_ID`, `AZURE_TENANT_ID`,
   `AZURE_SUBSCRIPTION_ID`) set so the repo's deploy workflow knows which
   identity and subscription to use. These are variables, not secrets — the
   client id is not sensitive; the trust is enforced by the federated subject.
8. **First deploy dispatched.** `gh workflow run deploy.yml` on the new repo.
   That run logs in via OIDC, provisions with azd, and ships the app to Azure
   Container Apps, which serves HTTP 200.

## Inherited governance (not optional, not configured by the developer)

- **APM supply-chain audit gate.** The template ships the APM audit check in
  CI; every dependency change is scanned. The developer did not wire it and
  cannot silently drop it.
- **secure-baseline pins.** Secure-coding instructions, docs style guide, and
  the security reviewer persona ride along via the marketplace baseline every
  Zava repo composes.

## How to talk about it (EDUCATE framing)

Lead with what the developer got, then why it is safe:

- "You have a real repo, `DevExpGbb/<name>`, already deploying to Azure."
- "Nothing secret is stored in it - the deploy uses GitHub-to-Azure OIDC, so
  there is no key to leak or rotate."
- "It can only touch its own resource group, `rg-<name>` - blast radius is one
  service."
- "Governance came with it: the APM audit gate and the secure-baseline pins are
  already on; you don't configure them."

## What it does NOT do (boundary, say so if asked)

- It does not grant subscription-wide access.
- It does not deploy changes to an EXISTING service (that is the repo's own
  deploy pipeline / release-kit).
- It does not create arbitrary Azure resources off the golden path. A genuine
  gap is fixed in the template or the engine, never by hand-rolling around it.
