# Proposal

## Why

`/prompt-presets:matt-retro` never loads Matt Pocock's `retro` skill. `retro` sets `disable-model-invocation: true`, so the Skill tool refuses it ("cannot be used with Skill tool due to disable-model-invocation"), and Claude Code does not expand a `/name` written inside a command body. The leading `/retro` is plain text: the preset runs without the skill it exists to drive. The main spec's "Running the command" scenario states the opposite.

## What Changes

- New `claude-plugins/prompt-presets/scripts/load-skill.sh <plugin> <skill>` (POSIX `sh`): prints the newest installed `SKILL.md` for that skill, frontmatter stripped, under a `Base directory for this skill:` header; prints a one-line notice when the skill is absent.
- `commands/matt-retro.md`: adds `allowed-tools` for that script and one `` !`${CLAUDE_PLUGIN_ROOT}/scripts/load-skill.sh mattpocock-skills retro` `` line above the prompt. The prompt text stays verbatim.
- README: prerequisite reworded (installed `mattpocock-skills` plugin, or a standalone `retro` skill); drops the "Claude resolves it to the installed skill" claim.
- Existing plugin, patch fix. No deps, no exports, no peer deps.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `prompt-presets-plugin`: plugin layout gains `scripts/`; `matt-retro` body injects the installed `retro` skill ahead of the verbatim prompt, and running it loads that skill.

## Impact

- Files: `claude-plugins/prompt-presets/scripts/load-skill.sh` (new), `commands/matt-retro.md`, `README.md`.
- Release: `fix(prompt-presets)` → release-please patch (`0.1.1`) on next `develop` → `main` promotion.
- Runtime: the command runs one bundled shell script, pre-approved by `allowed-tools`.
