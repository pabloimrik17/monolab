## 1. Authoring setup

- [ ] 1.1 Load the authoring toolchain named in `design.md` — Authoring (`skill-creator`, `plugin-dev:skill-development`, `plugin-dev:plugin-structure`, `superpowers:writing-skills`, `mattpocock-skills:writing-for-agents`, `elements-of-style:writing-clearly-and-concisely`) and verify each is available before writing any artifact; report any that is not
- [ ] 1.2 Create `claude-plugins/experiments/skills/writing-comments/` and `claude-plugins/experiments/skills/purge-comment-noise/` and verify both directories exist

## 2. Policy (single source of truth)

- [ ] 2.1 Write `skills/writing-comments/reference/policy.md` covering scope by comment kind, the out-of-scope set, deny-by-default, the justified categories, TODO/FIXME handling and language preservation; verify every requirement in `specs/writing-comments-skill/spec.md` under "Policy scope", "Deny-by-default", "TODO and FIXME" and "language" maps to a section of the file
- [ ] 2.2 Apply `elements-of-style:writing-clearly-and-concisely` to `policy.md` and verify no section restates another — a policy about concision that is verbose fails its own rule

## 3. Prevention skill

- [ ] 3.1 Write `skills/writing-comments/SKILL.md` with frontmatter `name: writing-comments` and a description targeting the moment an agent is about to write or edit comments; verify frontmatter parses and the description contains no policy content
- [ ] 3.2 Implement forward-only application (from invocation onward, including files touched earlier in the session; no retroactive sweep) and verify against the two "Forward-only application" scenarios
- [ ] 3.3 Implement the discovery-pointer check against `~/.claude/CLAUDE.md` as propose-and-wait; verify against all three "Discovery pointer" scenarios, especially that declining writes nothing
- [ ] 3.4 Verify `SKILL.md` defers to `reference/policy.md` rather than restating it

## 4. Purge skill

- [ ] 4.1 Write `skills/purge-comment-noise/SKILL.md` with frontmatter `name: purge-comment-noise` and a description stating the measurable trigger (≥5 changed files or ≥150 added lines); verify the description instructs measuring with `git diff --stat` rather than judging qualitatively
- [ ] 4.2 Implement policy resolution via `${CLAUDE_PLUGIN_ROOT}/skills/writing-comments/reference/policy.md`; verify the file contains no restated policy rules
- [ ] 4.3 Implement diff scoping — branch vs base plus uncommitted working tree, candidates limited to added/modified lines, ref and path overrides; verify against the four "Diff scope" scenarios
- [ ] 4.4 Implement file coverage and exclusions including tests-with-rationale-retained; verify against the four "File coverage and exclusions" scenarios
- [ ] 4.5 Implement the fan-out contract — threshold >8 files or >400 lines, teammates then subagents, whole-file assignment, agents edit in place and return counts plus at most 5 doubtful cases; verify against the five "Fan-out" scenarios
- [ ] 4.6 Implement direct application and the compact report (file → deleted/edited counts, no comment bodies, deleted unreferenced TODOs listed without creating tracker issues); verify against the "Edits are applied directly" and "Report format" scenarios
- [ ] 4.7 Implement the no-forced-gate rule with the pre-commit recommendation covering pre-existing uncommitted changes; verify no verification target is executed by the skill

## 5. Command

- [ ] 5.1 Write `commands/purge-comments.md` using `plugin-dev:command-development`; verify it delegates to `purge-comment-noise` and contains neither policy rules nor purge procedure steps
- [ ] 5.2 Implement optional ref/path argument passthrough and threshold bypass; verify against the three "Argument handling" scenarios

## 6. Plugin registration

- [ ] 6.1 Add rows for `writing-comments`, `purge-comment-noise` and `/experiments:purge-comments` to `claude-plugins/experiments/README.md`; verify all three appear
- [ ] 6.2 Verify `git diff` shows no manual version edits to `.claude-plugin/plugin.json`, `package.json` or the root `.claude-plugin/marketplace.json`

## 7. Audit

- [ ] 7.1 Run the `plugin-dev:skill-reviewer` agent over both `SKILL.md` files and resolve or explicitly reject every finding; verify each finding has a recorded disposition
- [ ] 7.2 Run the `plugin-dev:plugin-validator` agent over the plugin and verify it reports no structural or manifest errors
- [ ] 7.3 Run `skill-creator` evals on both descriptions and verify each triggers on its intended scenario and stays silent on a control scenario that should not match
- [ ] 7.4 Dogfood: run `/experiments:purge-comments` against this change's own branch and verify the report format matches the spec and that no out-of-scope file was touched
- [ ] 7.5 Run `openspec validate add-comment-discipline-skills --strict` and verify it passes

Notes: this change adds no source packages, build targets or exports — no `nx run` target and no `attw --pack` validation applies.
