## ADDED Requirements

### Requirement: Command location, frontmatter, and invocation contract

The `experiments` plugin SHALL include a slash command at `claude-plugins/experiments/commands/commander-update-deep-patch.md` with YAML frontmatter declaring a non-empty `description` field. The command SHALL be invocable as `/experiments:commander-update-deep-patch`.

The command SHALL accept no positional arguments and no flags. The `ARGUMENTS` token is preserved only for handling stray user input (a one-line warning, not an early exit).

#### Scenario: Command file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/commands/`
- **THEN** the file `commander-update-deep-patch.md` SHALL exist
- **AND** SHALL contain YAML frontmatter with a non-empty `description` field

#### Scenario: Stray arguments are reported and ignored, not fatal

- **WHEN** the user invokes `/experiments:commander-update-deep-patch foo bar`
- **THEN** the command prints exactly one line `commander-update-deep-patch takes no arguments; ignoring: foo bar` and continues into the orchestrator invocation
- **AND** the command does NOT exit early on stray input

#### Scenario: Empty argument string proceeds silently

- **WHEN** the user invokes `/experiments:commander-update-deep-patch` with no argument or only whitespace
- **THEN** the command proceeds directly to the orchestrator invocation with no preamble line

---

### Requirement: Single invocation of the orchestrator with the deep-patch input set

The command SHALL invoke the `commander-update-orchestrator` skill exactly **once** per command execution, via the `Skill` tool, with these inputs:

- `level: "patch"`
- `target: "patch"`
- `mode: "deep"`
- `overrideRegistryPath`: omitted (the skill defaults to `claude-plugins/experiments/skills/scan-npm-updates/data/pkg-upgrade-overrides.yaml`)
- `projectsFilter`: omitted (the skill's interactive multi-select picker is the only project-selection surface in v1)

The command SHALL NOT:

- Override `level` or `target` to anything other than `patch`.
- Override `mode` to anything other than `"deep"`.
- Override `overrideRegistryPath`.
- Pass a `projectsFilter`.
- Invoke any other skill or package-manager command directly. Every action goes through the orchestrator.

#### Scenario: Orchestrator invoked with deep-patch inputs

- **WHEN** `/experiments:commander-update-deep-patch` runs against a registry with at least one project
- **THEN** the orchestrator skill is invoked exactly once with `level: "patch"`, `target: "patch"`, `mode: "deep"`
- **AND** the command issues no other Skill invocations and runs no `ncu` / `<pm>` commands of its own

#### Scenario: Orchestrator output is surfaced verbatim

- **WHEN** the orchestrator emits prompts (project picker, conflict policy, override actions, gate, plan-mode entry), tables, summaries, or error messages
- **THEN** the command surfaces every line verbatim to the user, without wrapping, prefixing, or post-processing
- **AND** the command exits with the same exit code the orchestrator returned

---

### Requirement: Hard rules inherited from the orchestrator and `npm-update-deep-patch`

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and `npm-update-deep-patch`. The command SHALL NOT:

- Run tests, lint, or build at any point.
- Create git commits, branches, or pull requests.
- Modify any file when the user selects `cancel` at the orchestrator's confirmation gate or rejects the plan-mode round at apply time.
- Mutate `<HOME>/.claude/commander/projects.json` — the registry is read-only on this path. The on-disk file SHALL be byte-identical before and after every run (verifiable via `shasum`).
- Mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- Auto-execute an override command without the user selecting `run-override` explicitly for that entry.
- Run `ncu --upgrade` as a fallback after an override command fails.

#### Scenario: Cancel at the gate leaves the workspace untouched

- **WHEN** the user picks `cancel` at the orchestrator's confirmation gate
- **THEN** no manifest, lockfile, override command, install, or plan-mode round runs
- **AND** the command exits zero
- **AND** the registry SHA is unchanged

#### Scenario: Plan-mode rejection preserves bumps but skips improvements

- **WHEN** the user rejects the plan-mode round at apply time after some bumps have already landed
- **THEN** the already-applied bumps are preserved (no rollback)
- **AND** no improvement edits are applied
- **AND** the command surfaces `Improvements rejected at plan-mode review. No improvement edits applied; bumps are preserved.` verbatim
- **AND** the summary lists applied bumps and zero applied improvements

#### Scenario: Registry byte-identity verified post-run

- **WHEN** a full apply-all run completes (success, partial, or cancel)
- **THEN** `<HOME>/.claude/commander/projects.json` SHALL be byte-identical to its pre-run state
- **AND** `shasum` of the file pre and post run produces the same digest

---

### Requirement: Non-goals deferred to follow-ups

The command SHALL NOT implement the following in v1 (they are explicitly deferred):

- `--projects a,b,c` flag — the orchestrator's interactive picker is the v1 surface. Add when a scripted caller appears.
- `--all` flag to skip the picker — the picker has an `all` option already; CLI sugar deferred.
- Per-project parallel apply — sequential by design (Decision 6 in `design.md` and Decision 2 in the shallow orchestrator's design).
- Auto-rollback on failure — out of scope; the summary partition (applied / failed / pending) is the recovery surface.
- Tests — manual verification only, matching the rest of the experiments plugin.

#### Scenario: CLI flags are not recognized

- **WHEN** the user invokes `/experiments:commander-update-deep-patch --projects foo,bar`
- **THEN** the command treats `--projects foo,bar` as a stray argument
- **AND** prints the standard `commander-update-deep-patch takes no arguments; ignoring: --projects foo,bar` line
- **AND** continues into the orchestrator with no project filter applied
