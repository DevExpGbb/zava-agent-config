---
name: provision-golden-path
description: "Use this skill when a developer wants to stand up a NEW service, app, repository, or environment on the Zava golden path - phrases like 'provision', 'scaffold', 'spin up', 'bootstrap', 'create a new service/repo', 'I need a new microservice', or 'get me a repo with CI and Azure already wired up'. Also trigger when someone asks how to START a new component, where new services come from, or how to get a deployable repo with security, OIDC-to-Azure, and a deploy pipeline already configured - EVEN IF they never say 'golden path' or 'provision'. The skill gathers the service details conversationally, files the governed request through the platform's IssueOps front door, watches the run live, verifies the new repo and its live URL, and explains what was created and which guardrails were applied. Do NOT use for deploying changes to an existing service, changing infra of an already-provisioned repo, or creating arbitrary Azure resources outside the golden path."
license: MIT
metadata:
  author: "Zava Engineering"
  source: "Zava platform team - supersedes platform/skills/provision-golden-path.prompt.md; drives the live IssueOps front door (Demo 2)"
---

# provision-golden-path

Stand up a NEW Zava service the supported way: gather the details, file the
governed request through the platform's IssueOps front door, watch it run live,
verify the result, and teach the developer what they got. You never hand-roll a
repo, paste cloud credentials, or wire CI by hand - those paths drift and leak
secrets. The golden path is the one supported, governed door.

You are the developer-facing front of a two-plane system. THIS skill runs in the
developer's session and only ever uses `gh` and `curl`. The actual provisioning
(repo, Azure identity, OIDC, RBAC, deploy) happens on the platform plane inside
`DevExpGbb/zava-agent-config`, triggered by the governed issue you file. You do
not touch Azure directly.

## When to use this

- A developer wants a brand-new service / app / repo / environment.
- They ask where new services come from, or for a deployable repo with CI,
  security, and Azure already wired.

## When NOT to use this

- Deploying changes to an EXISTING service (that is its own deploy pipeline /
  `release-kit`).
- Changing the infra of an already-provisioned repo.
- Creating arbitrary Azure resources off the golden path.
- A purely informational question with no intent to create a service.

## Environment preconditions

- `gh` is authenticated as a member of the `DevExpGbb` org (`gh auth status`).
- `curl` is available.
- The platform front door is live in `DevExpGbb/zava-agent-config`: the
  "Provision a new service" Issue Form, the `provision-from-issue` workflow, and
  the `ZAVA_PLATFORM_TOKEN` secret. You depend on these as an ENVIRONMENT
  precondition; you do not install or modify them.

If `gh` is not authenticated or not in the org, stop and tell the developer how
to fix it before going further.

## Inputs (gather conversationally)

- **Service name** (required). Lowercase kebab-case; the `zava-` prefix is added
  if omitted. Becomes the repo name and the resource group `rg-<name>`.
- **Azure region** (optional, default `eastus`). One of: `eastus`, `eastus2`,
  `westus3`, `westeurope`, `northeurope`.
- **Owning team / contact** (optional). Team alias or GitHub handle.
- **Description** (optional). One or two lines: what the service is for.

Ask only for what is missing. Do not interrogate - infer the name from what the
developer already said and confirm it.

## Output

- The filed issue URL (the governed request).
- Live narration of the run as it progresses.
- The new repo URL and its live URL returning HTTP 200.
- A short EDUCATE summary of the guardrails that were applied.

## Process (plan -> checkpoint -> execute -> watch -> verify -> educate)

### 1. INTAKE + pre-validate

Collect the inputs above. Then pre-validate the name and region locally BEFORE
filing anything, using the bundled script (mirrors the CI parser, so the verdict
matches what the workflow would say):

```bash
node scripts/check-service-name.mjs "<raw name>" "<region-or-empty>"
```

It prints JSON: `{ "valid": true, "name": "zava-orders", "region": "eastus" }`
or `{ "valid": false, ..., "error": "..." }` and exits non-zero when invalid. If
invalid, show the `error`, propose the normalized name, and re-confirm with the
developer. Do not proceed until valid.

### 2. CHECKPOINT (human approval before any side effect)

This is the irreversible step - filing the issue provisions real Azure resources
and costs money. Before filing, show the developer a compact summary and get an
explicit yes:

```
About to file a governed provisioning request:
  - Service : zava-orders
  - Region  : eastus
  - Owner   : @payments-team
  - About   : Order intake API for storefront checkout

This creates, on the platform plane:
  - Repo DevExpGbb/zava-orders from zava-app-template
  - Resource group rg-zava-orders (real Azure resources -> has a cost)
  - A secretless GitHub-to-Azure OIDC deploy identity, RBAC scoped to that RG
  - A first deploy to Azure Container Apps

Proceed? (yes / change something / cancel)
```

If they want changes, loop back to INTAKE. Only on an explicit yes do you go on.

### 3. TRIGGER (file the governed issue via gh)

File the issue with the `provision` label and a body whose `###` headings match
exactly what the platform parser reads (`Service name`, `Azure region`,
`Owning team / contact`, `What is this service for?`). Use this template
verbatim, substituting values:

```bash
gh issue create -R DevExpGbb/zava-agent-config \
  --label provision \
  --title "Provision service: <name>" \
  --body "$(cat <<'EOF'
### Service name

<name>

### Azure region

<region>

### Owning team / contact

<owner-or-blank>

### What is this service for?

<description-or-blank>
EOF
)"
```

`gh issue create` prints the new issue URL. Capture the issue number from it -
you need it to watch. Do not fabricate the number; read it from the command
output.

> Note on side effects: `gh issue create` is a write. In a no-TTY agent shell,
> `gh` write commands can block on auth prompts. If it hangs, confirm
> `gh auth status` and that a token is available; do not retry blindly.

### 4. WATCH (status-only, live narration, bounded)

The labeled issue fires the `provision-from-issue` workflow. Poll for progress
on a bounded backoff (about every 15-20s; give up after ~12 minutes and tell the
developer how to check back). Narrate status only - do NOT stream full run logs
(that is the cost lever and the noise lever).

Watch the issue thread (the workflow comments milestones, relabels, and closes):

```bash
gh issue view <number> -R DevExpGbb/zava-agent-config \
  --json state,labels,comments \
  --jq '{state, labels: [.labels[].name], last: (.comments[-1].body // "")}'
```

ALSO poll the workflow run conclusion - it is the AUTHORITATIVE terminal
signal. A run that dies inside the provisioning engine can leave the issue
still labeled `provision` with only the "started" comment (no failure label,
no failure comment), so never wait on the issue thread alone:

```bash
run_id=$(gh run list -R DevExpGbb/zava-agent-config \
  --workflow provision-from-issue.yml -L1 --json databaseId --jq '.[0].databaseId')
gh run view "$run_id" -R DevExpGbb/zava-agent-config \
  --json status,conclusion --jq '{status, conclusion}'
```

Terminal states (read the run conclusion first, then the issue thread):
- **Success**: run `conclusion: success`; the issue gets a `provisioned` label
  and a comment starting `Provisioned.` with the repo and (usually) the live
  URL, then closes.
- **Failure**: run `conclusion: failure`. Usually the issue also gets a
  `provision-failed` label and a failure comment - but if the engine step
  itself fails, the issue may stay labeled `provision` with no failure comment.
  Trust the run conclusion, not the absence of a failure label.

Narrate transitions in plain language ("creating the repo", "wiring OIDC",
"scoping RBAC", "first deploy running") based on elapsed time and the latest
comment - keep it honest; if you only know "in progress", say that.

### 5. VERIFY (independent live check)

On success, extract the live URL from the result comment and verify it yourself
(do not trust the comment alone):

```bash
curl -s -o /dev/null -w '%{http_code}\n' --max-time 15 "<live-url>"
```

Expect `200`. If the URL is still warming up (workflow said so, or you get a
non-200 transiently), retry a few times on backoff before reporting. Only claim
success once you have seen `200`, or clearly state the deploy is still warming
and link the new repo's Actions tab.

### 6. EDUCATE (teach what they got)

Read `references/golden-path-anatomy.md` and explain, in the developer's terms,
what was created and why each guardrail exists: the repo from `zava-app-template`,
the secretless GitHub-to-Azure OIDC (subject `repo:DevExpGbb/<name>:environment:dev`),
the RG-scoped Owner RBAC (`rg-<name>`, isolated blast radius), the first deploy
to Azure Container Apps, and the inherited APM audit gate + secure-baseline pins.
Lead with what they got, then why it is safe. Keep it to a few sentences unless
they ask for depth.

## Failure handling

- **Invalid request** (`provision-failed` early): show the parser's error, fix
  the input with the developer, and retry by commenting `/provision` on the same
  issue (the workflow re-runs on a `/provision` comment) or by editing the issue.
  Do not open a second issue for the same request.
- **Provisioning failed mid-run** (run `conclusion: failure`): there may be no
  failure comment, so diagnose from the run, not the issue. Tail ONLY the failed
  logs (not the whole run):
  `gh run view "$run_id" -R DevExpGbb/zava-agent-config --log-failed`.
  Summarize the cause, then offer one bounded retry via `/provision`. The engine
  is idempotent: a retry reuses any repo, resource group, and Entra app the
  failed run already created, so it resumes rather than duplicating them.
- **Live URL not 200 yet**: report the repo as provisioned, say the deploy is
  warming, and link `https://github.com/DevExpGbb/<name>/actions`.

## Hard rules

1. **Name first, confirm always.** The name becomes the repo, the RG, and the
   deploy identity. Pre-validate with the script; never file an unconfirmed name.
2. **Checkpoint before the write.** Never call `gh issue create` without an
   explicit developer yes - it spends real money.
3. **One request, one issue.** Retry via `/provision` on the existing issue;
   never fan out duplicate issues.
4. **Status-only watch.** Narrate status; tail full logs only on failure.
5. **Verify before you claim success.** "Provisioned" requires a green run AND a
   `200` you curled yourself - not the comment's word for it.
6. **Never bypass the golden path.** If it cannot do something a service needs,
   that is a gap to fix in the template or the engine - not a reason to
   hand-provision. Governance (APM audit gate, secure-baseline) is inherited and
   must not be stripped from generated repos.

## Example invocation

```
> I need a new orders service for the storefront.
```

The skill confirms `zava-orders` / `eastus`, checkpoints what it will create,
files the governed issue on your yes, watches it provision, curls the live URL
to 200, and explains the secretless OIDC + scoped RBAC you now have.

## See also

- `references/golden-path-anatomy.md` - the guardrail explainer (load at EDUCATE).
- `scripts/check-service-name.mjs` - local name/region pre-validation.
- `secure-baseline` - the cross-cutting security floor inherited by every repo.
- `release-kit` - the deploy gates for an EXISTING repo (the next phase, not this).
