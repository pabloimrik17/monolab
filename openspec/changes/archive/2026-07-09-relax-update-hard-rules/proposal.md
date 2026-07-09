## Why

The `experiments` update commands and the shared `commander-update-orchestrator` skill carry a blanket hard rule — _"SHALL NOT run tests, lint, or build at any point."_ Issue [#249](https://github.com/pabloimrik17/monolab/issues/249) shows this is counterproductive on major bumps: it forbids the cheapest breakage signal, ships the deep migration round's own edits (eslint-v10 `eslint-env` removal, Tailwind-v4 `import-notation`) unverified, and forces `git commit --no-verify` to land the branch. The rule conflates read-only checks with the real safety concern. The genuine invariant — no autonomous commit/push/PR before human review — is already stated by a separate bullet; the tests/lint/build ban is redundant over-reach.

## What Changes

- **Remove** the blanket prohibition on running tests / lint / build from the update commands, the orchestrator skill, the apply skills, and the plugin spec.
- **Establish one default hard rule**: a command/skill SHALL NOT create commits, push, or open PRs autonomously — it stops for human-in-the-loop review before any outward/VCS action. Formalizes the pre-existing commit/push/PR bullet as _the_ invariant.
- **Reframe "read-only / side-effect-free"**: the safety boundary is outward/VCS actions (commit/push/PR), not the running of checks. Local file edits (manifest bumps, reviewed migration edits) are reversible and permitted; running lint/typecheck/build to verify is permitted.
- **Preserve the fast default** (permitted ≠ mandatory): commands do not auto-run heavy checks; they are simply no longer _forbidden_ from running lint/typecheck. A plain run stays behaviorally unchanged.
- The deep plan-mode migration round **MAY** run lint/typecheck on its own edits and surface results — no forced prompt, no auto-`--fix`.
- Update the orchestrator skill's frontmatter `description:` ("Never runs tests, lint, build, or commits" → "Never commits/pushes/opens PRs autonomously").
- **Strengthen** the summary's _Suggested next steps_ note: the produced branch may not pass repo commit hooks; recommend running lint/build before the human commits.

Non-goals: no new gated verify skill; no mandatory verify prompt; no auto-`--fix`; no change to branch/worktree isolation; reconnaissance/scan phase stays pure (nothing applied yet to check).

## Capabilities

### New Capabilities

None — this is a reword-only change (relaxes an over-broad constraint; adds no behavior).

### Modified Capabilities

Canonical hard-rule holders (reword the forbidding bullet + frontmatter/next-steps):

- `commander-update-orchestrator-skill`: replace the blanket tests/lint/build ban with the commit/push/PR review-gate invariant; update the frontmatter `description:` and the _Suggested next steps_ / `--no-verify` note.
- `npm-update-apply`: same reword in the per-project apply skill's hard rules.
- `engine-update-apply`: reword "never … runs tests/lint/build" in the `apply-engine-bumps` contract.
- `experiments-plugin`: reword the plugin-level "SHALL NOT invoke tests, lint, build" requirement(s).

Command specs restating the prohibition normatively (relax the forbidding bullet; default no-op scenarios preserved):

- `commander-update-patch-command`
- `npm-update-minor-command`, `npm-update-major-command`, `npm-update-engines-command`
- `npm-update-deep-patch-command`, `npm-update-deep-minor-command`, `npm-update-deep-major-command`, `npm-update-deep-engines-command`

## Impact

- **Spec layer**: 19 modified capabilities. The 12 above, plus the 7 sibling command specs `commander-update-{minor,major,engines}-command` and `commander-update-deep-{patch,minor,major,engines}-command`, which turned out to restate the prohibition **normatively** in their "Hard rules inherited from the orchestrator" requirement (not merely in default no-op scenario assertions) — so they get MODIFIED deltas dropping the clause too (else they would contradict the reworded canonical orchestrator rule + live files). `commander-update-deep-patch-command` states it in bullet-list form (`SHALL NOT: - Run tests, lint, or build`). Additionally, the `commander-update-orchestrator-skill` spec's overview line (capability-summary prose, not a requirement) is reworded directly during sync.
- **Implementation**: edit the matching hard-rule sections + frontmatter in `claude-plugins/experiments/commands/*.md` and `claude-plugins/experiments/skills/*/SKILL.md`.
- **Behavior**: default runs unchanged (fast, no autonomous commit). New: read-only checks are no longer forbidden; the deep migration round may self-verify its edits.
- **Resolves #249's three complaints**: unverifiable majors, unverified migration edits, and forced `--no-verify` (the plugin no longer commits → the human commits through hooks after review).
- **Wide surface is duplication-driven**: the rule is restated across many specs; de-duplicating (command specs referencing the orchestrator's canonical rule) is a possible follow-up, out of scope here.
