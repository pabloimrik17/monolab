---
description: Persist applied or pre-existing run directories into the run knowledge base — the manual seeding tool for runs already on disk
argument-hint: [<run-dir>...] [--synthetic]
---

# knowledge-persist

Persists one or more run directories into the run knowledge base by delegating to the `persist-run-knowledge` skill. `npm-update-deep-orchestrator` and `commander-update-orchestrator` invoke that skill directly at the end of a live run; this command is the human entry point for a kept or pre-existing run directory, and the seeding tool for runs that predate the knowledge base entirely.

## Invocation

```text
/experiments:knowledge-persist [<run-dir>...] [--synthetic]
```

Parse `$ARGUMENTS`: any token equal to `--synthetic` sets the synthetic flag for the whole invocation. Every other token is a run-directory path, in the order given.

## Step 1 — validate explicit paths

Skip to Step 2 when no run directory was passed.

For each `<run-dir>` passed:

1. Print `Refused: <run-dir> — does not exist` when the path is missing, or `Refused: <run-dir> — no _meta.json (not a run directory)` when it exists but has no `_meta.json`, and drop it — do not persist it.
2. Otherwise read its `_meta.json`. Print `Refused: <run-dir> — phase is "<phase>", not "done"` when `phase` isn't `"done"`, and drop it — do not persist it, and do not touch its `_meta.json`.

Carry the paths that passed both checks into Step 3, skipping Step 2.

Explicit paths are never checked against the knowledge base's `index.json` — re-persisting an already-persisted run is a deliberate, supported use of this command, guaranteed idempotent by `persist-run-knowledge`.

## Step 2 — default selection

Runs only when no run directory was passed explicitly.

1. Resolve the knowledge root:

    ```bash
    KNOWLEDGE_ROOT="${user_config.knowledge_root}" node -e "import('${CLAUDE_PLUGIN_ROOT}/scripts/lib/knowledge.mjs').then(m => process.stdout.write(m.resolveKnowledgeRoot()))"
    ```

2. Read `<root>/index.json` when it exists — an absent knowledge base means nothing has ever been persisted — and collect its `runs[].runId` into the persisted set.
3. List every directory under `~/.claude/experiments/plans/`. Read each `_meta.json`. Keep the ones where `phase == "done"` and `planDirName` is absent from the persisted set: this is the candidate set.
4. No candidates: print `No eligible runs: nothing is phase "done" and unpersisted under ~/.claude/experiments/plans/.` and stop — no prompt, no write.
5. Otherwise call `AskUserQuestion` once: `multiSelect: true`, one option per candidate labeled with its `planDirName` and described by its `level`, `mode` and `createdAt`, and a question worded so every candidate is selected by default (for example, "Persist which runs? (all selected by default)"). Carry only the runs the user confirms into Step 3.

## Step 3 — persist sequentially

For each selected run, in order: invoke `persist-run-knowledge` (via the `Skill` tool) once, passing `runDir` and, when `--synthetic` was set, `synthetic: true`. Omit `outcome` — the skill's own script reconstructs one for a run directory with no `outcome.json` of its own, which is exactly this command's use case. Never invoke it for a second run before the first returns.

Surface the one line each invocation returns, verbatim (`Knowledge: persisted …` or `Knowledge: not persisted (<reason>)`), then move to the next run — one run's failure never stops the rest.

## Step 4 — summarize

Print one final line: `Persisted <p>/<n> selected run(s).` — `<n>` is how many runs Step 3 attempted, `<p>` is how many returned a `persisted` digest rather than a `not persisted` one.

## Hard rules

- Delegate the copy, subagent, validation and index steps to `persist-run-knowledge`; never restate them here.
- Invoke `persist-run-knowledge` for one run at a time, never concurrently.
- Print only the skill's one-line digests and this command's own control lines — never a note body, a hub body or research content.
- Never create a commit, a branch or a pull request.
- Never modify a project file, and never read or write `~/.claude/commander/projects.json`.
- Never alter a run directory's `_meta.json`, on refusal or on persist.

## See also

- `persist-run-knowledge` — the skill this command delegates to; owns the copy/subagent/validate/index pipeline and every template.
- `/experiments:knowledge-recall` — the read side.
