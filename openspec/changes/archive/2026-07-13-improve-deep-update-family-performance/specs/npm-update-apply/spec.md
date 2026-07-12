## MODIFIED Requirements

### Requirement: Generic package.json bumps via npm-check-updates

For each `manifestBumps` element (a `package.json` `sourceFile`), the skill SHALL invoke `npm-check-updates@21.0.2` exactly once via the package-manager runner prefix (`pnpm dlx`, `npx -y`, `yarn dlx`, `bunx`, `deno run --allow-read --allow-net npm:`), with the same invocation shape, `<ncuTarget>` resolution table, `--removeRange` exact-pin rule, `--filter` rules, and catalog-reference guard as today (all unchanged).

**Output handling (replaces verbatim streaming):** the skill SHALL redirect `ncu` stdout/stderr to an on-disk log file — under the caller-provided run directory (`<run-dir>/logs/`) when one is supplied, else a temporary path — and surface a one-line digest per manifest. Verbatim streaming of `ncu` output into the conversation SHALL NOT occur. If `ncu` exits non-zero for a manifest, the skill SHALL stop immediately, surface a bounded tail of the log (at most ~40 lines), and return a structured failure `{ step: "ncu", sourceFile, exitCode, appliedSoFar }` without printing any consumer-specific abort message.

#### Scenario: ncu output goes to a log, not the conversation

- **WHEN** the skill runs `ncu` for a manifest
- **THEN** the full stdout/stderr is written to an on-disk log
- **AND** the conversation receives a one-line digest, not the verbatim output

#### Scenario: ncu failure returns structured failure, not consumer copy

- **WHEN** `ncu` exits non-zero on a manifest
- **THEN** the skill stops, surfaces at most ~40 tail lines from the log, returns `{ step: "ncu", sourceFile, exitCode, appliedSoFar }`, and does NOT run the install or any override command
- **AND** the skill does NOT print a `Re-run /experiments:...` or `Stopping the run...` line (the caller owns that copy)

### Requirement: Override command execution

After every generic manifest write and catalog edit for the project has succeeded, the skill SHALL execute each `overrideCommands` element's `command` exactly once, in declaration order, redirecting stdout/stderr to the run log (digest to the conversation; no verbatim streaming). If any override exits non-zero, the skill SHALL stop, surface a bounded tail of the log (at most ~40 lines), and return `{ step: "override", entryId, exitCode, appliedSoFar }`. The skill SHALL NOT run `ncu --upgrade` as a fallback after an override fails, and SHALL NOT run the final install on this path.

#### Scenario: Override output logged, not streamed

- **WHEN** an override command runs
- **THEN** its stdout/stderr goes to the on-disk log and the conversation receives a digest line

### Requirement: Single install with skip rule

After all generic bumps, catalog edits, and override commands for the project land successfully, the skill SHALL run exactly one install command for the project's package manager (`pnpm install` / `npm install` / `yarn install` / `bun install` / `deno install`), unless `skipInstall` is `true`, redirecting its stdout/stderr to the run log and surfacing a one-line digest. The skill SHALL skip the install when `skipInstall` is `true` (every accepted package was handled by an override that ran its own install). If the install exits non-zero, the skill SHALL surface a bounded tail of the log (at most ~40 lines) and return `{ step: "install", exitCode, appliedSoFar }`.

#### Scenario: Install output logged with digest

- **WHEN** the install runs
- **THEN** its full output is written to the on-disk log and the conversation receives a one-line digest
- **AND** a bounded tail (≤ ~40 lines) is surfaced only when the install fails

### Requirement: Structured result and caller-owned messaging

On success the skill SHALL return a structured result `{ appliedGeneric: [{ name, location }], appliedOverrides: [{ id, command, matchedNames }], installRan: boolean, logPath: "<string>", failure: null }`. On failure the skill SHALL return the same shape with `failure` populated per the failing-step requirements above. The skill SHALL write `ncu` / install / override stdout/stderr to the on-disk log referenced by `logPath` (observability moves to disk; verbatim streaming into the conversation SHALL NOT occur), and SHALL NOT print the consumer-facing summary block or the consumer-specific abort copy — the caller composes those so that single-project and cross-project consumers each preserve their own wording and exit semantics.

#### Scenario: Success returns a composable fragment

- **WHEN** the apply completes successfully
- **THEN** the result lists every generically-bumped package (with `location`), every override that ran (with command and matched names), `installRan`, and the `logPath` of the run log
- **AND** the skill prints no `## ...-<level> summary` heading of its own
