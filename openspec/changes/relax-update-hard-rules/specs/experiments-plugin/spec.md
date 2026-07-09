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
- Resolve overrides via the `npm-update-apply` override-resolution procedure against the accepted set (loading the Package Upgrade Override Registry at `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`). For each matched entry, present the user with an `AskUserQuestion` with options `run-override`, `skip-matched`, `force-generic`, then partition the accepted set into `GENERIC` / `OVERRIDE_RUN` / `OVERRIDE_SKIP` per the chosen actions (`run-override` → handled by the override command and excluded from generic ncu; `skip-matched` → excluded from everything; `force-generic` → bumped generically as if unmatched).
- Build the resolved apply spec and invoke the `npm-update-apply` skill once with `target: patch` to perform the mechanical apply: generic `package.json` updates as `manifestBumps` (with `--filter "<names>"` membership — the per-manifest GENERIC partition, space-separated and literal — whenever that set is a strict subset of ncu's detected candidates, i.e. `pick-subset` or any `OVERRIDE_RUN`/`OVERRIDE_SKIP` touching the manifest); `pnpm-workspace.yaml#catalog` updates as `catalogEdits` (in-memory key edit preserving whitespace and comments); interpolated `run-override` commands as `overrideCommands` (executed once each, skipping generic ncu for their matched packages); and `skipInstall` set when every accepted package was handled by `run-override` and nothing was written outside the override command. The skill runs `npm-check-updates@21.0.2` per manifest (mirroring the `--target` and `--cooldown` flags resolved by the scan), performs the catalog edits, runs the override commands, and runs the single `<pm> install`. The command SHALL NOT restate that recipe inline.
- Display a textual summary composed from the `npm-update-apply` result fragment: what was applied (generic vs. override), what was skipped, what overrides ran (if any), and a message suggesting (not executing) verification steps to the dev/agent (tests, lint, commit).
- Not create commits, push, or open PRs autonomously; the command stops for human-in-the-loop review before any such outward/VCS action. Running read-only verification (lint, typecheck, build) is permitted but never performed automatically by default.

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
- **THEN** the command SHALL run `ncu --target patch --upgrade --packageFile <path>` exactly once per manifest (via `npm-update-apply`)
- **AND** SHALL NOT perform per-entry `Edit` calls on those manifests
- **AND** SHALL reuse the `--cooldown` flag value resolved by the scan (omit when the scan relied on pnpm's native read)

#### Scenario: Pick-subset passes accepted names as ncu --filter

- **WHEN** the skill returns updates AND the user selects `pick-subset` AND excludes one package
- **THEN** the command SHALL invoke `ncu --target patch --upgrade --packageFile <path> --filter "<space-separated accepted names>"` per manifest (via `npm-update-apply`)
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
- **THEN** the command SHALL bump the version under `catalog:` in `pnpm-workspace.yaml` using the in-memory edit path (via `npm-update-apply`)
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

#### Scenario: No autonomous commit/push/PR

- **WHEN** the command completes applying updates
- **THEN** the command SHALL NOT autonomously create a commit, push, or open a PR
- **AND** the final message SHALL suggest tests, lint, and commit as next steps for the dev/agent
