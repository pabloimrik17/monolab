# prompt-presets-plugin Specification

## Purpose
Claude Code plugin that ships curated third-party prompts as slash commands, reproducing each source prompt verbatim so it can be re-run consistently in any project.

## Requirements

### Requirement: Plugin structure

The `prompt-presets` plugin SHALL exist at `claude-plugins/prompt-presets/` following the existing monolab plugin layout (as in `commander`): `.claude-plugin/plugin.json`, `commands/`, `scripts/`, private `package.json`, `README.md` and `CHANGELOG.md`.

#### Scenario: Manifest valid

- **WHEN** reading `claude-plugins/prompt-presets/.claude-plugin/plugin.json`
- **THEN** it SHALL contain `name: "prompt-presets"`, a semver `version`, `description`, `author`, `license: "MIT"`, `repository`, `homepage` and `keywords`

#### Scenario: Package private and versions agree

- **WHEN** reading `claude-plugins/prompt-presets/package.json`
- **THEN** it SHALL have `name: "@m0n0lab/plugin-prompt-presets"` and `"private": true`
- **AND** its `version` SHALL equal the `version` in `plugin.json`

### Requirement: matt-retro command

The plugin SHALL provide a slash command `matt-retro` (invoked as `/prompt-presets:matt-retro`) that injects Matt Pocock's installed `retro` skill ahead of the prompt from https://x.com/mattpocockuk/status/2105951409887949107, reproduced verbatim.

#### Scenario: Command file present

- **WHEN** listing `claude-plugins/prompt-presets/commands/`
- **THEN** `matt-retro.md` SHALL exist with YAML frontmatter containing a `description`

#### Scenario: Only the user can invoke it

- **WHEN** reading the frontmatter of `matt-retro.md`
- **THEN** it SHALL set `disable-model-invocation: true`, so Claude never starts the retro without the user running the command
- **AND** its `allowed-tools` SHALL allow only `Bash("${CLAUDE_PLUGIN_ROOT}/scripts/load-skill.sh":*)`

#### Scenario: Prompt body is verbatim

- **WHEN** reading the body of `matt-retro.md` (everything after the frontmatter, trimmed)
- **THEN** its first line SHALL be `` !`"${CLAUDE_PLUGIN_ROOT}/scripts/load-skill.sh" mattpocock-skills retro` ``
- **AND** the remaining text, trimmed, SHALL equal exactly: `/retro read my last 10 coding agent sessions and find ways to make my repo easier to navigate. Find where agents take too long to find relevant information, or rely on out-of-date docs. Improving navigability is such an underrated way to save tokens.`
- **AND** it SHALL NOT include the post's `Prompt of the day:` label
- **AND** it SHALL contain no other added instructions, headings or `$ARGUMENTS` placeholder

#### Scenario: Source attribution kept outside the prompt

- **WHEN** reading `claude-plugins/prompt-presets/README.md`
- **THEN** it SHALL list `matt-retro`, credit Matt Pocock and link the source post
- **AND** it SHALL state that the command requires Matt Pocock's `retro` skill (`mattpocock/skills`), installed through the `mattpocock-skills` plugin or as a standalone skill

#### Scenario: Running the command

- **WHEN** a user with the plugin and Matt Pocock's `retro` skill installed runs `/prompt-presets:matt-retro`
- **THEN** Claude Code SHALL receive the `retro` skill's instructions followed by the verbatim prompt as the user turn
- **AND** Claude SHALL follow `retro` without a Skill tool call for `retro`

#### Scenario: Retro skill missing

- **WHEN** a user without the `retro` skill runs `/prompt-presets:matt-retro`
- **THEN** the user turn SHALL carry a one-line notice that `retro` is not installed, followed by the verbatim prompt

### Requirement: Marketplace registration

The plugin SHALL be listed in the root `.claude-plugin/marketplace.json` so it installs via `/plugin install prompt-presets@monolab`.

#### Scenario: Marketplace entry

- **WHEN** reading `.claude-plugin/marketplace.json`
- **THEN** `plugins[]` SHALL contain an entry with `name: "prompt-presets"`, `source: "./claude-plugins/prompt-presets"`, a `description`, and `version` equal to the plugin's `plugin.json` version
- **AND** existing entries SHALL keep their order, with the new entry appended last

### Requirement: Release automation

The plugin SHALL be released by release-please with the same configuration shape as the existing plugins, producing tags `prompt-presets--v{version}`.

#### Scenario: release-please config entry

- **WHEN** reading `release-please-config.json`
- **THEN** `packages["claude-plugins/prompt-presets"]` SHALL have `release-type: "simple"`, `package-name: "prompt-presets"`, `tag-separator: "--"`, `include-v-in-tag: true`, `changelog-path: "CHANGELOG.md"`
- **AND** its `extra-files` SHALL bump `.claude-plugin/plugin.json` (`$.version`), `package.json` (`$.version`) and `/.claude-plugin/marketplace.json` (`$.plugins[?(@.name=='prompt-presets')].version`)

#### Scenario: Manifest seed

- **WHEN** reading `.release-please-manifest.json`
- **THEN** it SHALL contain `"claude-plugins/prompt-presets"` equal to the plugin's `plugin.json` version

### Requirement: Installed skill loader

The plugin SHALL ship `scripts/load-skill.sh <plugin> <skill>`, a POSIX `sh` script that prints an installed skill's instructions so a command can inject a skill the Skill tool refuses (`disable-model-invocation: true`).

#### Scenario: Skill installed through a plugin

- **WHEN** running `scripts/load-skill.sh mattpocock-skills retro` with `retro` in an installed `mattpocock-skills` plugin under `plugins/cache/` of the Claude config dir (`$CLAUDE_CONFIG_DIR`, default `~/.claude`)
- **THEN** it SHALL print `Base directory for this skill: <dir>` followed by that `SKILL.md` without its frontmatter
- **AND** exit 0

#### Scenario: Several plugin copies installed

- **WHEN** more than one copy matches in the plugin cache (versions, marketplaces or `skills/` layouts)
- **THEN** it SHALL print only the most recently modified copy

#### Scenario: Standalone skill

- **WHEN** no plugin copy matches
- **THEN** it SHALL print `skills/<skill>/SKILL.md` from the Claude config dir if present, otherwise `.claude/skills/<skill>/SKILL.md` under the current directory
- **AND** a copy under the current directory SHALL NOT be printed while a plugin or Claude-config-dir copy exists

#### Scenario: Skill not installed

- **WHEN** no copy matches
- **THEN** it SHALL print one line naming the missing skill and exit 0
