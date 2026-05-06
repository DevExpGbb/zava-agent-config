---
applyTo: "**"
description: "Zava baseline secure coding standards every agent and human must apply across every repo."
enforced: true
---

# Zava Secure Coding — Baseline

These rules apply **everywhere** — every repo, every language, every PR. They are non-negotiable: an `enforced: true` instruction means service repos cannot override or remove this file via their own `.apm/instructions/`.

## 1. Secrets and credentials

- **Never** commit secrets. Use Azure Key Vault references for runtime config; GitHub OIDC for CI/CD; `gh auth` or `az login` for local dev. No long-lived tokens checked in, ever.
- Reference secrets by name (`${{ secrets.AZURE_CLIENT_ID }}`), never inline.
- If you find a secret in code, rotate it first, then remove it from history (BFG / `git filter-repo`).

## 2. Input handling

- Validate **all** untrusted input at the boundary (HTTP handler, message consumer, CLI arg). Reject early, log at WARN.
- Parameterize every database query. **No string concatenation into SQL, ever.** Use the language idiom: `psycopg` `%s`, JDBC `PreparedStatement`, Entity Framework parameters.
- Encode output for the destination context (HTML escape for HTML, JSON encode for JSON, shell escape for shell). Use libraries, not hand-rolled.

## 3. AuthN / AuthZ

- Authenticate at the edge, propagate identity via signed claims (JWT/OIDC). Never trust client-provided identity downstream.
- Authorize at the operation, not just the route. Every protected operation calls the policy check explicitly.
- Default-deny in policy code. New routes or operations are inaccessible until explicitly permitted.

## 4. Cryptography

- Use the language's vetted crypto library. **Never invent a scheme.** No custom XOR, no rolled-your-own KDF.
- For hashing passwords: Argon2id (preferred) or bcrypt with cost ≥ 12. Never MD5, SHA-1, or unsalted SHA-256.
- For TLS: 1.2 minimum, 1.3 preferred. Disable weak ciphers (RC4, 3DES, NULL).

## 5. Dependencies and supply chain

- All dependencies pinned to exact versions or reviewed-version ranges. No `latest`, no unbounded `^` for production.
- Renovate or Dependabot enabled, with security alerts auto-PR'd.
- New dependencies require a one-line justification in the PR description ("why this lib, why now, what alternatives ruled out").

## 6. Logging and PII

- Never log secrets, tokens, full request bodies, or full PII (full PAN, full DOB, full email). Mask: `email=a***@d***.com`, `pan=****1234`.
- Structured logs only (JSON). Include `correlation_id`, `user_id` (hashed if PII), `operation`, `latency_ms`, `outcome`.
- Errors include cause chain but never stack traces in API responses to clients.

## 7. Error handling

- Fail closed. On any error path through a security control (auth, policy, signature check), the answer is **deny**.
- Surface user-facing errors as generic messages with a correlation ID. Detailed cause goes to logs only.

## 8. Review checklist (pulled by `panel-review` skill)

Before merging any PR, the security persona checks:
- [ ] No new secrets in diff (gitleaks clean)
- [ ] All new HTTP handlers have authN + authZ
- [ ] All new DB queries are parameterized
- [ ] Dependencies justified in PR description
- [ ] Logs masked for PII

If any box is unchecked, the PR is **not ready for merge** — block on `pr-review-gate` hook.
