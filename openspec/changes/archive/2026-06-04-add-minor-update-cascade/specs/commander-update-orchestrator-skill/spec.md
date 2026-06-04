## MODIFIED Requirements

### Requirement: Override-registry consultation

Before apply, the skill SHALL load the override registry indicated by `overrideRegistryPath` (default `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`) and resolve matches using the `npm-update-apply` override-resolution procedure (first-win glob matching over package names plus `{version}` resolution via `target-of:<name>` / `max-target-of:<glob>` / `latest` with `fallbackVersionSource`). The procedure supplies the matching and version-resolution algorithm only; the prompt and its cross-project scope are owned by this skill.

Override prompts SHALL be raised exactly once per matched entry across the entire run. When an entry's matches span multiple projects, the chosen action (`run-override`, `skip-matched`, `force-generic`) SHALL apply to every project the matches touch. The skill SHALL NOT raise an override prompt per project.

`{version}` resolution SHALL run against the cross-project aggregated `proposedTarget` set, not per-project sets.

If the override registry is missing or unparseable, the procedure SHALL degrade gracefully and the skill SHALL print a single warning (`Override registry unavailable: <reason>. Proceeding without overrides.`) and continue with no overrides applied.

#### Scenario: Single override prompt across projects

- **WHEN** `@storybook/*` matches updates in three projects
- **THEN** the user is prompted exactly once with the override question; the chosen action applies to all three projects

#### Scenario: Missing registry degrades gracefully

- **WHEN** the override registry file does not exist
- **THEN** the skill prints `Override registry unavailable: ENOENT. Proceeding without overrides.` and continues with the generic flow only

#### Scenario: Matching algorithm sourced from the shared procedure

- **WHEN** the skill resolves overrides
- **THEN** it uses the `npm-update-apply` override-resolution procedure for first-win matching and `{version}` resolution (not an inline copy of the algorithm)
- **AND** still raises its own cross-project `run-override` / `skip-matched` / `force-generic` prompt once per matched entry

### Requirement: Sequential apply per project with stop-on-fail

After the confirmation gate, the skill SHALL apply updates **sequentially, one project at a time**, in the registry's insertion order (filtered to the resolved project set). For each project, the skill SHALL:

1. Resolve the project's working directory `<record.path>` (passed to `npm-update-apply` as `cwd`).
2. Compute the per-project subset of accepted updates (the package occurrences for that project under the chosen conflict policy and override actions), including each occurrence's `effectiveTarget`.
3. If the per-project subset is empty (every package skipped/overridden out for this project), the skill SHALL skip apply and install for this project and continue to the next.
4. Build the resolved single-project apply spec for this project — generic `package.json` occurrences as `manifestBumps` (with `includeFilter` set whenever the per-project generic subset is a strict subset of the file's ncu candidate set), `pnpm-workspace.yaml` occurrences as `catalogEdits` (using `effectiveTarget`), interpolated `run-override` commands touching this project as `overrideCommands` (declaration order), and `skipInstall` per the install-skip rule — and invoke the `npm-update-apply` skill **once** with `target: <target>` and `cwd: <record.path>`. The skill performs the `ncu` bumps, catalog edits, override commands, and the single install for this project; the orchestrator SHALL NOT restate that recipe inline.

If `npm-update-apply` returns a structured failure for a project (any of `ncu`, `catalog`, `override`, `install`), the skill SHALL **stop the entire run** at that point, format the cross-project abort message (`Stopping the run. Subsequent projects not attempted.`) from the returned `step` and `exitCode`, and SHALL NOT attempt apply on subsequent projects. The skill SHALL fold each project's returned result fragment into the cross-project summary, which SHALL list:

- Projects fully applied (with per-project bumps and overrides).
- The project where the failure occurred (with the failing step and exit code).
- Projects pending (not yet attempted).

The user is responsible for reviewing partial state and re-running the command.

#### Scenario: Sequential order matches registry insertion order

- **WHEN** the resolved set is `[proj-B, proj-A]` (in the registry's insertion order, after filtering)
- **THEN** apply runs `proj-B` to completion first, then `proj-A`; never in parallel and never reordered

#### Scenario: Empty per-project subset skips that project

- **WHEN** every accepted package is bound to a `skip-matched` override for `proj-C`
- **THEN** apply for `proj-C` is skipped (no `npm-update-apply` invocation) and the skill proceeds to the next project

#### Scenario: Failure halts subsequent projects

- **WHEN** apply succeeds for `proj-A` and `proj-B`, then `npm-update-apply` returns an `ncu` failure for `proj-C`
- **THEN** the skill stops; `proj-D` is not attempted; the summary lists `proj-A`/`proj-B` as applied, `proj-C` as failed (with the failing step), and `proj-D` as pending

#### Scenario: One install per project

- **WHEN** apply succeeds for two projects with different package managers
- **THEN** each project's `npm-update-apply` invocation runs that project's install command exactly once (via the skill)

### Requirement: Deep-mode plan rendering reads workflow `plan.md`

When `mode === "deep"` and the workflow has successfully produced `plan.md`, the skill's Step 7 SHALL:

1. Read `<plan-dir>/plan.md` from the workflow's output.
2. Surface its content as the run plan: `## Improvements (universal — applicability checked per project at apply time)`, `## Workarounds resolved`, `## Skipped or unavailable`, `## Cross-project bump set`, `## Changelogs`.
3. Append the orchestrator-owned sections in this order after the plan content:
    - `**Warnings:**` heading with each warning as a `-` bullet, when the orchestrator's `warnings[]` is non-empty.
    - `**Skipped (scan-failed) (<N>):**` heading with `<name>: <error>` bullets, when `scanFailed[]` is non-empty.
    - `**Skipped (path missing) (<N>):**` heading with `<name> — <path>` bullets, when `pathMissing[]` is non-empty.

The `Cross-project bump set` table in deep mode uses the columns `package | proposed target | projects (locations)` — the same shape as shallow Step 7, just with the workflow generating it inside `plan.md` instead of the orchestrator generating it inline. The `## Changelogs` section is workflow-produced (per the `parallel-research-workflow` changelog requirement) and is surfaced verbatim along with the rest of `plan.md`.

#### Scenario: Deep-mode plan combines workflow output with orchestrator drift sections

- **WHEN** Step 7 fires in deep mode with one path-missing record and one scan-failed record
- **THEN** the rendered output contains the workflow's five H2 sections in order (including `## Changelogs`)
- **AND** appends `**Skipped (scan-failed) (1):**` and `**Skipped (path missing) (1):**` with their respective bullets

#### Scenario: Changelogs section surfaced verbatim

- **WHEN** the workflow's `plan.md` includes the `## Changelogs` section
- **THEN** the orchestrator surfaces that section verbatim and does NOT regenerate or summarize it

#### Scenario: Empty-plan early exit in deep mode

- **WHEN** the workflow's `plan.md` reports zero bumps AND zero improvements AND zero workarounds
- **THEN** the skill prints `No <level> updates available across selected projects.` and exits zero
- **AND** the plan-dir is preserved on disk (the workflow's end-of-flow cleanup runs separately)
