## ADDED Requirements

### Requirement: Skill location and VCS-safe contract

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/update-isolation/SKILL.md` with frontmatter declaring a non-empty `description`. The skill resolves and creates an isolated workspace (branch and/or worktree) for an update before manifests are bumped, and returns the working directory the caller hands to `npm-update-apply`. The skill SHALL create a branch and/or worktree only; it SHALL NOT create commits, SHALL NOT push, and SHALL NOT open a pull request.

#### Scenario: Skill file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `update-isolation/` with `SKILL.md` SHALL exist with a non-empty `description`

#### Scenario: No commit, push, or PR is ever performed

- **WHEN** any isolation strategy runs to completion
- **THEN** the skill has created at most a branch and/or worktree, and has run no `git commit`, no `git push`, and no `gh pr` / PR-creation command

### Requirement: Strategy input and resolution order

The skill SHALL accept an input `{ projectPath, branchName, strategy }` where `strategy` is one of `auto` | `worktrunk` | `worktree` | `branch` | `ask` | `none` (default for an opted-in run: `auto`). Resolution:

- `auto` — if worktrunk is usable (a `wt` runner is on `PATH` and the repository is registrable), create a worktree + branch via worktrunk; otherwise create a plain `git worktree add -b <branchName> <siblingPath>`.
- `worktrunk` — force the worktrunk path; if unavailable, surface a note and fall back to plain `git worktree`.
- `worktree` — plain `git worktree add -b <branchName> <siblingPath>` (no worktrunk).
- `branch` — `git switch -c <branchName>` in the current working tree (no worktree).
- `ask` — raise an `AskUserQuestion` offering: worktree (worktrunk) / worktree (plain) / direct branch / none.
- `none` — perform no VCS action; the caller applies in the current tree (today's behavior).

The skill SHALL return `{ mode, branchName, workdir }`, where `workdir` is the directory the caller uses as `cwd` for `npm-update-apply`. Worktree and `worktrunk` modes SHALL leave the user's currently checked-out branch untouched.

#### Scenario: auto prefers worktrunk when available

- **WHEN** `strategy: "auto"` and `wt` is on `PATH` with a usable repo
- **THEN** the skill creates the worktree + branch via worktrunk and returns its `workdir`

#### Scenario: auto falls back to plain worktree

- **WHEN** `strategy: "auto"` and worktrunk is not available
- **THEN** the skill creates a plain `git worktree add -b <branchName>` and returns its `workdir`

#### Scenario: none performs no VCS action

- **WHEN** `strategy: "none"` (the global default for non-opted-in runs)
- **THEN** the skill returns `{ mode: "none", workdir: <projectPath> }` and creates no branch or worktree

#### Scenario: worktree leaves the current checkout intact

- **WHEN** a worktree strategy creates the isolated workspace
- **THEN** the repository's currently checked-out branch in `projectPath` is unchanged

### Requirement: worktrunk hook / install interaction

When isolation creates the workspace via worktrunk and a worktrunk `post-start` hook has already run an install in the new worktree, the skill SHALL report that an install already ran so the caller can set `skipInstall` on the subsequent `npm-update-apply` invocation and avoid a redundant install.

#### Scenario: install not duplicated after a worktrunk hook installed

- **WHEN** worktrunk's `post-start` hook ran `<pm> install` in the new worktree
- **THEN** the skill signals install-already-ran, and the caller invokes `npm-update-apply` with `skipInstall: true`
