---
name: writing-comments
description: Decide which code comments are worth writing, and write only those. Use before and while writing or editing comments in source code — implementing a feature, fixing a bug, refactoring — and whenever a user asks what deserves a comment or which comments are worth keeping. Use it even when comments are only implied by the task, in any programming language.
---

# writing-comments

Read `${CLAUDE_PLUGIN_ROOT}/skills/writing-comments/reference/policy.md` before writing the next comment — if the variable does not resolve, the file is `reference/policy.md` beside this one. That file carries the policy in full; this one says only when and how to apply it.

## Forward only

The policy governs every comment written from this invocation onward and stays in force for the rest of the session — including comments added to a file that was already edited earlier in it.

It reaches forward and no further. Comments already written stay as they are, this session's own included. Cleaning those up is `purge-comment-noise`, invoked separately.

An explicit user request for a specific comment overrides the policy for that comment. They asked; write it.

## Discovery pointer

The policy is worth reaching before the first comment of a task, not after the hundredth. A line in the user's global instructions gets it there. Check once per session whether one already exists:

```bash
grep -c 'writing-comments' ~/.claude/CLAUDE.md 2>/dev/null
```

**A count of 1 or more** — the pointer is in place. Say nothing and carry on.

**A count of 0, or no such file** — propose appending exactly this line:

```markdown
- Before writing or editing code comments, use the `experiments:writing-comments` skill.
```

Ask once, with `AskUserQuestion` (add it / don't), at a natural pause — never mid-edit. When `~/.claude/CLAUDE.md` does not exist, the proposal is to create it holding that one line.

Append only once the user has agreed. On a decline, or on no answer, leave every file alone — `~/.claude/CLAUDE.md`, any repository `CLAUDE.md`, any `AGENTS.md`. Applying the policy never waits on this question and continues for the rest of the session either way; the proposal is offered once and never repeated after a decline.

## See also

- `purge-comment-noise` — applies the same `reference/policy.md` to comments already written, scoped to a branch's diff.
- `/experiments:purge-comments` — the explicit entry point to that purge.
