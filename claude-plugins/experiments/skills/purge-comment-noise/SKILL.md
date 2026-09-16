---
name: purge-comment-noise
description: Delete narrative comment noise from a branch's changed lines and tighten the comments worth keeping. Use whenever a user asks to strip, purge, remove, or clean up comments, comment noise, over-commenting, or redundant comments, or objects to comment noise or narration in a diff — and autonomously once an implementation is finished and the branch's changes against its base, untracked files included, reach 5 or more files or 150 or more added lines. Measure the scope with `git diff --stat` plus the untracked files rather than judging "extensive" by feel.
---

# purge-comment-noise

Read `${CLAUDE_PLUGIN_ROOT}/skills/writing-comments/reference/policy.md` first — if the variable does not resolve, the file is `../writing-comments/reference/policy.md`, in the sibling skill's directory. It decides which comments go and which stay. This file decides what is in scope, who does the work, and what gets reported.

Invoked explicitly — by the user, or through `/experiments:purge-comments` — the skill runs at any size. The 5-files-or-150-lines threshold in the description governs autonomous triggering only.

## 1. Resolve the scope

An argument, when given, overrides the default. Decide which kind it is before anything else: it is a **git ref** when `git rev-parse --verify -q "<arg>"` succeeds, and **paths** when that fails.

- A **git ref** (`HEAD~3`, a tag, a branch name) moves the base to `git merge-base <ref> HEAD` — the merge-base, not the ref itself; for a sibling branch the two differ, and the ref itself would drag that branch's own commits into scope.
- One or more **paths** restrict the run to them.

With no argument the base is the merge-base with the branch's base branch — the first ref that resolves:

```bash
ROOT=$(git rev-parse --show-toplevel) || exit 1
HEAD_SHA=$(git rev-parse HEAD) || exit 1
for ref in origin/develop develop origin/main main origin/master master; do
  git rev-parse --verify -q "$ref" >/dev/null && BASE=$(git merge-base "$ref" HEAD) && break
done
[ -n "$BASE" ] || { echo 'No base ref resolved — ask for an explicit ref'; exit 1; }
echo "BASE=$BASE HEAD=$HEAD_SHA"
[ "$BASE" = "$HEAD_SHA" ] && echo 'SCOPE=working-tree-only'
git -C "$ROOT" diff --numstat "$BASE"
git -C "$ROOT" ls-files --others --exclude-standard -z |
  while IFS= read -r -d '' f; do
    printf '%s\t0\t%s\n' "$(awk 'END { print NR }' "$ROOT/$f")" "$f"
  done
```

`BASE` dies with that shell. The `echo` prints the resolved sha — take it from the output and substitute it **literally** wherever `$BASE` appears below, in step 4 and in every agent briefing. Step 4 runs in a later shell, and a fan-out agent's in another process entirely; there the name expands to nothing and the diff silently degrades to index-vs-worktree, dropping every committed change out of scope without erroring. A ref override skips the candidate-ref ladder only, not the snippet: resolve the base once with `git merge-base <ref> HEAD`, carry that sha the same way, and still run the `SCOPE` comparison and both listing commands.

Both commands run from the repository root, so every path they print is root-relative and no untracked file outside the current directory is missed. The untracked rows are printed in `--numstat` shape — added, deleted, path — with a deleted count of `0`, so both lists are read by the same columns.

Untracked files are listed in every scope mode: under the default and under a ref override alike, since a ref override moves only the base; under a path override, narrowed by the same pathspec.

Path overrides arrive as the user typed them, relative to the current directory rather than to the root — passed straight through to a root-run command they match nothing, and the scope comes out empty in silence. Rewrite each one first: `PREFIX=$(git rev-parse --show-prefix)` gives the current directory's path from the root; prepend it to every relative override and strip a leading `$ROOT/` from an absolute one. Append the rewritten paths as `-- path1 path2` to the `git diff` and `git ls-files` commands; with no override, leave the clause off entirely.

Diffing against that base with no `HEAD` on the right covers the branch's commits **and** the uncommitted working tree in one pass. Untracked files count as wholly added — the loop above gives each one its added-line count, so it weighs the same as a diffed file at every threshold below.

Two cases the loop can land in:

- **`BASE` equals `HEAD`** — the shas match and the snippet prints `SCOPE=working-tree-only`. The checkout _is_ the base branch, so the scope is the uncommitted working tree alone. Proceed, and say so in the report (step 5).
- **No ref resolves** — the guard stops the snippet. Ask for an explicit ref rather than guessing one.

Keep the per-file **added**-line counts from `--numstat` (its first column). Added lines are the unit for every threshold here. `git diff --stat` answers the description's trigger from its summary line — add the untracked files and their counts to it, since the diff cannot see them — but its per-file column merges insertions with deletions; hence `--numstat` for the routing in step 3, once step 2 has cut the list down.

## 2. Filter the file list

**Processed:** `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte`. Test files are processed like any other source file.

**Skipped:** everything else — Markdown, YAML, JSON, shell scripts and every other non-code file; generated output (`*.gen.*`, `dist/`, `build/`, any file carrying a `@generated` marker in its first 5 lines); database migrations; test snapshots (`__snapshots__/`, `*.snap`); `node_modules`. Prevention through `writing-comments` covers every programming language; this purge covers the JS/TS family only.

The description's threshold is measured on the raw diff, before this filter, so a documentation branch can clear it with nothing to process. When the run was triggered autonomously and the filtered list comes out empty, stop here silently — no report, no announcement.

When the run was triggered autonomously and the filtered list is not empty, state the scope in one line before the first edit — `Purging comment noise across N files / M added lines`, N and M being the **filtered** counts, not the raw diff's. Nobody asked, so the first notice should not be the table at the end. Explicit invocation skips the notice.

## 3. Route the work

Route on the **filtered** list from step 2 — its file count and its added-line total, not the raw diff's. A scope of two hundred Markdown files and two TypeScript files is a two-file job.

| Scope                                              | Route                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| 8 files or fewer **and** 400 added lines or fewer  | Process in line. Spawning agents for six files costs more than it saves. |
| More than 8 files **or** more than 400 added lines | Distribute: teammates first, subagents where teammates are unavailable.  |

Teammates count as available when the session already has a team; otherwise use subagents. Batch 4 to 8 files per agent — fewer when too few files are left to fill a batch, since the fan-out also fires on added lines alone — at most 6 agents in flight at once; dispatch a further wave as agents return, until every filtered file has been assigned. Nothing is left over — on this route the orchestrator opens no file itself.

Split by whole file — every file goes to exactly one agent, entire. An agent holding half a file cannot tell whether a comment is redundant with the code it cannot see.

Resolve `${CLAUDE_PLUGIN_ROOT}` to an absolute path before briefing anyone; a subagent's environment may not have it set, and an agent that cannot read the policy edits code with no rules at all. Each agent receives:

- its file list, the absolute repository root, and the scope base as the **literal sha** echoed in step 1 — never the name `$BASE`, which expands to nothing in the agent's own shell,
- the **absolute** path to `policy.md`,
- the **absolute** path to this `SKILL.md`, with an instruction to read step 4 — an agent that has the policy but not the procedure will happily rewrite pre-existing comments outside the diff,
- any comments the user explicitly asked for this session, quoted or located by file and line, since the policy retains those — say there were none when there were none, so the agent does not go looking,
- the return contract below, verbatim.

Each agent then runs step 4 and returns:

- a per-file count of deletions and edits,
- every `TODO` or `FIXME` it deleted for carrying no issue reference — file, line, and a short paraphrase of what it asked for, never the comment verbatim, and
- at most 5 cases it judged doubtful, named by file and line.

Counts, deleted-`TODO` metadata and doubtful cases are the whole return. No comment bodies, no file contents — routing file contents back through the orchestrator is exactly what the fan-out exists to avoid.

## 4. Per-file procedure

Run by whoever holds the file — this session in line, or each agent on its assignment.

```bash
git -C <repo-root> diff -U0 <base-sha> -- <file>
```

`<base-sha>` is the literal sha from step 1, and `<file>` the root-relative path from its file list; the `-C` makes both resolve from wherever this runs. The hunk headers give the lines the branch added or modified. **Only comments on those lines are candidates.** A comment the diff did not touch stays exactly as it is, however much it looks like noise — it belongs to some earlier change, not this one.

An untracked file has no diff and this command prints nothing for it. Every line in it is added: read it whole and treat all of it as candidate lines.

Four mechanics that decide whether an edit is safe:

- **Paths the diff deleted** are in the file list and cannot be opened. Skip them.
- **A trailing comment** — `foo(); // narration` — is stripped from its line. Deleting the line deletes code.
- **A block comment with only some of its lines touched** counts as a candidate whole. Half a comment is not a comment.
- **Work the file bottom-up.** Editing from the top renumbers everything below it and the hunk line numbers go stale mid-pass.

Apply the policy to each candidate:

- Deletions and rewrites land in the file directly. No per-comment approval, no staged diff for review; `git` already holds the previous state.
- A retained comment that spends several verbose sentences on its reason is tightened to the policy's bar, keeping the information and dropping the narration.
- When a candidate reads as deliberately human-authored and the call is close, flag it doubtful and leave it.

## 5. Report

When step 1 printed `SCOPE=working-tree-only`, state in the report that the scope was the uncommitted working tree alone, no committed change in it. That line is owed in every report the skill produces, on the nothing-deleted branch below exactly as the **Doubtful** section is.

When nothing was deleted or edited, say so in one line, follow it with the working-tree-only line when it is owed and with the **Doubtful — left as-is** section when any cases were flagged, and stop — no table, no `TODO` list, no gate recommendation. (An autonomous run whose filtered list came out empty stopped back in step 2 and reports nothing at all.)

Otherwise a table, quoting nothing that was removed:

| File         | Deleted | Edited |
| ------------ | ------: | -----: |
| `src/foo.ts` |       4 |      1 |

When any were flagged, list them under **Doubtful — left as-is**: file, line, and a one-line reason. The in-line path reports its own the same way.

Then, when any were removed, list every `TODO` or `FIXME` deleted for carrying no issue reference — file, line, and a short paraphrase of what it asked for, never the comment verbatim — and note that these could be filed as tracker issues. File none of them; that is the user's call.

Close with the gate recommendation. This skill runs no typecheck, no lint, no tests and no build, and blocks on nothing. Recommend running the repository's own gates before committing, over the whole working tree — the purge's edits and whatever source changes were already uncommitted when it started.

## See also

- `writing-comments` — owns `reference/policy.md`, the rules this skill applies, and keeps the noise out of the diff in the first place.
- `/experiments:purge-comments` — the explicit entry point to this skill, with an optional ref or path scope.
