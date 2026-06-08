## MODIFIED Requirements

### Requirement: Sequential apply per project with stop-on-fail

After the confirmation gate, the skill SHALL apply updates **sequentially, one project at a time**, in the registry's insertion order (filtered to the resolved project set). For each project, the skill SHALL:

1. Resolve the project's working directory `<record.path>` (passed to `npm-update-apply` as `cwd`).
2. Compute the per-project subset of accepted updates (the package occurrences for that project under the chosen conflict policy and override actions), including each occurrence's `effectiveTarget`.
3. If the per-project subset is empty (every package skipped/overridden out for this project), the skill SHALL skip apply and install for this project and continue to the next.
4. Build the resolved single-project apply spec for this project — generic `package.json` occurrences as `manifestBumps`, `pnpm-workspace.yaml` occurrences as `catalogEdits` (using `effectiveTarget`), interpolated `run-override` commands touching this project as `overrideCommands` (declaration order), and `skipInstall` per the install-skip rule — and invoke the `npm-update-apply` skill **once** with `target: <target>` and `cwd: <record.path>`. The target→ncu mapping (`major→latest`, `engines→latest`+`--enginesNode`) and the exact-pin write (`--removeRange`) are owned by `npm-update-apply`; the orchestrator passes `target` unchanged. For each `manifestBumps` element, `includeFilter` SHALL be set to `true` whenever the per-project generic subset is a strict subset of the file's ncu candidate set; additionally, when `target` is `major` or `engines` (it maps to `ncu --target latest`), `includeFilter` SHALL ALWAYS be `true` for every element (the per-project `names` list is authoritative, preventing over-bumping dependencies that `scan-npm-updates` excluded). The skill performs the `ncu` bumps, catalog edits, override commands, and the single install for this project; the orchestrator SHALL NOT restate that recipe inline.

If `npm-update-apply` returns a structured failure for a project (any of `ncu`, `catalog`, `override`, `install`), the skill SHALL **stop the entire run** at that point, format the cross-project abort message (`Stopping the run. Subsequent projects not attempted.`) from the returned `step` and `exitCode`, and SHALL NOT attempt apply on subsequent projects. The skill SHALL fold each project's returned result fragment into the cross-project summary, which SHALL list:

- Projects fully applied (with per-project bumps and overrides).
- The project where the failure occurred (with the failing step and exit code).
- Projects pending (not yet attempted).

The user is responsible for reviewing partial state and re-running the command.

#### Scenario: Sequential order matches registry insertion order

- **WHEN** the resolved set is `[proj-B, proj-A]` (in the registry's insertion order, after filtering)
- **THEN** apply runs `proj-B` to completion first, then `proj-A`; never in parallel and never reordered

#### Scenario: Major forces per-project filter

- **WHEN** the run is at `target: "major"` and a project's per-project generic subset for a `package.json` would otherwise qualify for `includeFilter: false`
- **THEN** the orchestrator builds that `manifestBumps` element with `includeFilter: true`
- **AND** `npm-update-apply` runs `ncu --target latest --filter "<names>"` for that file, bumping only the accepted major packages

#### Scenario: Empty per-project subset skips that project

- **WHEN** every accepted package is bound to a `skip-matched` override for `proj-C`
- **THEN** apply for `proj-C` is skipped (no `npm-update-apply` invocation) and the skill proceeds to the next project

#### Scenario: Failure halts subsequent projects

- **WHEN** apply succeeds for `proj-A` and `proj-B`, then `npm-update-apply` returns an `ncu` failure for `proj-C`
- **THEN** the skill stops; `proj-D` is not attempted; the summary lists `proj-A`/`proj-B` as applied, `proj-C` as failed (with the failing step), and `proj-D` as pending

#### Scenario: One install per project

- **WHEN** apply succeeds for two projects with different package managers
- **THEN** each project's `npm-update-apply` invocation runs that project's install command exactly once (via the skill)
