---
applyTo: "**/*.md,**/*.mdx,docs/**,**/docstrings/**,**/*.py,**/*.ts,**/*.tsx,**/*.java,**/*.go"
description: "Zava documentation style — source-code docstrings + markdown docs sites. Pulled by Test/Docs gen skills and by Copilot in IDE."
---

# Zava Documentation Style Guide

Two surfaces, same voice: **source-code docstrings** (read by IDEs and AI assistants) and **markdown docs sites** (read by humans onboarding to a service).

## Voice and tone

- **Plain English.** Short sentences. Active voice. No jargon unless defined first.
- **Second person ("you")** for guides ("you'll set up the database…"). **Third person** for reference ("this function returns…").
- **Show, don't tell.** Every concept has at least one runnable example.
- **No marketing copy.** No "blazing fast," "industry-leading," "robust." Specifics or nothing.

## Source-code docstrings

### When required

- All **public** functions, classes, modules, and exported types.
- Internal helpers that are non-obvious.
- Skip trivial getters/setters and one-line forwards.

### Format by language

- **Python**: Google style (sections: `Args:`, `Returns:`, `Raises:`, `Example:`).
- **TypeScript / JavaScript**: TSDoc / JSDoc with `@param`, `@returns`, `@throws`, `@example`.
- **Java**: Javadoc with `@param`, `@return`, `@throws`, `<pre>{@code ...}</pre>` for examples.
- **Go**: comment starts with the function name (`// FetchUser returns…`).

### Required content

Every docstring answers three questions in order:
1. **What does it do?** (one line)
2. **What inputs / outputs / errors?** (parameter and return docs)
3. **How do I call it?** (at least one example for non-trivial APIs)

### Anti-patterns

- ❌ Restating the signature in prose: "This function takes a user ID and returns a user."
- ❌ Stale examples that no longer compile.
- ❌ "TODO: docs" left in `main`.

## Markdown docs sites

Site lives at `docs/` in each service repo, built by Docusaurus or Astro Starlight via the `docs-build.yml` reusable workflow.

### Page structure (every page)

1. **H1 = title** (one only, matches filename slug).
2. **One-paragraph intro** answering "what is this and why does it exist?"
3. **Body** — sections of `##` H2s, no deeper than `###` H3 unless absolutely necessary.
4. **"See also"** at the bottom for cross-links.

### Required pages per service

- `docs/index.md` — what the service does, who runs it, where to get help.
- `docs/quickstart.md` — clone, install, run locally, in under 10 minutes.
- `docs/architecture.md` — one C4-Context diagram + one C4-Container diagram + the failure modes you've encountered in production.
- `docs/runbook.md` — paging, common alerts, rollback procedure.
- `docs/api.md` — generated from OpenAPI / proto; not hand-maintained.

### Diagrams

- Mermaid for inline diagrams (works on GitHub + docs site).
- Excalidraw exports (PNG + `.excalidraw` source committed) for richer visuals.
- **No screenshots of code.** Code goes in fenced blocks.

### Code examples

- Always specify the language: ` ```python `, not just ` ``` `.
- Examples must be **copy-pasteable and runnable** as-is. If they need setup, link to the quickstart.
- Keep under 30 lines per block. Split larger examples into a separate file under `docs/examples/`.

## What good looks like

A new engineer joining a service should be able to:
1. Read `docs/index.md` (5 min)
2. Run `docs/quickstart.md` end-to-end (10 min)
3. Open the IDE, hover any public function, and understand what it does without reading the body.

If any of those three break, the docs are failing.
