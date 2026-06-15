# Evals for `provision-golden-path`

Two eval families live in `evals.json`:

- **Content evals** (`content_evals`): run each `prompt` TWICE — once with this
  skill loaded, once without — and compare the answer to `with_skill_expected`
  vs `without_skill_expected`. If the two outputs are indistinguishable, the
  skill is not adding value; redesign or delete. The `value_delta` field states
  what the skill is supposed to change.

- **Trigger evals** (`trigger_evals`): check that the frontmatter `description`
  routes the dispatcher correctly. Each entry is a `query` with an expected
  `should_trigger` boolean and a `split` (`train` / `val`). The **val split is
  the ship gate**: the description must trigger on >= 50% of should-trigger val
  queries AND on < 50% of should-not-trigger val queries.

These are LLM-judged fixtures (dispatch + content quality), not deterministic
unit tests — there is no `run.js` here. Exercise them by hand or with your
eval harness of choice when changing the description or the skill body.

The deterministic piece (the naming/region validator) is unit-tested via the
script itself: `node ../scripts/check-service-name.mjs --help` and a few
`node ../scripts/check-service-name.mjs <name> [region]` calls.
