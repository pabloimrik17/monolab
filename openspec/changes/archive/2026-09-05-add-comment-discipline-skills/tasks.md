## 1. Authoring setup

- [x] 1.1 Load the authoring toolchain named in `design.md` — Authoring (`skill-creator`, `plugin-dev:skill-development`, `plugin-dev:command-development`, `plugin-dev:plugin-structure`, `superpowers:writing-skills`, `mattpocock-skills:writing-for-agents`, `elements-of-style:writing-clearly-and-concisely`) and verify each is available before writing any artifact; report any that is not
- [x] 1.2 Create `claude-plugins/experiments/skills/writing-comments/` and `claude-plugins/experiments/skills/purge-comment-noise/` and verify both directories exist

## 2. Policy (single source of truth)

- [x] 2.1 Write `skills/writing-comments/reference/policy.md` covering scope by comment kind, the out-of-scope set, deny-by-default, the justified categories, TODO/FIXME handling and language preservation; verify every requirement in `specs/writing-comments-skill/spec.md` under "Policy scope", "Deny-by-default", "TODO and FIXME" and "language" maps to a section of the file
- [x] 2.2 Apply `elements-of-style:writing-clearly-and-concisely` to `policy.md` and verify no section restates another — a policy about concision that is verbose fails its own rule

## 3. Prevention skill

- [x] 3.1 Write `skills/writing-comments/SKILL.md` with frontmatter `name: writing-comments` and a description targeting the moment an agent is about to write or edit comments; verify frontmatter parses and the description contains no policy content
- [x] 3.2 Implement forward-only application (from invocation onward, including files touched earlier in the session; no retroactive sweep) and verify against the two "Forward-only application" scenarios
- [x] 3.3 Implement the discovery-pointer check against `~/.claude/CLAUDE.md` as propose-and-wait; verify against all four "Discovery pointer" scenarios, especially that declining writes nothing
- [x] 3.4 Verify `SKILL.md` defers to `reference/policy.md` rather than restating it

## 4. Purge skill

- [x] 4.1 Write `skills/purge-comment-noise/SKILL.md` with frontmatter `name: purge-comment-noise` and a description stating the measurable trigger (≥5 changed files or ≥150 added lines), plus the one-line scope pre-announcement an autonomous run emits before its first edit; verify the description instructs measuring with `git diff --stat` rather than judging qualitatively, and that the pre-announcement names the filtered counts and sits after the exclusion filter, so an autonomous run left with an empty filtered list announces nothing
- [x] 4.2 Implement policy resolution via `${CLAUDE_PLUGIN_ROOT}/skills/writing-comments/reference/policy.md`; verify the file contains no restated policy rules
- [x] 4.3 Implement diff scoping — branch vs base plus uncommitted working tree, untracked files listed from the repository root, candidates limited to added/modified lines, ref and path overrides with override paths normalised to root-relative before they reach a root-run command, the stop-and-ask leg when no candidate base ref resolves and the working-tree-only leg when the base resolves to `HEAD`; verify against the nine "Diff scope" scenarios
- [x] 4.4 Implement file coverage and exclusions including tests-with-rationale-retained; verify against the four "File coverage and exclusions" scenarios
- [x] 4.5 Implement the fan-out contract — threshold >8 files or >400 lines, teammates then subagents, whole-file assignment, agents edit in place and return per-file deletion and edit counts, metadata for every unreferenced `TODO`/`FIXME` deleted (file, line, short paraphrase, never the comment body) and at most 5 doubtful cases; verify against the six "Fan-out" scenarios
- [x] 4.6 Implement direct application and the compact report — file → deleted/edited counts, no comment bodies, deleted unreferenced TODOs listed without creating tracker issues, the working-tree-only statement whenever the base resolved to `HEAD`, the single-line nothing-deleted-or-edited report with no table, no TODO list and no gate recommendation, the `Doubtful — left as-is` section on both the table and the nothing-deleted branch, and an autonomous run whose filtered list came out empty reporting nothing at all; verify against the "Edits are applied directly" and "Report format" scenarios
- [x] 4.7 Implement the no-forced-gate rule with the pre-commit recommendation covering pre-existing uncommitted changes; verify no verification target is executed by the skill

## 5. Command

- [x] 5.1 Write `commands/purge-comments.md` using `plugin-dev:command-development`; verify it delegates to `purge-comment-noise` and contains neither policy rules nor purge procedure steps
- [x] 5.2 Implement optional ref/path argument passthrough and threshold bypass; verify against the three "Argument handling" scenarios

## 6. Plugin registration

- [x] 6.1 Add rows for `writing-comments`, `purge-comment-noise` and `/experiments:purge-comments` to `claude-plugins/experiments/README.md`; verify all three appear
- [x] 6.2 Verify `git diff` shows no manual version edits to `.claude-plugin/plugin.json`, `package.json` or the root `.claude-plugin/marketplace.json`
- [x] 6.3 Delete the orphan plugin-local `claude-plugins/experiments/.claude-plugin/marketplace.json`; verify `release-please-config.json` points the experiments marketplace extra-file at the repo-root `/.claude-plugin/marketplace.json`, that no sibling plugin carries a plugin-local manifest, and that no workflow or script reads the deleted path
- [x] 6.4 Quote the YAML `description` in `skills/group-packages-for-research/SKILL.md`; verify the frontmatter parses and the description survives its `": "` sequence as a single scalar
- [x] 6.5 Add the missing `## Skills` rows for the pre-existing `skill-terraformer`, `hookify` and `npm-update-deep-orchestrator`; verify every directory under `claude-plugins/experiments/skills/` has a matching `###` entry in the README

## 7. Audit

- [x] 7.1 Run the `plugin-dev:skill-reviewer` agent over both `SKILL.md` files and resolve or explicitly reject every finding in-session; verify the shipped text carries the accepted findings — dispositions are session-local and none is persisted in this change directory
- [x] 7.2 Run the `plugin-dev:plugin-validator` agent over the plugin and verify it reports no structural or manifest errors
- [x] 7.3 Run `skill-creator` evals on both descriptions in-session against an intended and a control scenario; verify each description triggers on the intended one and stays silent on the control — results are session-local and no eval artifact is persisted
- [x] 7.4 Dogfood: run `/experiments:purge-comments` against this change's own branch; verify the empty-scope path — every file the branch touches is `.md`, `.json` or `.yaml`, all excluded by the skill's own §2 filter, so the filtered list comes out empty, the run reports the single "nothing deleted or edited" line and no out-of-scope file is touched
- [x] 7.5 Run `openspec validate add-comment-discipline-skills --strict` and verify it passes

Notes: this change adds no source packages, build targets or exports — no `nx run` target and no `attw --pack` validation applies.
