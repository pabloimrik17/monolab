# Tasks

## 1. Skill loader

- [x] 1.1 Create executable `claude-plugins/prompt-presets/scripts/load-skill.sh` per spec "Installed skill loader" (design 2-5). Verify: `sh -n` passes; fixture run with `HOME` set to a temp dir holding two plugin-cache copies of `retro` (one under `skills/engineering/`, one under `skills/`, different mtimes) prints only the newer, with the `Base directory` header and no frontmatter; a `~/.claude/skills/retro` copy is found when no plugin copy exists; an empty `HOME` prints one notice line and exits 0; `git ls-files -s` shows mode `100755`.

## 2. matt-retro command

- [x] 2.1 In `commands/matt-retro.md`, add `allowed-tools: Bash(${CLAUDE_PLUGIN_ROOT}/scripts/load-skill.sh:*)` and the `` !`${CLAUDE_PLUGIN_ROOT}/scripts/load-skill.sh mattpocock-skills retro` `` line above the unchanged prompt. Verify: body first line equals the loader line and the rest, newlines stripped, equals the spec string.
- [x] 2.2 Update `claude-plugins/prompt-presets/README.md`: prerequisite = `retro` via the `mattpocock-skills` plugin or standalone; replace the "Claude resolves it to the installed skill" claim with the injection explanation; note the missing-skill notice. Verify: `pnpm exec markdownlint claude-plugins/prompt-presets/README.md` passes.
- [x] 2.3 End-to-end: `claude --plugin-dir ./claude-plugins/prompt-presets -p "/prompt-presets:matt-retro" --max-turns 2 --output-format stream-json --verbose`. Verify: first tool call is a Skill call for `writing-for-agents` (retro step 1) and no Skill call targets `retro`.

## 3. Validate

- [x] 3.1 Run `openspec validate fix-matt-retro-skill-loading --strict` and `pnpm nx affected -t lint`; no task affects exports, so no `attw` run. Verify: both pass.
