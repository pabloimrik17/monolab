## MODIFIED Requirements

### Requirement: npm-update-patch Command

The `experiments` plugin SHALL provide the `/experiments:npm-update-patch` command at `claude-plugins/experiments/commands/npm-update-patch.md`, invocable as a Claude Code slash command.

The command SHALL:

- Have YAML frontmatter with at least `description`.
- Invoke the `scan-npm-updates` skill with `level=patch`.
- If there are no updates, show an informational message and terminate.
- Render a table with columns: `name`, `currentVersion → targetVersion`, `location`.
- Present the user with a single `AskUserQuestion` with options `apply-all`, `pick-subset`, `cancel`.
- If `pick-subset`: ask for names to exclude (comma-separated or one package per line; empty = include all); validate that names exist in the list and re-prompt if not.
- Load the Package Upgrade Override Registry at `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml` and compute matched entries against the accepted set. For each matched entry, present the user with an `AskUserQuestion` with options `run-override`, `skip-matched`, `force-generic`.
- Apply bumps to `package.json` manifests by invoking `npm-check-updates` with `--upgrade` once per manifest in the accepted, non-overridden subset, mirroring the `--target` and `--cooldown` flags resolved by the scan. The invocation SHALL include `--filter "<names>"` — where `<names>` is the per-manifest GENERIC partition (accepted package names minus any handled by `OVERRIDE_RUN`/`OVERRIDE_SKIP` for that manifest), space-separated and literal — whenever that set is a strict subset of ncu's detected candidates (i.e. `pick-subset`, or any `OVERRIDE_RUN`/`OVERRIDE_SKIP` touches this manifest).
- Apply bumps to `pnpm-workspace.yaml#catalog` entries with the existing in-memory edit path (locate the key under `catalog:`, replace the value preserving surrounding whitespace and comments).
- For override entries where the user selected `run-override`: execute the interpolated override command exactly once (with `{version}` resolved from the entry's `versionSource`), and skip the generic `ncu --upgrade` bump for all packages matched by that entry.
- For override entries where the user selected `skip-matched`: exclude all packages matched by the entry from both the generic bump and the override command.
- For override entries where the user selected `force-generic`: include the matched packages in the generic `ncu --upgrade` bump as if the registry did not match.
- Execute a single install invocation for the detected PM (`pnpm install` / `npm install` / `yarn install` / `bun install` / `deno install`) at the end, SKIPPING this final install when every package in the accepted set was handled by `run-override` and nothing was written outside the override command.
- Display a textual summary: what was applied (generic vs. override), what was skipped, what overrides ran (if any), and a message suggesting (not executing) verification steps to the dev/agent (tests, lint, commit).
- Not execute tests, lint, build, or create commits.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `npm-update-patch.md` SHALL exist with YAML frontmatter containing a `description` field

#### Scenario: Command invocable as slash command

- **WHEN** user types `/experiments:npm-update-patch`
- **THEN** Claude SHALL execute the command instructions

#### Scenario: No patch updates available

- **WHEN** the skill returns an empty `updates` array
- **THEN** the command SHALL print a message like "No patch updates available" and terminate without prompting

#### Scenario: Apply-all delegates to ncu --upgrade

- **WHEN** the skill returns N updates targeting M distinct `package.json` manifests AND the user selects `apply-all` AND no registry entry matches
- **THEN** the command SHALL run `ncu --target patch --upgrade --packageFile <path>` exactly once per manifest
- **AND** SHALL NOT perform per-entry `Edit` calls on those manifests
- **AND** SHALL reuse the `--cooldown` flag value resolved by the scan (omit when the scan relied on pnpm's native read)

#### Scenario: Pick-subset passes accepted names as ncu --filter

- **WHEN** the skill returns updates AND the user selects `pick-subset` AND excludes one package
- **THEN** the command SHALL invoke `ncu --target patch --upgrade --packageFile <path> --filter "<space-separated accepted names>"` per manifest
- **AND** only the accepted packages SHALL be rewritten in each manifest
- **AND** the excluded packages SHALL remain unchanged

#### Scenario: Pick-subset with invalid exclusion name

- **WHEN** the user submits an exclusion name not present in the updates list
- **THEN** the command SHALL re-prompt with the invalid name(s) highlighted and the list of valid names

#### Scenario: Cancel flow

- **WHEN** the user selects `cancel`
- **THEN** the command SHALL exit without modifying any file

#### Scenario: Catalog update edits pnpm-workspace.yaml

- **WHEN** an applied update has `sourceFile: "pnpm-workspace.yaml"`
- **THEN** the command SHALL bump the version under `catalog:` in `pnpm-workspace.yaml` using the in-memory edit path
- **AND** SHALL NOT invoke `ncu --upgrade` on the catalog file
- **AND** SHALL NOT touch the consumer `package.json`

#### Scenario: Registry entry matches — user selects run-override

- **WHEN** the accepted set contains `storybook@8.1.2` and `@storybook/react@8.1.2` AND the registry matches them to the `storybook` entry AND the user selects `run-override`
- **THEN** the command SHALL execute the interpolated override command (e.g. `npx storybook@8.1.2 upgrade`) exactly once
- **AND** SHALL NOT invoke `ncu --upgrade` for `storybook` or `@storybook/react`
- **AND** the summary SHALL list these packages under "applied via override"

#### Scenario: Registry entry matches — user selects skip-matched

- **WHEN** the accepted set contains `storybook@8.1.2` AND the user selects `skip-matched` for the `storybook` entry
- **THEN** the command SHALL NOT execute the override command
- **AND** SHALL NOT invoke `ncu --upgrade` for packages matched by the entry
- **AND** the summary SHALL list matched packages under "skipped by override policy"

#### Scenario: Registry entry matches — user selects force-generic

- **WHEN** the accepted set contains `storybook@8.1.2` AND the user selects `force-generic` for the `storybook` entry
- **THEN** the command SHALL invoke `ncu --upgrade` for the matched packages as if the registry did not match
- **AND** SHALL NOT execute the override command

#### Scenario: Registry invalid or missing

- **WHEN** the registry file does not exist OR fails to parse as YAML OR lacks an `overrides` top-level key
- **THEN** the command SHALL emit a warning and proceed as if no entries matched
- **AND** SHALL NOT abort the invocation

#### Scenario: Override command fails at runtime

- **WHEN** the override command exits non-zero
- **THEN** the command SHALL report the exit code and the command that failed
- **AND** SHALL NOT run `ncu --upgrade` as a fallback for the matched packages
- **AND** SHALL NOT run the final `<pm> install` if nothing was written outside the override

#### Scenario: Install step skipped when only overrides ran

- **WHEN** every accepted package was handled by `run-override` AND no `ncu --upgrade` invocation or catalog edit was made
- **THEN** the command SHALL NOT run the final `<pm> install`
- **AND** the summary SHALL note that the install was delegated to the override command(s)

#### Scenario: No post-install verification

- **WHEN** the command completes applying updates
- **THEN** the command SHALL NOT invoke tests, lint, build, or create a commit
- **AND** the final message SHALL suggest these as next steps for the dev/agent

## ADDED Requirements

### Requirement: Package Upgrade Override Registry

The `experiments` plugin SHALL provide a package upgrade override registry as a YAML data file at `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`.

The registry SHALL declare an `overrides` top-level key whose value is a list of entries. Each entry SHALL have:

- `id` (string, required): stable identifier for the entry (e.g. `storybook`).
- `matches` (list of strings, required, non-empty): glob patterns over package names. A package matches an entry when its name matches any pattern in the list.
- `command` (string, required): command template with the literal token `{version}` to be interpolated.
- `versionSource` (string, required): resolution strategy for `{version}`. Allowed values:
    - `target-of:<name>` — use the `targetVersion` of the named package from the accepted set.
    - `max-target-of:<glob>` — use the max semver across `targetVersion`s of accepted packages whose names match the glob.
    - `latest` — use the literal string `latest`.
- `fallbackVersionSource` (string, optional): same syntax as `versionSource`, used when the primary source cannot be resolved.
- `reference` (string, optional): URL to official documentation for the upgrade command.
- `notes` (string, optional): human-readable explanation of what the override does, surfaced in the AskUserQuestion prompt.

The registry SHALL be used exclusively by the `/experiments:npm-update-patch` command (future commands MAY reuse the same data file). The `scan-npm-updates` skill SHALL NOT read or emit overrides.

The registry SHALL include a seed entry for Storybook with:

- `id: storybook`
- `matches` covering `storybook`, `@storybook/*`, `eslint-plugin-storybook`, `storybook-addon-*`.
- `command: "npx storybook@{version} upgrade"`
- `versionSource: target-of:storybook`
- `fallbackVersionSource: max-target-of:@storybook/*`
- `reference: https://storybook.js.org/docs/releases/upgrading`

Matching SHALL be first-win ordered: a package matches at most one entry, the first in declaration order whose `matches` patterns coincide.

Glob semantics for `matches`: `*` matches any sequence of characters within a package name segment. No other glob metacharacters are supported in this iteration.

#### Scenario: Registry file exists with seed entry

- **WHEN** examining `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`
- **THEN** the file SHALL exist and parse as YAML
- **AND** SHALL contain at least one entry under `overrides:` with `id: storybook`

#### Scenario: Entry matches by exact name

- **WHEN** the accepted set includes a package named `storybook`
- **THEN** it SHALL match the `storybook` entry via the exact-name pattern `storybook`

#### Scenario: Entry matches by glob

- **WHEN** the accepted set includes a package named `@storybook/react`
- **THEN** it SHALL match the `storybook` entry via the glob pattern `@storybook/*`

#### Scenario: Entry does not match unrelated package

- **WHEN** the accepted set includes a package named `react`
- **THEN** it SHALL NOT match the `storybook` entry

#### Scenario: First-win match order

- **WHEN** two entries declare overlapping `matches` patterns AND a package would match both
- **THEN** the package SHALL be considered matched by the first entry in declaration order

#### Scenario: Version interpolation with target-of

- **WHEN** the `storybook` entry has `versionSource: target-of:storybook` AND the accepted set contains `storybook` with `targetVersion: "8.1.2"`
- **THEN** the interpolated command SHALL be `npx storybook@8.1.2 upgrade`

#### Scenario: Version interpolation falls back to max-target-of

- **WHEN** the `storybook` entry has `versionSource: target-of:storybook` AND `fallbackVersionSource: max-target-of:@storybook/*` AND the accepted set contains `@storybook/react` `8.1.2` and `@storybook/addon-essentials` `8.1.1` but NO `storybook` package
- **THEN** the interpolated command SHALL use `8.1.2` (the max across matching packages)

#### Scenario: Version interpolation unresolvable

- **WHEN** neither `versionSource` nor `fallbackVersionSource` can be resolved against the accepted set
- **THEN** the command SHALL emit a warning identifying the entry and SHALL skip the override prompt for that entry
- **AND** the matched packages SHALL fall back to generic `ncu --upgrade` treatment

#### Scenario: Adding a new entry requires no command logic change

- **WHEN** a new entry is appended to `overrides:` in the YAML file with valid `id`, `matches`, `command`, and `versionSource`
- **THEN** the `/experiments:npm-update-patch` command SHALL pick it up on next invocation without any change to `commands/npm-update-patch.md`
