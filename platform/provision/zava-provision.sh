#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────────────────
# Zava golden-path provisioning engine (Phase 0)
#
# One command turns a request into a working, governed service:
#   repo from template  ->  Azure identity + GitHub-federated OIDC (no secrets)
#   ->  RG-scoped RBAC   ->  repo variables + `dev` environment  ->  first deploy
#
# Runs identically whether invoked by:
#   • a platform operator at a workstation (az + gh already logged in), or
#   • the `provision-golden-path` GitHub Actions workflow, where `az` is the
#     OIDC-federated platform service principal and `gh` uses ZAVA_PLATFORM_TOKEN.
#
# Idempotent: safe to re-run for the same app.
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail

APP="${1:?usage: zava-provision.sh <app-name> [location]}"
LOCATION="${2:-${AZURE_LOCATION:-eastus}}"

ORG="${ORG:-DevExpGbb}"
TEMPLATE="${TEMPLATE:-DevExpGbb/zava-app-template}"
ENVIRONMENT="${ENVIRONMENT:-dev}"
VISIBILITY="${VISIBILITY:-public}"

# Required platform context (provided as repo variables in CI).
SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:?set AZURE_SUBSCRIPTION_ID}"
TENANT_ID="${AZURE_TENANT_ID:?set AZURE_TENANT_ID}"

RG="rg-${APP}"
RG_SCOPE="/subscriptions/${SUBSCRIPTION_ID}/resourceGroups/${RG}"
APP_DISPLAY="gh-oidc-${APP}"
SUBJECT="repo:${ORG}/${APP}:environment:${ENVIRONMENT}"

say(){ printf '\n\033[1;36m== %s\033[0m\n' "$*"; }

say "1/8 Repo ${ORG}/${APP} from template ${TEMPLATE}"
if gh repo view "${ORG}/${APP}" >/dev/null 2>&1; then
  echo "repo exists — reusing"
else
  gh repo create "${ORG}/${APP}" --template "${TEMPLATE}" --"${VISIBILITY}"
  sleep 4
fi

say "2/8 Resource group ${RG} (${LOCATION})"
az group create -n "${RG}" -l "${LOCATION}" --subscription "${SUBSCRIPTION_ID}" -o none
echo "ok"

say "3/8 Entra app registration ${APP_DISPLAY}"
APP_ID="$(az ad app list --display-name "${APP_DISPLAY}" --query '[0].appId' -o tsv)"
if [[ -z "${APP_ID}" ]]; then
  APP_ID="$(az ad app create --display-name "${APP_DISPLAY}" --sign-in-audience AzureADMyOrg --query appId -o tsv)"
  echo "created appId=${APP_ID}"
else
  echo "reusing appId=${APP_ID}"
fi

SP_OID="$(az ad sp list --filter "appId eq '${APP_ID}'" --query '[0].id' -o tsv)"
if [[ -z "${SP_OID}" ]]; then
  SP_OID="$(az ad sp create --id "${APP_ID}" --query id -o tsv)"
  echo "created sp objectId=${SP_OID}"
else
  echo "reusing sp objectId=${SP_OID}"
fi

say "4/8 Federated credential  subject=${SUBJECT}"
FC_NAME="gh-${APP}-${ENVIRONMENT}"
if az ad app federated-credential list --id "${APP_ID}" --query "[?name=='${FC_NAME}']|[0].name" -o tsv | grep -q .; then
  echo "federated credential exists"
else
  az ad app federated-credential create --id "${APP_ID}" --parameters "{
    \"name\": \"${FC_NAME}\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"${SUBJECT}\",
    \"audiences\": [\"api://AzureADTokenExchange\"]
  }" -o none
  echo "created ${FC_NAME}"
fi

say "5/8 RBAC: Owner on ${RG} for the deploy identity"
# Owner (not just Contributor) because the golden-path Bicep creates a role
# assignment (AcrPull for the app's managed identity), which needs role-write.
# Scope is a single dedicated RG -> isolated blast radius per service.
az role assignment create \
  --assignee-object-id "${SP_OID}" \
  --assignee-principal-type ServicePrincipal \
  --role "Owner" \
  --scope "${RG_SCOPE}" -o none 2>/dev/null || echo "(role assignment already present)"
echo "ok"

say "6/8 GitHub environment '${ENVIRONMENT}'"
gh api -X PUT "repos/${ORG}/${APP}/environments/${ENVIRONMENT}" -o none 2>/dev/null && echo "ok"

say "7/8 Repo variables (OIDC config — no secrets)"
gh variable set AZURE_CLIENT_ID        -R "${ORG}/${APP}" -b "${APP_ID}"
gh variable set AZURE_TENANT_ID        -R "${ORG}/${APP}" -b "${TENANT_ID}"
gh variable set AZURE_SUBSCRIPTION_ID  -R "${ORG}/${APP}" -b "${SUBSCRIPTION_ID}"
gh variable set AZURE_RESOURCE_GROUP   -R "${ORG}/${APP}" -b "${RG}"
gh variable set AZURE_ENV_NAME         -R "${ORG}/${APP}" -b "${APP}"
gh variable set AZURE_LOCATION         -R "${ORG}/${APP}" -b "${LOCATION}"
echo "ok"

say "8/8 Trigger first deploy (allow identity propagation)"
sleep 25
gh workflow run deploy.yml -R "${ORG}/${APP}" --ref main
echo "dispatched"

cat <<EOF

────────────────────────────────────────────────────────────
 Provisioned: ${ORG}/${APP}
   client id : ${APP_ID}
   rg        : ${RG}
   subject   : ${SUBJECT}
 Watch:
   gh run watch -R ${ORG}/${APP} \$(gh run list -R ${ORG}/${APP} -L1 --json databaseId -q '.[0].databaseId')
────────────────────────────────────────────────────────────
EOF
