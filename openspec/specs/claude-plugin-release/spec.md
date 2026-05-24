# claude-plugin-release Specification

## Purpose

Defines the automated release flow for Claude Code plugins in `claude-plugins/`. Plugin releases are driven by `release-please` and follow the `{plugin-name}--v{version}` git-tag convention recognized by `claude plugin tag` and the Claude Code 2.1.110+ plugin dependency resolver. Each plugin has an independent version lifecycle, version files are synchronized atomically, and conventional commits drive bump levels.

## Requirements

### Requirement: Release Tag Format

Each Claude Code plugin in `claude-plugins/` SHALL be released via git tags formatted exactly as `{plugin-name}--v{version}`, where `{plugin-name}` matches the `name` field in the plugin's `.claude-plugin/plugin.json` and `{version}` is a semver string matching the `version` field in the same file at the tagged commit.

The double-dash separator (`--`) is required; it is the convention recognized by `claude plugin tag` and the plugin dependency resolver introduced in Claude Code 2.1.110.

#### Scenario: experiments plugin release tag

- **WHEN** the `experiments` plugin is released at version `0.7.1`
- **THEN** a git tag `experiments--v0.7.1` SHALL exist on the release commit
- **AND** that commit's `claude-plugins/experiments/.claude-plugin/plugin.json` SHALL have `version: "0.7.1"`

#### Scenario: expo-developer plugin release tag

- **WHEN** the `expo-developer` plugin is released at version `0.2.0`
- **THEN** a git tag `expo-developer--v0.2.0` SHALL exist on the release commit
- **AND** that commit's `claude-plugins/expo-developer/.claude-plugin/plugin.json` SHALL have `version: "0.2.0"`

#### Scenario: commander plugin release tag

- **WHEN** the `commander` plugin is released at version `1.0.0`
- **THEN** a git tag `commander--v1.0.0` SHALL exist on the release commit
- **AND** that commit's `claude-plugins/commander/.claude-plugin/plugin.json` SHALL have `version: "1.0.0"`

#### Scenario: tag separator format

- **WHEN** examining any plugin release tag
- **THEN** the separator between the plugin name and the version SHALL be `--` (two consecutive hyphens)
- **AND** the version SHALL be prefixed with `v`

---

### Requirement: Release Automation via release-please

Plugin releases SHALL be driven by the configured release-please workflow at `.github/workflows/release-please.yml` (`target-branch: main`). The workflow's GitHub Actions, including `googleapis/release-please-action`, SHALL be pinned to a 40-character commit digest per the repo's OpenSSF Scorecard policy — never a floating major tag.

The configuration files `release-please-config.json` and `.release-please-manifest.json` SHALL contain one entry per plugin with:

- `release-type: simple`
- `tag-separator: "--"`
- `include-v-in-tag: true` (default)
- `extra-files` entries that bump the plugin's `.claude-plugin/plugin.json` and the matching entry in the root `.claude-plugin/marketplace.json`

#### Scenario: experiments entry in release-please-config.json

- **WHEN** examining `release-please-config.json`
- **THEN** there SHALL be a `packages["claude-plugins/experiments"]` entry
- **AND** that entry SHALL have `release-type: "simple"`
- **AND** that entry SHALL have `tag-separator: "--"`
- **AND** that entry's `extra-files` SHALL include `.claude-plugin/plugin.json` (jsonpath `$.version`) and the root `.claude-plugin/marketplace.json` (jsonpath targeting the experiments plugin entry's version)

#### Scenario: expo-developer entry in release-please-config.json

- **WHEN** examining `release-please-config.json`
- **THEN** there SHALL be a `packages["claude-plugins/expo-developer"]` entry
- **AND** that entry SHALL have `release-type: "simple"`
- **AND** that entry SHALL have `tag-separator: "--"`
- **AND** that entry's `extra-files` SHALL include `.claude-plugin/plugin.json` (jsonpath `$.version`) and the root `.claude-plugin/marketplace.json` (jsonpath targeting the expo-developer plugin entry's version)

#### Scenario: commander entry in release-please-config.json

- **WHEN** examining `release-please-config.json`
- **THEN** there SHALL be a `packages["claude-plugins/commander"]` entry
- **AND** that entry SHALL have `release-type: "simple"`
- **AND** that entry SHALL have `tag-separator: "--"`
- **AND** that entry SHALL have `package-name: "commander"`
- **AND** that entry's `extra-files` SHALL include `.claude-plugin/plugin.json` (jsonpath `$.version`), `package.json` (jsonpath `$.version`), and the root `.claude-plugin/marketplace.json` (jsonpath `$.plugins[?(@.name=='commander')].version`)

#### Scenario: manifest seeded with current versions

- **WHEN** examining `.release-please-manifest.json`
- **THEN** it SHALL contain entries for `"claude-plugins/experiments"`, `"claude-plugins/expo-developer"`, and `"claude-plugins/commander"` keyed to each plugin's current version
- **AND** each seed value SHALL match the `version` field in that plugin's `.claude-plugin/plugin.json` at change-merge time

---

### Requirement: Version File Synchronization

For every plugin release PR opened by release-please, the PR SHALL update both `.claude-plugin/plugin.json` and the matching entry in the root `.claude-plugin/marketplace.json` to the same new version atomically.

For the `experiments` and `commander` plugins, the PR SHALL also update `claude-plugins/<plugin>/package.json` to the same version.

If any of these files would be left at the previous version after the PR is merged, the configuration SHALL be considered broken and the PR SHALL NOT be merged.

#### Scenario: minor bump synchronizes both manifests

- **WHEN** release-please opens a release PR bumping `experiments` from 0.7.0 to 0.8.0
- **THEN** the PR diff SHALL update `claude-plugins/experiments/.claude-plugin/plugin.json` `version` to `"0.8.0"`
- **AND** the PR diff SHALL update the experiments entry in `.claude-plugin/marketplace.json` `version` to `"0.8.0"`
- **AND** the PR diff SHALL update `claude-plugins/experiments/package.json` `version` to `"0.8.0"`

#### Scenario: commander breaking-change bump synchronizes all three manifests

- **WHEN** release-please opens the first commander release PR bumping `commander` from 0.1.0 to 1.0.0 (driven by `feat(commander)!:` on the graduation commit)
- **THEN** the PR diff SHALL update `claude-plugins/commander/.claude-plugin/plugin.json` `version` to `"1.0.0"`
- **AND** the PR diff SHALL update the commander entry in `.claude-plugin/marketplace.json` `version` to `"1.0.0"`
- **AND** the PR diff SHALL update `claude-plugins/commander/package.json` `version` to `"1.0.0"`

#### Scenario: marketplace.json array order is documented

- **WHEN** examining `.claude-plugin/marketplace.json`
- **THEN** the file SHALL include guidance (in repo documentation or as commentary in the README) noting that the order of entries in `plugins[]` is significant for release-please's `extra-files` jsonpath resolution

---

### Requirement: Conventional Commit Bump Mapping

Plugin version bumps SHALL be derived from conventional commit types in the commits since the last plugin tag, scoped to the plugin's path:

| Commit type / footer | Bump |
|----------------------|-------|
| `feat(<plugin>)`, `feat: ` affecting plugin path | minor |
| `fix(<plugin>)`, `fix: ` affecting plugin path | patch |
| `feat!:` / `BREAKING CHANGE:` footer affecting plugin path | major |
| `chore`, `docs`, `refactor`, `test`, `build`, `ci` (no `!`) | no bump |

When no bumping commit exists for a plugin since its last tag, release-please SHALL NOT open a release PR for that plugin.

#### Scenario: feature commit triggers minor bump

- **WHEN** a `feat(experiments): add new skill` commit lands on main and the previous experiments tag was `experiments--v0.7.0`
- **THEN** release-please SHALL propose `experiments--v0.8.0` in the next release PR

#### Scenario: docs-only commit does not trigger release

- **WHEN** only `docs(experiments): clarify README` commits have landed since the last experiments tag
- **THEN** release-please SHALL NOT propose a new experiments release

#### Scenario: breaking change triggers major bump

- **WHEN** a commit affecting the experiments plugin contains `BREAKING CHANGE:` in its footer and the previous tag was `experiments--v0.7.0`
- **THEN** release-please SHALL propose `experiments--v1.0.0` in the next release PR

---

### Requirement: Per-Plugin CHANGELOG

For each plugin, release-please SHALL generate or update a `CHANGELOG.md` file at the plugin's root (`claude-plugins/<plugin>/CHANGELOG.md`) with one entry per release containing the bumped version, date, and grouped commit messages.

#### Scenario: experiments CHANGELOG created on first release

- **WHEN** release-please first releases the experiments plugin
- **THEN** `claude-plugins/experiments/CHANGELOG.md` SHALL exist
- **AND** it SHALL contain a section for the released version

#### Scenario: commander CHANGELOG created on first release

- **WHEN** release-please first releases the commander plugin
- **THEN** `claude-plugins/commander/CHANGELOG.md` SHALL exist
- **AND** it SHALL contain a section for the released version

#### Scenario: subsequent releases append entries

- **WHEN** release-please releases experiments a second time
- **THEN** `claude-plugins/experiments/CHANGELOG.md` SHALL contain entries for both releases in reverse chronological order

---

### Requirement: Documentation of Release Flow

The repository SHALL document the plugin release flow in human-readable form so contributors understand how versions are bumped and tags are created.

The documentation SHALL include:

- The tag format `{plugin-name}--v{version}` and the rationale for the double-dash separator.
- The conventional-commit-to-bump mapping.
- The `develop → main` weekly cadence and the role of `main` as the release branch.
- The note that the GitHub default branch is currently `develop` and what that means for marketplace consumers until the flip.

#### Scenario: root README references plugin release flow

- **WHEN** reading the repository's root `README.md`
- **THEN** it SHALL contain a section describing how Claude plugins are released, or a link to a dedicated document that describes it

#### Scenario: plugin READMEs link to release docs

- **WHEN** reading `claude-plugins/experiments/README.md`, `claude-plugins/expo-developer/README.md`, or `claude-plugins/commander/README.md`
- **THEN** the README SHALL describe how a release is triggered for that plugin (or link to the central release flow document)
