---
name: recall-run-knowledge
description: Finds what earlier update runs already concluded about the packages a new run is about to research, so research already paid for is reused rather than repeated. Use this whenever a deep update run has grouped its packages and is about to dispatch research — Step 3.5 of the `/experiments:npm-update-deep-*` family, Step 6.5.3b of `commander-update-orchestrator` — and whenever someone about to start an update sweep wonders whether an earlier run already covered these versions or whether they are about to pay to research the same packages twice. Needs the run's emitted `groups[]`; for an ad-hoc question about one package outside a run, `/experiments:knowledge-recall` is the entry point instead. Classifies every scanned `pkg (from → to)` against the persisted run knowledge base and hands the result to `parallel-research-workflow` as its optional `priorKnowledge` input. Read-only, and a one-line no-op when no base exists.
---

# recall-run-knowledge

Ask the knowledge base what earlier applied runs already concluded about the packages this run is about to research, and hand the answer to `parallel-research-workflow` as `priorKnowledge`. Reusing research already paid for is the whole point: a hit can turn a research subagent into a copy, narrow it to a range delta, or contribute applicability alone.

Classification is the matcher's job, not this skill's. `reference/match-classes.md` holds the class conditions, the exclusions, the preference order, the `delta` definition and the version-only staleness rule; `reference/prompt-block.md` holds the block those hits are rendered into downstream. Read them before naming a class — under `${CLAUDE_PLUGIN_ROOT}/skills/recall-run-knowledge/reference/`, or in the `reference/` directory beside this file when the variable does not resolve.

## When it runs, and on what

After grouping, before the workflow dispatch, in both deep families:

- **Single-project** (`/experiments:npm-update-deep-patch` and its `minor` / `major` / `engines` siblings): Step 3.5, between Step 3 (`group-packages-for-research`) and Step 4 (the workflow dispatch).
- **Cross-project** (`commander-update-orchestrator`, deep mode): Step 6.5.3b, between 6.5.2 (grouping) and 6.5.4 (the workflow invocation), over the deduplicated update set.

That placement is mechanical, not stylistic. `related` is keyed on `bucketKey`, which only exists once grouping has emitted it, and `priorKnowledge` reaches the research subagents through the workflow's own prompt template — never around it.

## Inputs

| Input    | Required | Notes                                                                                                   |
| -------- | -------- | ------------------------------------------------------------------------------------------------------- |
| `groups` | yes      | The emitted `groups[]`, each carrying `groupId`, `bucketKey` and `packages[]` with `name`, `from`, `to` |
| `level`  | yes      | The run's level                                                                                         |
| `mode`   | yes      | `single-project` or `cross-project`                                                                     |

Without `groups[]` there is nothing to classify and no `bucketKey` to resolve `related` against, so this skill has no ad-hoc form: a question about one package outside a run belongs to `/experiments:knowledge-recall`.

Take the groups as given: grouping is already done, the workspace is already scanned, and group membership is final. A package that matches stays in its group with its `from` and `to` untouched, still fetches its changelog in phase 1, and still appears in the bump set. Recall changes what a subagent researches, never what the run is made of.

## Procedure

### 1. Match

Pipe the emitted `groups[]` into the matcher:

```bash
printf '%s' '<the emitted groups object, as one-line JSON>' \
  | KNOWLEDGE_ROOT="${user_config.knowledge_root}" node ${CLAUDE_PLUGIN_ROOT}/scripts/match-knowledge.mjs --groups -
```

Substitute the `groups[]` the run already holds, verbatim. `KNOWLEDGE_ROOT` carries the configured `knowledge_root` unexpanded and unvalidated — `lib/knowledge.mjs` owns the default, the `~` expansion and the relative-path error. If `${CLAUDE_PLUGIN_ROOT}` does not resolve, the script is `scripts/match-knowledge.mjs` at the plugin root.

`--groups -` reads the groups from stdin, so recall creates no file anywhere. Leave `--root` unset: the matcher resolves the knowledge root itself through `lib/knowledge.mjs`, the one definition of that rule, and returns the resolved absolute `root` in its output. Then it rebuilds `index.json` (cheap), restoring a missing cache from durable notes and hubs, and classifies.

The matcher owns every rule in `reference/match-classes.md`, so its hits are the verdict: take them as they come, in the order they come.

### 2. No base, no run change

When the output carries `baseAbsent: true` — no root on disk — stop:

- Return `{ "hits": [] }`.
- Emit `Knowledge: no base at <root>`, with the `root` the matcher resolved.
- Hand the caller **no** `priorKnowledge`, so its dispatch step omits the input entirely.

That is the whole no-op. The prompts are the prompts of a run without this capability, and the dossier carries no `## Prior runs` section — today's run plus one digest line. The matcher settles the question; note bodies stay closed.

### 3. Return the object

This skill returns; the caller dispatches. `npm-update-deep-orchestrator` captures the result at Step 3.5 and invokes the workflow at Step 4, `commander-update-orchestrator` at 6.5.3b and 6.5.4 — dispatching from here would run the phase-1+2 fan-out twice.

`priorKnowledge` is the matcher's output object, passed through byte-for-byte: whatever the matcher printed is what the workflow receives, `root` included — the prompt block needs it to resolve the root-relative paths it hands a subagent.

When `hits[]` and `related[]` are both empty, return no `priorKnowledge` at all — an empty object would append empty blocks and an empty dossier section for nothing.

### 4. A failure never stops the run

When the matcher errors — non-zero exit, unparseable output, or output carrying an `error` field, which is how it reports a base it found but could not rebuild — return no `priorKnowledge` and report `Knowledge: recall failed (<reason>)`, `<reason>` being that `error` or the failure detail. The caller carries on to its workflow dispatch, exactly as it does when persistence fails.

Every failure reads the same way, the rebuild included. `Knowledge: no base at <root>` is reserved for a base that is missing; a base that could not be read is a real problem, and a digest that calls it "no base" hides it. That is why the two arrive as different fields: `baseAbsent` for the first, `error` for the second.

### 5. Report one line

```text
Knowledge: <e> exact, <o> overlap, <p> prior, <r> related of <n> packages
```

The counts are `summary.exact`, `summary.overlap`, `summary.prior`, `summary.related` and `summary.packages`. The orchestrator reproduces this line verbatim; it is the run's whole visible trace of recall.

A base that matched nothing still reports its counts here — `Knowledge: 0 exact, 0 overlap, 0 prior, 0 related of 7 packages`, not the absent-base line. `Knowledge: no base at <root>` says one thing only: there is no base to consult.

## Output

One JSON object with three top-level keys:

- `hits[]` — one entry per classified package: `name`, `from`, `to`, `groupId`, `class`, `runId`, `priorFrom`, `priorTo`, `delta`, `hubPath`, `anchor`, `notePath`, `level`, `mode`, `createdAt`. `hubPath` and `notePath` are relative to the knowledge root; `anchor` is the hub section heading text, e.g. `23.0.2 → 23.1.0`.
- `related[]` — one entry per context-only package: `name`, `groupId`, `bucketKey`, `hubs[]`.
- `summary` — `exact`, `overlap`, `prior`, `related`, and `packages`, the number of scanned packages considered.

Two matcher-set fields travel with it: `root`, the resolved absolute knowledge root, which the prompt block prints so root-relative paths resolve; and `baseAbsent`, true only when that root does not exist. A third, `error`, appears only when the base exists but could not be rebuilt — step 4's case.

`hits[]` and `related[]` are disjoint: a package lands in one or the other, never both.

## Hard rules

- **Recall writes nothing.** Run artefacts, workspace files, the commander registry and the changelog cache are all read-only to it. The one disk write it may cause is the matcher's index rebuild, inside the knowledge root, touching `index.json` alone — every run note and every package hub comes out unchanged.
- **The main window holds paths and one digest.** A hit gives the main a `hubPath` and a `notePath`, and there it stops: note bodies, hub sections and raw run artefacts are opened by a research subagent or by a script.
- **`priorKnowledge` is the only channel.** Prior text reaches a subagent through the workflow's prompt block, and that is the sole route — a side file, a message or an extra tool call would put unverified findings in front of a subagent with none of the labelling the block carries.
- **A failure degrades, it never aborts.** Recall is non-fatal, like persistence: every failure path ends in a digest line and a caller that dispatches with no `priorKnowledge`.

## See also

- `reference/match-classes.md` — the class conditions, exclusions, preference order, `delta` and staleness rule. The single copy; cited by the workflow, both orchestrators and `/experiments:knowledge-recall`.
- `reference/prompt-block.md` — the `## Prior knowledge (not verified for this project)` block and its four directive forms, plus the dossier's `## Prior runs` bullet.
- `${CLAUDE_PLUGIN_ROOT}/scripts/match-knowledge.mjs` — the classifier, and the only thing this skill runs. It resolves the root through `scripts/lib/knowledge.mjs`.
- `group-packages-for-research` — emits the `groups[]` this skill consumes, `bucketKey` included.
- `parallel-research-workflow` — consumes `priorKnowledge` and renders the prompt block and the dossier section.
- `persist-run-knowledge` — the other half of the loop: writes the notes and hubs recall reads.
- `/experiments:knowledge-recall` — the human entry point to the same matcher, outside any run.
