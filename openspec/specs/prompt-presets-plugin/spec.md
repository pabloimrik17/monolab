# prompt-presets-plugin Specification

## Purpose
Claude Code plugin that ships curated third-party prompts as slash commands, reproducing each source prompt verbatim so it can be re-run consistently in any project.

## Requirements

### Requirement: Plugin structure

The `prompt-presets` plugin SHALL exist at `claude-plugins/prompt-presets/` following the existing monolab plugin layout (as in `commander`): `.claude-plugin/plugin.json`, `commands/`, private `package.json`, `README.md` and `CHANGELOG.md`.

#### Scenario: Manifest valid

- **WHEN** reading `claude-plugins/prompt-presets/.claude-plugin/plugin.json`
- **THEN** it SHALL contain `name: "prompt-presets"`, a semver `version`, `description`, `author`, `license: "MIT"`, `repository`, `homepage` and `keywords`

#### Scenario: Package private and versions agree

- **WHEN** reading `claude-plugins/prompt-presets/package.json`
- **THEN** it SHALL have `name: "@m0n0lab/plugin-prompt-presets"` and `"private": true`
- **AND** its `version` SHALL equal the `version` in `plugin.json`

### Requirement: matt-retro command

The plugin SHALL provide a slash command `matt-retro` (invoked as `/prompt-presets:matt-retro`) whose prompt body is the prompt from Matt Pocock's post https://x.com/mattpocockuk/status/2105951409887949107, reproduced verbatim.

#### Scenario: Command file present

- **WHEN** listing `claude-plugins/prompt-presets/commands/`
- **THEN** `matt-retro.md` SHALL exist with YAML frontmatter containing a `description`

#### Scenario: Only the user can invoke it

- **WHEN** reading the frontmatter of `matt-retro.md`
- **THEN** it SHALL set `disable-model-invocation: true`, so Claude never starts the retro without the user running the command

#### Scenario: Prompt body is verbatim

- **WHEN** reading the body of `matt-retro.md` (everything after the frontmatter, trimmed)
- **THEN** it SHALL equal exactly: `/retro read my last 10 coding agent sessions and find ways to make my repo easier to navigate. Find where agents take too long to find relevant information, or rely on out-of-date docs. Improving navigability is such an underrated way to save tokens.`
- **AND** it SHALL NOT include the post's `Prompt of the day:` label
- **AND** it SHALL contain no added instructions, headings or `$ARGUMENTS` placeholder

#### Scenario: Source attribution kept outside the prompt

- **WHEN** reading `claude-plugins/prompt-presets/README.md`
- **THEN** it SHALL list `matt-retro`, credit Matt Pocock and link the source post
- **AND** it SHALL state that the command requires Matt Pocock's `retro` skill (`mattpocock/skills`) to be installed

#### Scenario: Running the command

- **WHEN** a user with the plugin installed runs `/prompt-presets:matt-retro`
- **THEN** Claude Code SHALL receive the verbatim prompt as the user turn, which directs it to the installed `retro` skill

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
