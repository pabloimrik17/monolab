# npm-update-minor-command Specification

## Purpose

The `/experiments:npm-update-minor` command is the shallow single-project sibling of `/experiments:npm-update-patch`, operating exclusively at **minor** level. It scans, renders, prompts for selection, resolves overrides, and delegates the mechanical apply to the `npm-update-apply` skill — identical in flow to the patch command except for the level.

## Requirements

### Requirement: Command entry point and scope

The `experiments` plugin SHALL provide the `/experiments:npm-update-minor` command at `claude-plugins/experiments/commands/npm-update-minor.md` with YAML frontmatter declaring a non-empty `description`. The command SHALL operate exclusively at **minor** level — it SHALL invoke `experiments:scan-npm-updates` with `level=minor` and SHALL NOT accept a different level via flags or prompts. It is the shallow single-project sibling of `/experiments:npm-update-patch`, identical in flow except for the level.

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** `npm-update-minor.md` SHALL exist with YAML frontmatter containing a non-empty `description`

#### Scenario: Level is fixed to minor

- **WHEN** the user runs `/experiments:npm-update-minor` (with or without stray arguments)
- **THEN** the command scans at `level=minor` and ignores any level argument

---

### Requirement: Scan, render, and selection flow

The command SHALL invoke `experiments:scan-npm-updates` with `level=minor` and consume the `ScanResult` verbatim. If `updates.length === 0`, the command SHALL print any non-empty `warnings` under a `Warnings:` heading and then the literal line `No minor updates available.` and exit without prompting. Otherwise the command SHALL render a table (`name`, `currentVersion → targetVersion`, `location`, sorted by `location` then `name`) and raise a single `AskUserQuestion` with options `apply-all`, `pick-subset`, `cancel`. `pick-subset` SHALL accept a comma/newline-separated exclusion list validated against the update names (re-prompt on unknown names). `cancel` SHALL exit without modifying any file.

#### Scenario: Empty result prints minor-specific copy

- **WHEN** the scan returns `updates: []`
- **THEN** the command prints `No minor updates available.` (not `No patch updates available.`) and exits without prompting

#### Scenario: Cancel touches no files

- **WHEN** the user selects `cancel`
- **THEN** the command exits with `Cancelled. No files modified.` and modifies no file

---

### Requirement: Override resolution and apply delegated to npm-update-apply

The command SHALL resolve overrides using the `npm-update-apply` override-resolution procedure against the accepted single-project set, raising the single-project `run-override` / `skip-matched` / `force-generic` prompt (one `AskUserQuestion` per matched entry) with its own copy. The command SHALL then build the resolved apply spec and invoke the `npm-update-apply` skill **once** to perform the generic `ncu` bumps, `pnpm-workspace.yaml` catalog edits, override commands, and single install. The command SHALL NOT restate the `ncu` / catalog / install recipe inline.

#### Scenario: Apply goes through npm-update-apply

- **WHEN** the user selects `apply-all` against a set with three `package.json` updates
- **THEN** the command invokes `npm-update-apply` with `target: "minor"` and the resolved manifest bumps, and does NOT invoke `npm-check-updates` directly

#### Scenario: Override prompt is single-project

- **WHEN** an override entry matches accepted packages
- **THEN** the command raises one `AskUserQuestion` per matched entry with the single-project prompt copy, then passes the resolved partition into the apply spec

---

### Requirement: Summary and hard rules

After apply (or after `cancel`), the command SHALL print a summary headed `## npm-update-minor summary`, composing the `npm-update-apply` result fragment into the same section shape as `/experiments:npm-update-patch` (applied generically, applied via override, skipped by override policy, skipped by user, install line, always-present `Suggested next steps`). On an `npm-update-apply` structured failure, the command SHALL format and print the single-project abort copy (`Re-run /experiments:npm-update-minor to retry the rest.`). The command SHALL NOT run tests, lint, build, or create commits/PRs, and SHALL NOT mutate `catalog:` consumer `package.json` entries.

#### Scenario: Summary heading is minor-namespaced

- **WHEN** a run completes
- **THEN** the summary starts with `## npm-update-minor summary`

#### Scenario: Abort copy is minor-namespaced

- **WHEN** `npm-update-apply` returns an `ncu` failure
- **THEN** the command prints the abort message naming `/experiments:npm-update-minor` as the re-run target
