# Zava IDP — docs site

Astro 6 + Starlight site deployed to GitHub Pages at
<https://devexpgbb.github.io/zava-agent-config/>.

The catalog is **derived at build time** from the repo itself:

| Source of truth                                       | Drives                          |
| ----------------------------------------------------- | ------------------------------- |
| `../.claude-plugin/marketplace.json`                  | Plugin list, order, source path |
| `../apm.yml` `version`                                | Site-wide pinned version + tag  |
| `../plugins/<id>/apm.yml`                             | Per-plugin description, version |
| `../plugins/<id>/.claude-plugin/plugin.json` keywords | Tier (foundation / phase / accelerator) and SDLC phase |
| `../plugins/<id>/.apm/{agents,skills,instructions,commands,hooks}` | "What's inside" primitive list |

Editorial overrides ("Pin if you…", "Pairs with") live in
`src/data/plugins.ts → PLUGIN_NOTES`. Everything else updates automatically
when the marketplace or vendored plugins change — the deploy workflow
re-runs on any change under `plugins/`, `.claude-plugin/`, `apm.yml`, or
`docs/`.

## Local dev

```bash
cd docs
npm install
npm run dev      # http://localhost:4321/zava-agent-config/
npm run build    # ./dist
```

## Adding a new plugin

1. Add the plugin under `../plugins/<name>/` with the standard layout.
2. Append it to `../.claude-plugin/marketplace.json`.
3. Tag its `plugin.json` `keywords` with one of:
   - `cross-cutting` → Foundation tier
   - `accelerator`   → Accelerator tier
   - `ideate` / `plan` / `code` / `build` / `test` / `review` / `release` / `operate` → Phase kit (phase derived from the keyword)
4. Add a sidebar entry in `astro.config.mjs` (`Plugins` group).
5. Optional: add a `PLUGIN_NOTES` entry in `src/data/plugins.ts` to override
   "Pin if you…" / "Pairs with".

The CI workflow rebuilds and redeploys automatically on push to `main`.

## Global policy

The site links every page back to `DevExpGbb/.github/apm-policy.yml` and the
[APM CI policy setup guide](https://microsoft.github.io/apm/guides/ci-policy-setup/)
via the `PolicyBanner` component. Update those URLs in
`src/data/plugins.ts` if the policy file moves.
