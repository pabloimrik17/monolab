## 1. Scaffold commander plugin directory

- [ ] 1.1 Create `claude-plugins/commander/.claude-plugin/plugin.json` with `name: "commander"`, `version: "0.1.0"`, description, keywords (`["commander", "registry", "crud"]`), author (Pablo F.G. / pabloimrik17@users.noreply.github.com), license MIT, repository + homepage URLs (mirror experiments/expo-developer manifests)
- [ ] 1.2 Create `claude-plugins/commander/package.json` with `name: "@m0n0lab/plugin-commander"`, `private: true`, `version: "0.1.0"`, description (mirror plugin.json)
- [ ] 1.3 Create empty `claude-plugins/commander/commands/` and `claude-plugins/commander/skills/` directories
- [ ] 1.4 Create empty `claude-plugins/commander/CHANGELOG.md` (release-please seeds it on first release)
- [ ] 1.5 Verify `pnpm install` from repo root recognizes `claude-plugins/commander` as a workspace member (already globbed via `claude-plugins/*`)

## 2. Move CRUD command files (preserve git history)

- [ ] 2.1 `git mv claude-plugins/experiments/commands/commander-add.md claude-plugins/commander/commands/add.md`
- [ ] 2.2 `git mv claude-plugins/experiments/commands/commander-list.md claude-plugins/commander/commands/list.md`
- [ ] 2.3 `git mv claude-plugins/experiments/commands/commander-update.md claude-plugins/commander/commands/update.md`
- [ ] 2.4 `git mv claude-plugins/experiments/commands/commander-delete.md claude-plugins/commander/commands/delete.md`

## 3. Move commander-normalize skill (preserve git history)

- [ ] 3.1 `git mv claude-plugins/experiments/skills/commander-normalize claude-plugins/commander/skills/commander-normalize`

## 4. Rewrite slash-command references inside moved files

- [ ] 4.1 In `claude-plugins/commander/commands/add.md`: replace every `/experiments:commander-add` → `/commander:add`, `/experiments:commander-list` → `/commander:list`, `/experiments:commander-update` → `/commander:update`, `/experiments:commander-delete` → `/commander:delete`. Also replace any reference to the file path `claude-plugins/experiments/commands/commander-add.md` → `claude-plugins/commander/commands/add.md`. Same sweep for `list.md`, `update.md`, `delete.md`.
- [ ] 4.2 In `claude-plugins/commander/skills/commander-normalize/SKILL.md` (and any sibling files under `references/`): replace every `/experiments:commander-add` → `/commander:add` and any path reference `claude-plugins/experiments/skills/commander-normalize/...` → `claude-plugins/commander/skills/commander-normalize/...`. Update the skill name reference from `experiments:commander-normalize` → `commander:commander-normalize` wherever the namespaced form appears (NOT in the YAML `name:` field — that stays `commander-normalize`).
- [ ] 4.3 If any of the four moved command files reference `experiments:commander-normalize` as the namespaced skill identifier, replace with `commander:commander-normalize`.

## 5. Rewrite slash-command references in remaining experiments artifacts

- [ ] 5.1 In `claude-plugins/experiments/commands/commander-update-patch.md`: replace every `/experiments:commander-{add,list,update,delete}` → `/commander:{add,list,update,delete}` (keep `/experiments:commander-update-patch` self-references unchanged). Replace `experiments:commander-normalize` → `commander:commander-normalize` if it appears.
- [ ] 5.2 In `claude-plugins/experiments/commands/commander-update-deep-patch.md`: same sweep as 5.1, keeping `/experiments:commander-update-deep-patch` self-references unchanged.
- [ ] 5.3 In every file under `claude-plugins/experiments/skills/commander-update-orchestrator/`: same sweep. Pay specific attention to the empty-registry message string `No projects registered. Use /experiments:commander-add to register one.` — it must become `No projects registered. Use /commander:add to register one.` so the spec scenario for the orchestrator skill matches the implementation.
- [ ] 5.4 Run `rg -n "/experiments:commander-(add|list|update|delete)\b" claude-plugins/experiments/` and confirm zero hits remain.

## 6. Update experiments README

- [ ] 6.1 Edit `claude-plugins/experiments/README.md`: remove the sections describing `/experiments:commander-add`, `/experiments:commander-list`, `/experiments:commander-update`, `/experiments:commander-delete`, and the `commander-normalize` skill.
- [ ] 6.2 Add a single short paragraph (or "See also" block) pointing readers to `claude-plugins/commander/README.md` for the CRUD interface and the normalize skill.
- [ ] 6.3 In the remaining `commander-update-patch` / `commander-update-deep-patch` blurbs, update any slash-command references from `/experiments:commander-{add,list,update,delete}` → `/commander:{add,list,update,delete}`.

## 7. Author commander README

- [ ] 7.1 Create `claude-plugins/commander/README.md` with: header + purpose paragraph (CRUD over `<HOME>/.claude/commander/projects.json`), per-command sections for `/commander:add`, `/commander:list`, `/commander:update`, `/commander:delete` (lifted/abbreviated from the old experiments README), a "Skills" section listing `commander-normalize`, a "Testing" snippet (`claude --plugin-dir ./claude-plugins/commander` and `/commander:list`), and a "Releases" section pointing to repo-root `RELEASE.md` and noting tag prefix `commander--v`.

## 8. Register commander in root marketplace.json

- [ ] 8.1 Edit `.claude-plugin/marketplace.json`: insert a new `plugins[]` entry `{ "name": "commander", "source": "./claude-plugins/commander", "version": "0.1.0", "description": "<copy from plugin.json>" }`. Place it alphabetically (commander, experiments, expo-developer).

## 9. Register commander in release-please

- [ ] 9.1 Edit `release-please-config.json`: add a `packages["claude-plugins/commander"]` entry mirroring the experiments/expo-developer entries — `release-type: "simple"`, `package-name: "commander"`, `tag-separator: "--"`, `include-v-in-tag: true`, `changelog-path: "CHANGELOG.md"`, and `extra-files` array with three entries: `.claude-plugin/plugin.json` (`$.version`), `package.json` (`$.version`), and `/.claude-plugin/marketplace.json` (`$.plugins[?(@.name=='commander')].version`).
- [ ] 9.2 Edit `.release-please-manifest.json`: add `"claude-plugins/commander": "0.1.0"` (next to the other claude-plugins entries; key order is not semantically significant but match the existing grouping).

## 10. Verify config plumbing (no edits expected, but check)

- [ ] 10.1 Inspect `nx.json` for any plugin-specific config entries. If `experiments` or `expo-developer` have explicit entries, add a parallel entry for `commander`; otherwise no change needed.
- [ ] 10.2 Inspect `knip.config.ts` for any plugin-specific config or ignore patterns. Add a `commander` entry only if `experiments` / `expo-developer` have one; otherwise leave alone.
- [ ] 10.3 Inspect `eslint.config.ts` / `commitlint.config.ts`. `commitlint.config.ts` uses `@commitlint/config-conventional` with no scope-enum restriction → no edit needed to allow `commander` as a conventional-commit scope. Confirm.
- [ ] 10.4 Verify `pnpm-workspace.yaml#packages` already globs `claude-plugins/*` (no edit needed).

## 11. Smoke-test the new plugin

- [ ] 11.1 Run `claude --plugin-dir ./claude-plugins/commander` (or equivalent local-plugin install command) and confirm `/commander:add`, `/commander:list`, `/commander:update`, `/commander:delete` appear in the slash-command listing.
- [ ] 11.2 Run `/commander:list` against a registry that contains at least one entry and confirm the rendered output matches the existing list format (no regression).
- [ ] 11.3 Run `/experiments:commander-update-patch` (the orchestration command that stays in experiments) and confirm the empty-registry message — if reached — reads `No projects registered. Use /commander:add to register one.` (the updated text).

## 12. Validate OpenSpec change

- [ ] 12.1 Run `openspec validate create-commander-plugin --strict` and confirm zero errors.
- [ ] 12.2 Run `openspec status --change create-commander-plugin` and confirm all four artifacts are `done`.

## 13. Conventional commit

- [ ] 13.1 Stage the move + edits and create a single conventional commit with the breaking-change footer to drive a `1.0.0` first-release bump. Suggested subject: `feat(commander)!: graduate commander to its own plugin` with a body summarizing the move and a `BREAKING CHANGE:` footer listing the four renamed slash commands.
- [ ] 13.2 Push the branch and open the PR. release-please will subsequently open a release PR bumping `claude-plugins/commander` from `0.1.0` to `1.0.0`; merging that PR creates `commander--v1.0.0` and updates `marketplace.json` + `package.json` + `plugin.json` atomically.

## 14. Post-merge cleanup (operator self-task — not part of the diff)

- [ ] 14.1 Update any local shell aliases / scripts that invoked `/experiments:commander-{add,list,update,delete}` to use `/commander:{add,list,update,delete}`.
