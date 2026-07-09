## MODIFIED Requirements

### Requirement: Skill location and VCS-safe contract

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/apply-engine-bumps/SKILL.md` with frontmatter declaring a non-empty `description`. Given the inventory from `detect-toolchain-surfaces` and a resolved per-engine target, the skill rewrites the project's `runtime` version loci to the target and returns a structured result fragment. The skill SHALL run in the working directory handed to it (branch/worktree isolation, if any, is a separate `update-isolation` pre-step); it SHALL NOT create commits, push, open PRs, or run `ncu`, and it stops for human-in-the-loop review before any such outward/VCS action. Running read-only verification (lint, typecheck, or build) is permitted but never performed automatically by default. It is the engines-level analog of `apply-npm-updates` (`npm-update-apply`).

#### Scenario: Skill file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `apply-engine-bumps/` with `SKILL.md` SHALL exist with a non-empty `description`

#### Scenario: No commit, push, or PR

- **WHEN** the skill applies bumps to completion
- **THEN** it has run no `git commit`, no `git push`, and no `gh pr` / PR-creation command
