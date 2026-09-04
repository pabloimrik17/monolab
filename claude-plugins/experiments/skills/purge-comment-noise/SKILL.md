---
name: purge-comment-noise
description: Delete narrative comment noise from a branch's changed lines and tighten the comments worth keeping. Use whenever a user asks to strip, purge, remove, or clean up comments, comment noise, over-commenting, or redundant comments, or objects to comment noise or narration in a diff — and autonomously once an implementation is finished and `git diff --stat` against the base branch reports 5 or more changed files or 150 or more added lines. Measure the scope with `git diff --stat` rather than judging "extensive" by feel.
---

# purge-comment-noise

Read `${CLAUDE_PLUGIN_ROOT}/skills/writing-comments/reference/policy.md` first — if the variable does not resolve, the file is `../writing-comments/reference/policy.md` beside this one. It decides which comments go and which stay. This file decides what is in scope, who does the work, and what gets reported.

Invoked explicitly — by the user, or through `/experiments:purge-comments` — the skill runs at any size. The 5-files-or-150-lines threshold in the description governs autonomous triggering only.

When the trigger fired autonomously rather than by request, state the scope in one line before the first edit — `Purging comment noise across N files / M added lines`. Nobody asked, so the first notice should not be the table at the end. Explicit invocation skips the notice.

## 1. Resolve the scope

An argument, when given, overrides the default:

- A **git ref** (`HEAD~3`, a tag, a branch name) becomes the scope base.
- One or more **paths** restrict the run to them.

With no argument the base is the merge-base with the branch's base branch — the first ref that resolves:

```bash
for ref in origin/develop develop origin/main main origin/master master; do
  git rev-parse --verify -q "$ref" >/dev/null && BASE=$(git merge-base "$ref" HEAD) && break
done
git diff --numstat "$BASE"
git ls-files --others --exclude-standard
```

Under a path override, append `-- path1 path2` to both commands; with no override, leave the clause off entirely.

Diffing against that base with no `HEAD` on the right covers the branch's commits **and** the uncommitted working tree in one pass. Untracked files count as wholly added — include them.

Two cases the loop can land in:

- **`$BASE` resolves to `HEAD`** — the checkout _is_ the base branch, so the scope is the uncommitted working tree alone. Proceed, and say so in the report.
- **No ref resolves** — stop and ask for an explicit ref rather than guessing one.

Keep the per-file **added**-line counts from `--numstat` (its first column). Added lines are the unit for every threshold here. `git diff --stat` answers the description's trigger from its summary line, but its per-file column merges insertions with deletions — hence `--numstat` for the routing in step 3, once step 2 has cut the list down.

## 2. Filter the file list

**Processed:** `.ts`, `.tsx`, `.mts`, `.cts`, `.js`, `.jsx`, `.mjs`, `.cjs`, `.vue`, `.svelte`. Test files are processed like any other source file.

**Skipped:** everything else — Markdown, YAML, JSON, shell scripts and every other non-code file; generated output (`*.gen.*`, `dist/`, `build/`, any file carrying a `@generated` marker in its first 5 lines); database migrations; test snapshots (`__snapshots__/`, `*.snap`); `node_modules`. Prevention through `writing-comments` covers every programming language; this purge covers the JS/TS family only.

The description's threshold is measured on the raw diff, before this filter, so a documentation branch can clear it with nothing to process. When the run was triggered autonomously and the filtered list comes out empty, stop here silently — no report.

## 3. Route the work

Route on the **filtered** list from step 2 — its file count and its added-line total, not the raw diff's. A scope of two hundred Markdown files and two TypeScript files is a two-file job.

| Scope                                              | Route                                                                    |
| -------------------------------------------------- | ------------------------------------------------------------------------ |
| 8 files or fewer **and** 400 added lines or fewer  | Process in line. Spawning agents for six files costs more than it saves. |
| More than 8 files **or** more than 400 added lines | Distribute: teammates first, subagents where teammates are unavailable.  |

Teammates count as available when the session already has a team; otherwise use subagents. Batch 4 to 8 files per agent, at most 6 agents; whatever is left over stays with the orchestrator.

Split by whole file — every file goes to exactly one agent, entire. An agent holding half a file cannot tell whether a comment is redundant with the code it cannot see.

Resolve `${CLAUDE_PLUGIN_ROOT}` to an absolute path before briefing anyone; a subagent's environment may not have it set, and an agent that cannot read the policy edits code with no rules at all. Each agent receives:

- its file list and the scope base,
- the **absolute** path to `policy.md`,
- the **absolute** path to this `SKILL.md`, with an instruction to read step 4 — an agent that has the policy but not the procedure will happily rewrite pre-existing comments outside the diff,
- the return contract below, verbatim.

Each agent then runs step 4 and returns:

- a per-file count of deletions and edits, and
- at most 5 cases it judged doubtful, named by file and line.

Counts and doubtful cases are the whole return. No comment bodies, no file contents — routing file contents back through the orchestrator is exactly what the fan-out exists to avoid.

## 4. Per-file procedure

Run by whoever holds the file — this session in line, or each agent on its assignment.

```bash
git diff -U0 "$BASE" -- <file>
```

The hunk headers give the lines the branch added or modified. **Only comments on those lines are candidates.** A comment the diff did not touch stays exactly as it is, however much it looks like noise — it belongs to some earlier change, not this one.

An untracked file has no diff and this command prints nothing for it. Every line in it is added: read it whole and treat all of it as candidate lines.

Four mechanics that decide whether an edit is safe:

- **Paths the diff deleted** are in the file list and cannot be opened. Skip them.
- **A trailing comment** — `foo(); // narration` — is stripped from its line. Deleting the line deletes code.
- **A block comment with only some of its lines touched** counts as a candidate whole. Half a comment is not a comment.
- **Work the file bottom-up.** Editing from the top renumbers everything below it and the hunk line numbers go stale mid-pass.

Apply the policy to each candidate:

- Deletions and rewrites land in the file directly. No per-comment approval, no staged diff for review; `git` already holds the previous state.
- A retained comment that spends several verbose sentences on its reason is tightened to the policy's bar, keeping the information and dropping the narration.
- A comment the user explicitly asked for this session is retained. When a candidate reads as deliberately human-authored and the call is close, flag it doubtful and leave it.

## 5. Report

When nothing was deleted or edited, say so in one line and stop.

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
