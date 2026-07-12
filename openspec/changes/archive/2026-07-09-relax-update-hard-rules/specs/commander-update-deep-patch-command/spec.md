## MODIFIED Requirements

### Requirement: Hard rules inherited from the orchestrator and `npm-update-deep-patch`

The command SHALL inherit and preserve every hard rule from `commander-update-orchestrator` (deep mode) and `npm-update-deep-patch`. The command SHALL NOT:

- Create commits, push, or open pull requests autonomously (branch/worktree isolation via `update-isolation` is permitted); it stops for human-in-the-loop review before any such outward/VCS action.
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
