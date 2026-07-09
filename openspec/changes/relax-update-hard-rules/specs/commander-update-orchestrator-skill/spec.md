## MODIFIED Requirements

### Requirement: Hard rules

The skill SHALL preserve every hard rule of `/experiments:npm-update-patch`:

- Running read-only verification (lint, typecheck, or build) is permitted and is never a hard-rule violation; the skill performs none automatically by default, so a plain run stays behaviorally unchanged. The binding restriction is the commit/push/PR review gate below.
- The skill SHALL NOT create commits, push, or open pull requests autonomously in any project; it stops for human-in-the-loop review before any such outward/VCS action (opt-in isolation branch/worktree creation via `update-isolation` is permitted).
- The skill SHALL NOT modify any file outside the per-project manifests it bumps; in particular, the user-scoped registry `<HOME>/.claude/commander/projects.json` SHALL remain byte-identical before and after the run.
- The skill SHALL NOT mutate any consumer `package.json` entry that is a `catalog:` reference — only `pnpm-workspace.yaml` for those.
- The skill SHALL NOT auto-execute an override command without the user selecting `run-override` for that entry.
- The skill SHALL NOT run `ncu --upgrade` as a fallback after an override command fails (mirrors `npm-update-patch`).

#### Scenario: Registry unchanged

- **WHEN** the skill completes any run (success, partial, cancel)
- **THEN** `<HOME>/.claude/commander/projects.json` SHALL be byte-identical before and after the run (verifiable by `shasum`)

#### Scenario: No autonomous commit/push/PR

- **WHEN** the skill completes apply across multiple projects
- **THEN** no `git commit`, `git push`, or pull-request-creation command has been invoked by the skill in any project
