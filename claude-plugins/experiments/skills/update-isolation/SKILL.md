---
name: update-isolation
description: Use when an npm update command (`/experiments:npm-update-{major,minor,patch}`, their deep variants, or the `commander-update-orchestrator`) wants to apply bumps in an isolated branch/worktree instead of the current checkout. Resolves a strategy (auto → worktrunk → plain git worktree → in-place branch → ask → none) and creates the branch/worktree BEFORE apply runs, returning the working directory the caller hands to `apply-npm-updates`. Branch/worktree creation only — NEVER commits, pushes, or opens a PR. Opt-in; the default `none` is byte-equivalent to today's in-place behavior.
---

# update-isolation

Resolve and create an isolated workspace for an update **before** any manifest is bumped, then return the directory the caller uses as `cwd` for `apply-npm-updates`. This is the single source of truth for the family's branch/worktree isolation step.

The contract refinement this skill enables: the update family no longer forbids branches. It now forbids **commits, pushes, and PRs** only — branch/worktree creation is allowed (it is the manual step users kept doing by hand). This skill performs that step and nothing more.

## When to use

- A single-project command (`/experiments:npm-update-major` and siblings) offers an opt-in isolation gate, then calls this skill once for the whole update set.
- `/experiments:npm-update-deep-major` calls this skill **once per bucket** (worktree-preferred) so each `partition-breaking-changes` bucket lands in its own worktree.
- The `commander-update-orchestrator` (deep major, cross-project) calls this skill **once per project** (v1 cap — per-(project,bucket) is deferred).

This skill is implemented entirely with Claude Code built-in tools (`Bash`, `Read`, `AskUserQuestion`). It introduces no new runtime dependency.

## Inputs

| Field         | Type     | Required | Notes                                                                                                                                                                             |
| ------------- | -------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `projectPath` | `string` | yes      | Absolute path to the project root (the repo the caller would otherwise bump in place).                                                                                            |
| `branchName`  | `string` | yes      | The branch name to create (e.g. `deps/major-2026-06-07`, `deps/major-react`). The caller derives a meaningful slug; this skill does not invent one.                               |
| `strategy`    | `string` | no       | One of `auto` \| `worktrunk` \| `worktree` \| `branch` \| `ask` \| `none`. Default for an **opted-in** run is `auto`. The family default when the user does NOT opt in is `none`. |

## Output

Return exactly:

```ts
{
  mode: "worktrunk" | "worktree" | "branch" | "none",
  branchName: string,   // the branch actually created (or echoed back); for `none`, the caller's branchName unused
  workdir: string,      // absolute dir the caller passes as `cwd` to `apply-npm-updates`
  installAlreadyRan?: boolean   // true only when a worktrunk post-start hook already ran <pm> install in the new worktree
}
```

## Strategy resolution

### `none` (family default for non-opted-in runs)

Perform **no** VCS action. Return `{ mode: "none", branchName, workdir: projectPath }`. The caller applies in the current tree — byte-equivalent to today's behavior. This is why isolation is purely additive: a command that never opts in behaves exactly as before.

### `auto` (default for an opted-in run)

1. **Probe worktrunk.** Worktrunk is usable when `command -v wt` succeeds AND `projectPath` is a git repository worktrunk can operate on (running `wt -C "<projectPath>" list` exits zero). If usable → take the **worktrunk** path below.
2. **Else** → take the plain **worktree** path below.

### `worktrunk`

Force the worktrunk path. Create a worktree + branch in one step:

```bash
wt -C "<projectPath>" switch --create "<branchName>" --no-cd --yes
```

- `--no-cd` keeps the caller's process in its current directory (the worktree is created but we do not switch into it; the caller drives apply via an absolute `cwd`).
- `--yes` skips approval prompts (the caller already gated on the isolation choice).

Resolve the new worktree's absolute path from `wt -C "<projectPath>" list` (match the row whose branch is `<branchName>`). Set `workdir` to that path, `mode: "worktrunk"`.

If `wt` is **not** usable (probe fails), surface a one-line note `worktrunk unavailable (<reason>); falling back to plain git worktree.` and take the **worktree** path instead. Never hard-fail the update on a worktrunk problem.

### `worktree`

Plain git worktree, no worktrunk. Create a sibling worktree + branch:

```bash
git -C "<projectPath>" worktree add -b "<branchName>" "<siblingPath>"
```

- `<siblingPath>` is a sibling of `projectPath` derived from `branchName` (e.g. `<parentOf(projectPath)>/<basename(projectPath)>.<sanitized-branchName>`), chosen so it does not collide with an existing path. If it exists, append a numeric suffix.
- Set `workdir` to `<siblingPath>`, `mode: "worktree"`.

### `branch`

In-place branch, no worktree:

```bash
git -C "<projectPath>" switch -c "<branchName>"
```

Set `workdir: projectPath`, `mode: "branch"`. NOTE: this is the only mode that changes the current checkout. The caller applies in place on the new branch.

### `ask`

Raise exactly one `AskUserQuestion`:

- **Question**: `How should this update be isolated before applying?`
- **Multi-select**: `false`
- **Options**:
    - `worktree (worktrunk)` — create a worktree + branch via worktrunk (current checkout untouched). Equivalent to forcing `worktrunk`.
    - `worktree (plain)` — create a worktree + branch via `git worktree` (current checkout untouched). Equivalent to forcing `worktree`.
    - `direct branch` — `git switch -c` in the current tree. Equivalent to forcing `branch`.
    - `none` — apply in the current tree, no VCS action. Equivalent to forcing `none`.

Dispatch to the matching path above based on the choice.

## Worktree modes leave the current checkout untouched

For `worktrunk` and `worktree` modes, the repository's currently checked-out branch in `projectPath` SHALL remain exactly as it was — the new branch lives only in the new worktree. This is why worktree is preferred: it isolates the update without disturbing the user's working state.

## worktrunk hook / install interaction

Worktrunk may run `post-start` hooks when a worktree is created (e.g. a configured `<pm> install`). When the worktrunk path is taken AND a `post-start` hook has already run an install in the new worktree, the skill SHALL set `installAlreadyRan: true` in the return value so the caller can pass `skipInstall: true` to the subsequent `apply-npm-updates` invocation and avoid a redundant install. Detect this from `wt`'s verbose output / the configured hooks (`wt config` shows configured hooks); when unsure, default `installAlreadyRan: false` (a redundant install is safe, just slower).

## Hard rules

- SHALL create at most a **branch and/or worktree**. SHALL NOT run `git commit`. SHALL NOT run `git push`. SHALL NOT run `gh pr create` or any other PR-creation command.
- SHALL NOT run tests, lint, or build.
- SHALL NOT bump any manifest or run any install itself — that is `apply-npm-updates`'s job, invoked by the caller with the returned `workdir`.
- `none` mode SHALL touch no VCS state at all.
- On any worktrunk failure, degrade gracefully (worktrunk → plain worktree; if even plain worktree fails, surface the error and return `{ mode: "none", workdir: projectPath }` with a note so the caller can apply in place rather than aborting the whole update).

## See also

- `apply-npm-updates` — the VCS-free apply mechanism; runs in the `workdir` this skill returns.
- `partition-breaking-changes` — produces the buckets; `/experiments:npm-update-deep-major` calls this skill once per bucket with the bucket's `suggestedBranch`.
- `worktrunk:worktrunk` — guidance for the `wt` CLI this skill prefers.
