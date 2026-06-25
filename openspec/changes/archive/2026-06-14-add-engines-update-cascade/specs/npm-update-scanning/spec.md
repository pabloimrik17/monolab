## MODIFIED Requirements

### Requirement: Level input validation

The skill SHALL accept exactly one of `patch`, `minor`, `major` as the `level` input. `engines` is **no longer** a valid level for this skill: the toolchain bump (runtime / package manager) is resolved via `detect-toolchain-surfaces` (capability `engine-surface-scanning`), not via dependency scanning. Any other value —including `engines`— SHALL abort with a message of the form `Error: invalid level "<value>". Expected patch|minor|major.`

#### Scenario: Valid level accepted

- **WHEN** the caller passes `level=patch`
- **THEN** the skill proceeds past this precondition without error

#### Scenario: Invalid level aborts

- **WHEN** the caller passes `level=beta`
- **THEN** the skill aborts with the invalid-level error (`Expected patch|minor|major.`) and does not invoke ncu

#### Scenario: Engines is no longer a dependency-scan level

- **WHEN** the caller passes `level=engines`
- **THEN** the skill aborts with `Error: invalid level "engines". Expected patch|minor|major.` and does not invoke ncu (the toolchain bump is handled by `detect-toolchain-surfaces`)

### Requirement: ncu invocation

The skill SHALL invoke `npm-check-updates@21.0.2` (pinned) through the resolved runner with the following flags:

- `-p <resolvedPackageManager>` — REQUIRED. Uses the PM resolved in precondition 2 instead of relying on ncu's auto-detection. This is necessary because ncu 21.0.2 with `--packageFile <sub>/package.json` auto-detects `packageManager: 'deno'` when there is a sibling `deno.json`, which collapses `--dep` to `['imports']` and ignores `dependencies`/`devDependencies`.
- `--target <mapped-target>` (see "level → target mapping").
- `--jsonUpgraded`.
- `--cooldown <value>` only when applicable according to the `minimumReleaseAge` lookup.
- `--packageFile <manifest-path>` for each enumerated manifest.

The skill SHALL NOT rely on ncu's package manager auto-detection. The skill SHALL NOT pass `--enginesNode` (the runtime/toolchain bump is the responsibility of `apply-engine-bumps`, not of this dependency scan).

#### Scenario: -p always present

- **WHEN** ncu is invoked for any manifest
- **THEN** the command line includes `-p <resolvedPM>` with the value from the precondition

#### Scenario: PM mis-detection avoided

- **WHEN** a sub-package directory contains `package.json` (with declared deps) and a sibling `deno.json`, and the precondition's PM resolved to `pnpm`
- **THEN** ncu is invoked with `-p pnpm` and reports updates from `dependencies`/`devDependencies` instead of treating the manifest as a Deno import map

### Requirement: Level to target mapping

The skill SHALL translate `level` to ncu's `--target`:

- `patch` → `--target patch` (cap within the current minor).
- `minor` → `--target minor` (cap within the current major).
- `major` → `--target latest`, then post-filter discarding entries whose target-major is not strictly greater than the current-major.

The skill SHALL NOT map `engines` to any `--target` (it is not a valid level — see "Level input validation").

#### Scenario: Patch cap

- **WHEN** `level` is `patch`
- **THEN** ncu is invoked with `--target patch`

#### Scenario: Major post-filter

- **WHEN** `level` is `major` and ncu returns a target whose major equals the current-major
- **THEN** the skill discards that entry from the output
