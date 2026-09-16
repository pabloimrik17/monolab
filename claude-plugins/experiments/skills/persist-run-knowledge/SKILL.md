---
name: persist-run-knowledge
description: Keeps a finished update run's research so later runs can reuse it instead of paying for it again — a run note, one accumulative hub section per package, and a copy of the run's artefacts in the run knowledge base. Use this whenever a deep update run (`/experiments:npm-update-deep-*`, `/experiments:commander-update-deep-*`) has finished applying its bumps and has not yet answered its `delete-plan` / `keep-plan` cleanup prompt, and whenever someone does not want a run's findings lost, says the same packages keep being re-researched from scratch, or asks to save, keep or record what a run concluded — even without naming a knowledge base. Also the entry point for `/experiments:knowledge-persist` over a kept or pre-existing run directory. Never on the `cancel` path, on any `abort` path, or when every project's bumps failed.
---

# persist-run-knowledge

Turns an applied run into durable knowledge: an immutable run note, one accumulative hub section per package, and a raw copy of the run's artefacts, all under the knowledge store. Scripts copy and validate; one subagent writes the short summaries; the main conversation holds one line.

The note and hub shapes — frontmatter keys, markers, slots, caps, what is script-owned — live in `${CLAUDE_PLUGIN_ROOT}/skills/persist-run-knowledge/reference/note-templates.md`. If the variable does not resolve, the file is `reference/note-templates.md`, in the subdirectory beside this one. This file is the procedure and nothing else; it never restates a template.

## When to use

- **`npm-update-deep-orchestrator`** — after the final summary is computed, before the cleanup prompt.
- **`commander-update-orchestrator`** in deep mode — after the last per-project apply round, before the cleanup prompt.
- **`/experiments:knowledge-persist`** — over run directories chosen by the user, including pre-existing ones with no `outcome.json` of their own.

The window matters. The run directory is offered for deletion at the cleanup prompt and swept by the 10-day stale cleanup after that; a run that reaches either without being persisted loses its research for good.

## Inputs

| Input       | Type    | Required | Notes                                                                                                                                                                                                                                                                                                                                                                                                                 |
| ----------- | ------- | -------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `runDir`    | string  | yes      | Absolute path to the run directory.                                                                                                                                                                                                                                                                                                                                                                                   |
| `outcome`   | object  | see note | The apply result the caller assembled: `runId`, `level`, `mode`, `gateOption`, and one `projects[]` entry per project with `mechanism`, the verbatim `bumps` fragment and the `changeset` record (`status` one of `lib/knowledge.mjs`'s `CHANGESET_STATUSES`, `path`, `applicable`, `inapplicable`). Every field except `recordedAt`; the header of `scripts/copy-run-knowledge.mjs` documents the shape it consumes. |
| `synthetic` | boolean | no       | Marks the run synthetic: tagged on the note, `synthetic:true` in every hub marker, never a recall hit.                                                                                                                                                                                                                                                                                                                |

`outcome` is required of a live run: an orchestrator holds the apply result and nothing else can reconstruct it. `/experiments:knowledge-persist` over a pre-existing run directory omits it on purpose, and step 1 then uses the run's own `outcome.json` if it kept one, or reconstructs one if it did not. Omitting it for a run whose result you _do_ hold throws that result away.

**`recordedAt` and `<runDir>/outcome.json` belong to this skill.** The caller assembles the object and hands it over; step 1 stamps the timestamp and writes the file before it copies anything. A caller that writes `outcome.json` itself is doing the skill's job.

## Step 0 — decide whether to persist

Derive the run-level outcome from `outcome.projects[]`. The refusals come first — a run with nothing to record is refused before any label is applied:

| Condition                                     | Run-level outcome | Action                                                                |
| --------------------------------------------- | ----------------- | --------------------------------------------------------------------- |
| `projects[]` is empty                         | —                 | Persist nothing. Return `Knowledge: not persisted (nothing applied)`. |
| No project's `bumps.failure` is `null`        | `failed`          | Persist nothing. Return `Knowledge: not persisted (outcome failed)`.  |
| Every project's `bumps.failure` is `null`     | `applied`         | Persist.                                                              |
| Some `bumps.failure` are `null`, some are not | `partial`         | Persist. What landed is still reusable.                               |
| Any project's `mechanism` is `reconstructed`  | `legacy`          | Persist. A reconstruction cannot prove a failure.                     |

`legacy` is a label, not a fourth outcome: it replaces `applied` / `partial` on a run whose entries were rebuilt from a run directory rather than reported by an apply mechanism, and it carries `source: seeded-legacy`. An empty `projects[]` derives vacuously to `applied` if you let it — that is the case the first row exists to catch.

**A run that applied its bumps and found `Applicable (0)` is an applied run.** "Nothing to apply at this range" is exactly the conclusion that saves a later run its research — persist it, note and hub sections both.

Callers stop before this skill on the `cancel` path and on every `abort` path. Reached there anyway, it writes nothing — no store file, no `outcome.json` — and returns `Knowledge: not persisted (<reason>)`. Cancel touches no files, and a run that never applied carries no applicability worth keeping.

## Step 1 — copy

```bash
KNOWLEDGE_ROOT="${user_config.knowledge_root}" node ${CLAUDE_PLUGIN_ROOT}/scripts/copy-run-knowledge.mjs \
  --run-dir "<runDir>" \
  --outcome '<the assembled outcome object as JSON>' \
  [--synthetic]
```

Pass the object inline with `--outcome` for a single-project run. For a cross-project run over several projects, write it to a temp file first and pass `--outcome-file <path>` instead — a many-project object on argv is fragile, and the temp write belongs to this skill, never to the caller.

`KNOWLEDGE_ROOT` carries the configured `knowledge_root` **verbatim** — every command in this skill exports it. Do not expand a leading `~`, do not check whether it is absolute, and do not substitute the default when it is empty: `scripts/lib/knowledge.mjs` owns all three, and pre-processing it here is how a second, divergent copy of that rule gets born. If `${CLAUDE_PLUGIN_ROOT}` does not resolve, the scripts sit under `scripts/` at the plugin root.

The script stamps `recordedAt` and writes `<runDir>/outcome.json`, bootstraps the store on first use, copies the allowlisted artefacts, and writes the run note and every hub section with their slots empty. For a run directory with no `outcome.json` and no caller-supplied one, it reconstructs the object; for research predating the universal / this-project split, it emits the hub's `### Universal` slot carrying `<!-- distill -->` and writes `distilled: true` on the run note. A package whose group produced no `research.md` at all gets `<!-- no-research -->` instead: nothing was researched, so nothing was distilled, and the run note stays undistilled.

It prints one JSON digest. Keep it — every later step reads its paths and counts, and nothing recomputes them:

```jsonc
{
    "root": "/abs/path/to/knowledge",
    "runId": "…",
    "notePath": "runs/<runId>.md", // relative to root
    "hubs": ["packages/<slug>.md"], // relative to root
    "packages": 7,
    "slots": 15,
    "distill": 0,
    "noResearch": 0,
}
```

`notePath` and every entry of `hubs` are **relative to `root`**. That is why `root` is in the digest: join them before handing a path to anything whose working directory you do not control. `slots` counts every slot pair in the files, script-filled ones included; what the subagent has to fill is the subset still empty.

## Step 2 — one subagent fills the slots

Spawn **exactly one** subagent on the default model. It gets the digest's paths and no artefact content.

Resolve `${CLAUDE_PLUGIN_ROOT}` to an absolute path before briefing it — a subagent's environment may not have the variable set, and one that cannot reach the templates fills slots with no contract at all. Then hand it this brief:

```text
Fill the empty slots in these knowledge-store files:
- run note: <root>/<notePath>
- hubs: <root>/<hubPath>, one absolute path per line

Read <absolute plugin root>/skills/persist-run-knowledge/reference/note-templates.md
first. Its "Slots" table is your contract: which slots you own, what each one says,
and its line cap.

Your only source is the raw copy of the run under <root>/runs/<runId>/ — dossier.md,
groups/*/research.md, changesets/**/changeset.md, outcome.json. Read what you need from
there.

Rules:
- Write only between a `<!-- slot:… -->` line and its `<!-- /slot -->` line. Leave the
  marker lines exactly where they are.
- Obey each slot's line cap.
- No fenced code blocks anywhere inside a slot.
- Change nothing outside a slot: not frontmatter, not a heading, not a callout, not a
  marker, not a table. A script hashes those bytes and will catch any edit.
- A slot holding `<!-- distill -->` has research that mixes universal facts with
  project-specific ones. Replace that line with the universal findings you distil out of
  the mixed sections — what the version fixes or brings, no project paths.
- A slot holding `<!-- no-research -->` belongs to a package whose group never produced
  `research.md`. Replace that line with what the run directory actually records about it —
  the group's `_meta.json` error reason, for instance. State that the range was not
  researched and why. Invent no findings.

End your final message with exactly this line, and nothing after it:
<runId>: filled <n>/<n> slots
```

## Step 3 — validate, repair at most twice

```bash
KNOWLEDGE_ROOT="${user_config.knowledge_root}" node ${CLAUDE_PLUGIN_ROOT}/scripts/check-knowledge-note.mjs <notePath> <hubPath>…
```

The script checks frontmatter keys and types, every slot filled, caps respected, no code block in a slot, no byte changed outside the slots, and no "plan" in any heading. Exit 0 ends the step.

Exit 1 prints a JSON list of violations. Send that list back to **the same subagent** — it still holds the context that produced them — and run the script again. Two repair rounds, no more.

Violations surviving the second round end the repair, not the persist. Run the validator once more with `--mark-draft`, which sets `status: draft` in the run note itself:

```bash
KNOWLEDGE_ROOT="${user_config.knowledge_root}" node ${CLAUDE_PLUGIN_ROOT}/scripts/check-knowledge-note.mjs --mark-draft <notePath> <hubPath>…
```

Read the status it reports into the step 5 digest and continue to step 4. A draft note stays on disk and stays readable, and recall skips it: a half-written summary that quietly becomes a later run's evidence is worse than a run recorded as unfinished. Frontmatter stays script-owned throughout — this skill edits no note byte itself, here or anywhere.

## Step 4 — rebuild the index

```bash
KNOWLEDGE_ROOT="${user_config.knowledge_root}" node ${CLAUDE_PLUGIN_ROOT}/scripts/build-knowledge-index.mjs --root "<root>"
```

It rebuilds `index.json` from the notes, the hub markers and the copied `groups/*/_meta.json`, and refreshes `supersededBy` in the older markers. `index.json` is a cache: deleting it costs nothing, and no step here treats it as the source of truth.

## Step 5 — return one line

```text
Knowledge: persisted <runId> → <root> (<p> packages, <h> hubs, <d> distilled, status <ok|draft>)
```

`<p>` is the copy digest's `packages`, `<h>` is the length of its `hubs`, `<d>` is its `distill`, and `<ok|draft>` is what step 3 settled. Return that line and nothing else — no paths listed out, no summary of what the notes say, no artefact content.

On any step erroring, return one line instead:

```text
Knowledge: not persisted (<reason>)
```

`<reason>` comes from a closed set, because both orchestrators reproduce this line verbatim into their summaries: `cancelled`, `aborted`, `nothing applied`, `outcome failed`, or a short failure detail. Step 1 returning `{ failed: true, reason }` is the refusal step 0 describes — map its `reason` onto `nothing applied` or `outcome failed` rather than passing the script's own prose through.

## Failure isolation

Persistence runs after the work it records, and it never puts that work at risk. A persist failure does not abort the run, does not retry past its two repair rounds, and does not block the cleanup prompt — the run reaches `delete-plan` / `keep-plan` either way.

The skill contributes exactly one line to the caller's summary: the `Knowledge:` line. It never modifies, reorders or removes an apply section. When apply succeeded and persist failed, the summary still reports the apply as successful.

## Hard rules

- The skill SHALL write only under the resolved knowledge root and to `<runDir>/outcome.json`. Project files, the Commander registry and the `~/.claude/changelogs/` cache are out of bounds.
- The main conversation SHALL hold only the step 1 digest, the paths it names and the step 5 line. Every read of a note, hub, `research.md` or `dossier.md` SHALL happen inside a script or inside the single subagent.
- The skill SHALL obtain the root from the step 1 digest. It SHALL NOT re-implement the `knowledge_root` expansion or validation rule — `scripts/lib/knowledge.mjs` owns it.
- The skill SHALL spawn exactly one subagent, and that subagent SHALL write only inside `<!-- slot -->` pairs.
- The skill SHALL run steps 1 through 5 in order, merging none and skipping none.
- The skill SHALL NOT delete a run note, a hub, a hub section or a raw copy. The store is append-only and pruning is manual.
- The skill SHALL NOT create commits, branches or PRs.
- Re-persisting a `runId` SHALL be idempotent: one note, one section per marker, one index entry. The scripts guarantee it; invoke them as written and let them do it.

## See also

- `reference/note-templates.md` — the run-note and hub contracts this procedure fills in.
- `${CLAUDE_PLUGIN_ROOT}/scripts/copy-run-knowledge.mjs` — step 1: `outcome.json`, bootstrap, allowlisted copy, note and hub skeletons.
- `${CLAUDE_PLUGIN_ROOT}/scripts/check-knowledge-note.mjs` — step 3: the validator whose violations drive the repair loop.
- `${CLAUDE_PLUGIN_ROOT}/scripts/build-knowledge-index.mjs` — step 4: the index rebuild and `supersededBy`.
- `recall-run-knowledge` — the read side, invoked after grouping and before the workflow dispatch; it skips `draft` and `synthetic` notes this skill writes.
- `/experiments:knowledge-persist` — the manual entry point, and the seeding tool for pre-existing run directories.
