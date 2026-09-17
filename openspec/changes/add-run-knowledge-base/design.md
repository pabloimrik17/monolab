## Context

See `proposal.md` — Why. Constraints that shape the approach:

- **Run dirs already carry the identity the base needs.** `groups/<groupId>/_meta.json.packages[]` records `name`, `from`, `to`; `research.md` opens each package with `## <name> (<from> → <to>)`; `groupId` is `<bucketKey>-<n>`. An index is buildable by script, no model in the loop.
- **Changelog bodies already persist** in `~/.claude/changelogs/<slug>/` under their own TTL + verification contract. The base links; it never copies them.
- **The apply result lives only in memory.** `apply-npm-updates` and `apply-engine-bumps` return a structured fragment the orchestrators consume and drop; `changeset.md` is intent, `logs/apply-*.log` is raw.
- **Two research contracts exist.** Cross-project `research.md` already separates `(universal)` findings + abstract `Hint:`. Single-project mixes universal facts with project globs and `Justification:`.
- **Main-window context diet is a spec requirement** (`experiments-plugin`): paths and digests only. Anything that reads note bodies runs in a subagent or a script.
- **`phase: executing/done` is declared consumer-owned and written by nobody** in the orchestrator prose; the terminated runs on disk nevertheless read `done`. Persistence must not depend on it being reliable.
- **Naming**: the artifact glossary reserves "plan" for Claude Code plan mode; only `~/.claude/experiments/plans/` and `planDirName` are carved out.
- **Scripts convention**: zero-dep Node ≥ 22 `.mjs` under `claude-plugins/experiments/scripts/`, Vitest, `*.test.mjs` adjacent, `lib/` for shared code, invoked as `node ${CLAUDE_PLUGIN_ROOT}/scripts/<name>.mjs`.
- **Seed on this machine**: six terminated runs (2 cross-project real, 4 `dryrun-alpha` synthetic) plus one stalled at `synthesis` (excluded).

## Goals / Non-Goals

**Goals:**

- Every mechanically checkable step (copy, index, match, note validation) is a script that either runs or errors; the model writes only the short summaries.
- Recall degrades to a no-op when the base is absent, empty, or has no hit — a fresh run is byte-for-byte today's run plus one digest line.
- The vault opens in Obsidian as-is and is equally queryable with `rg` + frontmatter; nothing at runtime requires the app, its CLI, or an MCP.
- Contracts between teammates (shapes below) are fixed here so implementation waves run in parallel.

**Non-Goals:**

- Semantic or model-driven search over the base (spike follow-up ticket).
- Any change to the `~/.claude/changelogs/` cache contract or to `fetch-changelog.mjs`.
- Any change to grouping (`group-packages-for-research`) or to the shallow update commands.
- Time-based expiry, automatic pruning, or vault sync.

## Decisions

### D1. Store location and override

Default root `~/.claude/experiments/knowledge/`; sibling of `plans/`, same user-scoped zone as commander. `userConfig.knowledge_root` (string, default `""`) in the experiments `plugin.json` overrides it; a leading `~` is expanded; a relative value is an error (`Error: knowledge_root must be absolute or ~-prefixed.`). Resolution lives once in `lib/knowledge.mjs` (`resolveKnowledgeRoot(env)`); skills call the scripts, they do not re-implement the rule. The configured value reaches the scripts as the `KNOWLEDGE_ROOT` environment variable, exported verbatim by the caller — never pre-expanded and never pre-validated, since expansion, defaulting and the relative-path error all belong to `resolveKnowledgeRoot`. `--root` is optional on every knowledge script; omitted, the script resolves it itself.

_Alternatives_: inside `plans/` (rejected: subject to stale cleanup and `delete-plan`); a per-project `.claude/` folder (rejected: the whole point is cross-project reuse).

### D2. Vault layout and naming

```text
<root>/
  index.json                 # script-built cache; never hand-edited; rebuildable from disk
  runs/<runId>.md            # run note (system-owned, regenerated on re-persist)
  runs/<runId>/              # raw copy: dossier.md, _meta.json, outcome.json,
                             #   groups/<gid>/research.md, groups/<gid>/_meta.json,
                             #   changesets/<project>/changeset.md   (no changelogs/, no logs/, no chronology.md)
  packages/<pkgSlug>.md      # accumulative hub, one section per persisted range
  .obsidian/app.json         # `{}` — marks the folder as a vault; nothing reads it
  Runs.base, Packages.base   # Obsidian Bases views filtered on `type`
```

- `runId` = `_meta.json.planDirName` (e.g. `commander-deep-minor-minor-1784387463`). It is the only place the legacy word survives, and only inside an opaque id.
- `pkgSlug` = the changelog cache's slug rule (`@scope/name` → `@scope__name`) so a hub and its cached changelogs share a key.
- No file, directory, frontmatter key or heading contains "plan"; the vocabulary is `run`, `knowledge`, `note`, `hub`.

_Alternative_: one note per (run, package) pair (rejected: doubles file count, and the per-package view is exactly what the hub gives).

### D3. Note contracts (frontmatter is Obsidian-safe: scalars and lists of strings only)

**Run note `runs/<runId>.md`**

```yaml
---
type: run
runId: commander-deep-minor-minor-1784387463
level: minor                       # patch | minor | major | engines
mode: cross-project                # single-project | cross-project
createdAt: 2026-07-18T15:11:03Z    # from _meta.json
persistedAt: 2026-09-13T10:02:11Z
projects: [dotfiles, monolab]      # single-project: [<slug>]
packages: ["@commitlint/cli@21.1.0..21.2.1", "@nx/js@23.0.2..23.1.0"]
outcome: applied                   # applied | partial | legacy
gateOption: apply-all              # apply-all | apply-bumps-only | pick-subset | unknown
status: ok                         # ok | draft  (draft = summary failed validation; excluded from recall)
source: run-dir                    # run-dir | seeded-legacy
tags: [run, minor, cross-project]  # + synthetic when flagged
---
# Run <runId>

> [!info] <level> · <mode> · <projects> · <createdAt> — raw artefacts in [[runs/<runId>/dossier|dossier]], [[runs/<runId>/outcome.json|outcome]]

## Summary
<!-- slot:summary -->            # subagent, ≤ 8 lines, no code blocks
<!-- /slot -->

## Packages
| package | range | hub | outcome |            # script-built; hub cell is [[packages/<slug>#<anchor>]]

## Applied
<!-- script-built from outcome.json + changesets: per project, bumps count, changeset status, applicable/inapplicable counts -->
```

**Package hub `packages/<pkgSlug>.md`**

```yaml
---
type: package
name: "@commitlint/cli"
ranges: ["21.1.0..21.2.1"]         # appended per persisted range, deduplicated
runs: ["[[runs/commander-deep-minor-minor-1784387463]]"]
latest: 21.2.1                     # max `to` across ranges
tags: [package]
---
# @commitlint/cli

## 21.1.0 → 21.2.1
<!-- run:commander-deep-minor-minor-1784387463 level:minor mode:cross-project synthetic:false supersededBy: -->
> [!info] Source: [[runs/<runId>]] · <level> · <mode> · <createdAt>

### Universal
<!-- slot:universal -->          # script-copied from `(universal)` sections; for legacy single-project runs the slot is
<!-- /slot -->                   #   left empty with `<!-- distill -->` and the subagent distils it (note gains `distilled: true`)

### Applied
<!-- script-built from changesets/**/changeset.md: per project → applicable / inapplicable titles; "no changeset" when absent -->

### Summary
<!-- slot:summary -->            # subagent, ≤ 5 lines: what the range brings, who should care, what earlier projects did
<!-- /slot -->
```

A package whose group produced no `research.md` at all is a third case, distinct from the legacy one: its slot carries `<!-- no-research -->`, it is never counted as distilled, and the subagent fills it from what the run directory records about the absence.

Section identity is the `<!-- run:<runId> … -->` marker: re-persisting a run replaces its section in place (idempotent); a new range for the same package appends a new `##` block. Everything outside `<!-- slot -->` pairs is script-owned and never edited by a model.

### D4. `outcome.json` — the apply result made durable

The orchestrator assembles this object (every field except `recordedAt`) from the fragments it already holds and passes it to the persist skill as `outcome`; the skill stamps `recordedAt`, writes `<runDir>/outcome.json`, then copies it with the run:

```jsonc
{
  "runId": "<planDirName>",
  "level": "minor",
  "mode": "cross-project",
  "gateOption": "apply-all", // apply-all | apply-bumps-only | pick-subset | unknown (legacy)
  "recordedAt": "<ISO 8601>",
  "projects": [
    {
      "projectName": "monolab", // single-project: the run slug; one entry per Step 6 apply round,
      //   so a per-bucket apply yields several entries sharing one projectName
      "mechanism": "apply-npm-updates", // apply-npm-updates | apply-engine-bumps | reconstructed (legacy)
      "bumps": {
        /* returned mechanism fragment verbatim, or the canonical clean no-bump fragment when only the changeset gate ran */
      },
      "changeset": {
        "status": "approved", // approved | rejected | skipped | not-run | verification-failed | unknown
        "path": "changesets/monolab/changeset.md", // run-dir-relative, or null
        "applicable": 1,
        "inapplicable": 55, // counts parsed from changeset.md headings; null when absent
      },
    },
  ],
}
```

When the bump mechanism ran, `bumps` is its returned fragment verbatim. An improvement-only round carries a canonical clean no-bump fragment: `{ appliedGeneric: [], appliedOverrides: [], installRan: false, logPath: null, failure: null }` for dependency levels, or `{ resolvedTargets: {}, applied: [], skipped: [], droppedHashes: [] }` for `engines`.

`outcome` at run level derives from it, as an ordered three-way: `applied` when every entry's `bumps.failure` is absent or `null`; `partial` when at least one entry is clean **and** at least one is not; `failed` when none is clean. An empty `projects[]` means no Step 6 apply round reached either the bump mechanism or the changeset gate — it is **not** vacuously `applied` and is never persisted (digest `Knowledge: not persisted (nothing applied)`). **Persist only `applied` and `partial`**; `failed` and `cancel` persist nothing — "Cancel touches no files" keeps holding, and a run where nothing landed carries no reusable applicability. `Applicable (0)` is an `applied` run and is persisted (the "nothing to apply at this range" fact is itself reusable).

`changeset.status` is keyed on one axis — what happened at the changeset gate: `approved` (the gate opened and the user approved, zero-applicable included), `rejected` (the gate opened and the user rejected), `skipped` (the gate could not open because nothing was in scope), `not-run` (the round never reached the gate: `apply-bumps-only`, or it aborted before the gate opened), `verification-failed` (the gate was approved and the edits applied, but the orchestrator's on-disk re-check did not match the approved changeset), `unknown` (`/experiments:knowledge-persist` reconstruction only; a live run never emits it). `verification-failed` exists because the hub's `### Applied` section is the per-project applicability record a later run reads: `approved` there would assert edits that never landed and `skipped` would assert nothing was in scope, and a false applicability fact propagates into runs that do not re-check it. `bumps.failure` is not its home — that records the bump mechanism, not the changeset apply.

### D5. Persist pipeline — scripts copy, one subagent writes, a script validates

`persist-run-knowledge` runs, in order:

1. `node scripts/copy-run-knowledge.mjs --run-dir <dir> (--outcome <assembled outcome JSON> | --outcome-file <path>) [--synthetic]` — stamps `recordedAt` and writes `<runDir>/outcome.json`, bootstraps the vault on first use (D2 skeleton), copies the allowlisted files, writes `runs/<runId>.md` and every `packages/<slug>.md` section with slots empty, prints a JSON digest (`{ root, runId, notePath, hubs: [...], packages: p, slots: n, distill: m }`). `root` and `packages` are in the digest because step 5's line needs both and the skill may not re-resolve the root itself (D1). `--outcome-file` is the same object read from disk, for a cross-project payload too large to quote on argv; the file is the skill's own temp write, never the orchestrator's. The script also writes `distilled: true` on the run note whenever it emits a `<!-- distill -->` slot — no model ever sets that key. Deterministic; unit-tested on fixtures cut from the six real runs.
2. Spawn **one subagent** (default model, not the main) with the digest paths. Its whole job: fill every `<!-- slot -->` in the listed files from the raw copy under `runs/<runId>/`, obeying the per-slot line caps, no code blocks, no line outside a slot. Final line: `<runId>: filled <n>/<n> slots`.
3. `node scripts/check-knowledge-note.mjs [--mark-draft] <paths…>` — frontmatter keys and types, every slot filled, caps respected, no edits outside slots (diff against the script's own pre-image hash), no "plan" in headings. A slot whose only content is `<!-- distill -->` does not count as filled — the marker is a pre-fill instruction the subagent consumes, not a line that survives. Exit 1 lists violations; the skill relays them to the subagent for at most **two** repair rounds; on the final round it passes `--mark-draft`, and the script (never the skill — frontmatter is script-owned) writes `status: draft` on any note with residual violations and reports the resulting `status` per note for the digest.
4. `node scripts/build-knowledge-index.mjs --root <root>` — rebuilds `index.json` from frontmatter + markers + `groups/*/_meta.json` (`runs[]`: `runId`, `notePath`, `level`, `mode`, `createdAt`, `outcome`, `status`, `projects`, `tags`; `packages[]`: `name`, `hubPath`, `latest`, `ranges[]` with `from`, `to`, `anchor`, `runId`, `notePath`, `level`, `mode`, `createdAt`, `status`, `groupId`, `bucketKey`, `synthetic`, `supersededBy`); computes `supersededBy` (a later section for the same package whose range covers the older one) and writes it into the older marker.
5. Return one line to the main: `Knowledge: persisted <runId> → <root> (<p> packages, <h> hubs, <d> distilled, status <ok|draft>)`.

_Alternative_: let the subagent write whole notes from a template (rejected: templates drift under context pressure; here the model can only fill slots and a script proves it did).

### D6. Recall pipeline — after grouping, before the workflow dispatch

**Refinement of the grill agreement (item 6), for two mechanical reasons.** (a) `related` needs `bucketKey`, which `group-packages-for-research` derives in prose, not in a script; running recall on the emitted `groups[]` gets it for free. (b) Dropping exact-hit packages from the fresh set would remove them from phase 1 as well, and `check-dossier.mjs` requires a changelog cache entry per bump-set package — so exact-hit packages stay in their group, still fetch their changelog (cache hit, cheap), and receive a **copy directive** instead of research. What the user wanted — no re-research, no wasted subagent effort — is preserved; what changes is only where the step sits and how the exclusion is expressed.

`recall-run-knowledge` runs, in order:

1. `node scripts/match-knowledge.mjs [--root <root>] --groups -` (rebuilds the index first; cheap). `--root` is optional on every knowledge script: omitted, the script calls `resolveKnowledgeRoot(env)` itself, so no skill ever restates D1's rule. Groups arrive on **stdin** (`--groups -`) because they exist only as an in-conversation object and recall may not create a file outside the knowledge root; `--groups <path>` remains for the slash command. The output carries the resolved absolute `root`. A missing root is data (`baseAbsent: true` with `{ hits: [], related: [] }`), so the caller emits `Knowledge: no base at <root>` and nothing else changes. A missing `index.json` is rebuilt from durable notes and hubs before matching.
2. Output:

   ```jsonc
   {
     "hits": [
       {
         "name": "@nx/js",
         "from": "23.0.2",
         "to": "23.1.0",
         "groupId": "nx-1",
         "class": "exact",
         "runId": "…",
         "priorFrom": "23.0.2",
         "priorTo": "23.1.0",
         "delta": null,
         "hubPath": "packages/@nx__js.md",
         "anchor": "23.0.2 → 23.1.0",
         "notePath": "runs/….md",
         "level": "minor",
         "mode": "cross-project",
         "createdAt": "…",
       },
     ],
     "related": [
       {
         "name": "@nx/workspace",
         "groupId": "nx-1",
         "bucketKey": "nx",
         "hubs": ["packages/@nx__js.md"],
       },
     ],
     "summary": {
       "exact": 1,
       "overlap": 0,
       "prior": 0,
       "related": 1,
       "packages": 7,
     },
   }
   ```

3. Build `priorKnowledge` (the same object) and pass it to the workflow as a new optional input. The main never opens a hub.
4. Digest to the main: `Knowledge: <e> exact, <o> overlap, <p> prior, <r> related of <n> packages`.

**Match classes** (same `name` unless stated; semver via `lib/semver.mjs`; notes with `synthetic` tag or `status: draft` are never candidates; at most one same-name hit per package, preferring `exact` > `overlap` > `prior`, then the newest `createdAt`):

| Class     | Condition                                                           | What it injects                                                                                                                                                                                        |
| --------- | ------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `exact`   | `prior.from == cur.from && prior.to == cur.to`                      | Subagent copies the hub's `### Universal` into `research.md` under `source: prior-run <runId>`; no fresh research; single-project still writes the `(this project)` sections by checking applicability |
| `overlap` | ranges intersect and are not equal                                  | Prior section as context; fresh research restricted to `delta` = the sub-range(s) not covered                                                                                                          |
| `prior`   | `prior.to <= cur.from`                                              | Applicability only: the hub's `### Applied` — never its findings                                                                                                                                       |
| `related` | no same-name hit; another package in the same `bucketKey` has a hub | Context paths only                                                                                                                                                                                     |

Staleness is a function of versions only; `createdAt` is a tiebreaker, never a filter.

Recall failure is non-fatal, exactly like persist failure: if the matcher errors, the run continues with no `priorKnowledge` and the digest reads `Knowledge: recall failed (<reason>)`. Recall never blocks a run. When the base exists but yields nothing, the digest is the counts line with zeros — `Knowledge: no base at <root>` states one thing only, that there is no base.

### D7. Prior knowledge reaches the subagents through the workflow's prompt template

`parallel-research-workflow` gains `priorKnowledge` (optional; absent ⇒ today's prompt byte-for-byte). When present, both prompt templates (single- and cross-project) append one block per group:

```text
## Prior knowledge (not verified for this project)
Knowledge root: <absolute root> — every path below is relative to it.
- <pkg> <from → to>: EXACT — after fetching its changelog, do not research it. Copy the `### Universal` section of <hubPath> under heading `## <pkg> (<from → to>)` verbatim, first line `source: prior-run <runId>`. [single-project: then write the `(this project)` sections by checking each copied finding against this codebase.]
- <pkg> <from → to>: OVERLAP with <priorFrom → priorTo> — research only <delta>; read <hubPath> section `<anchor>` first and do not repeat its findings.
- <pkg> <from → to>: OVERLAP with <priorFrom → priorTo> — the prior range covers this range; read <hubPath> section `<anchor>` first, research nothing beyond it, and do not repeat its findings.
- <pkg> <from → to>: PRIOR run <priorFrom → priorTo> — its findings do not carry over. Read only `### Applied` under <anchor> for how earlier projects handled this package.
- <pkg>: RELATED — sibling hubs in bucket <bucketKey>: <paths>. Context only.
```

The two `OVERLAP` lines are mutually exclusive: render the first for a non-null `delta`, and the second when the prior range covers the current range and `delta` is `null`.

Phase 4 gains an optional `## Prior runs` H2 placed after `## Skipped or unavailable` and before the bump set, one bullet per `exact|overlap|prior` hit: `- <pkg> <from → to> — <class> hit from [[runs/<runId>]] (<level>, <mode>, <createdAt>)`. Omitted entirely when there is no hit. `check-dossier.mjs` accepts the section as optional in that position (script + test edit). `synthetic` never reaches this section because the match script never emits synthetic hits.

### D8. Single-project `research.md` contract split

Per package, four H3s in this order, each with the `_no findings_` sentinel when empty: `### Workarounds resolved (universal)`, `### Workarounds resolved (this project)`, `### Improvements applicable (universal)`, `### Improvements applicable (this project)`. Universal bullets describe what the version fixes or brings (no paths); this-project bullets carry the globs and `Justification:` as today. The 20/80 effort split is unchanged. Cross-project keeps `(universal)` only — per-project applicability already lives in `changeset.md`, and duplicating it into research would make the hub's `### Applied` ambiguous.

Legacy runs (pre-split) are seeded with `### Universal` empty and `<!-- distill -->`; the subagent distils from the mixed sections and the run note carries `distilled: true` so a reader can weigh it.

### D9. Orchestrator wiring (both orchestrators, same three insertions)

1. **Recall** — single-project: new Step 3.5 between Step 3 (group) and Step 4 (workflow dispatch); cross-project: new 6.5.3b between 6.5.2 (group) and 6.5.4 (invoke), on the deduplicated set. Pass `priorKnowledge` into the workflow call.
2. **Phase writes for real** — `_meta.json.phase = "executing"` at the start of the apply step (single Step 6 / cross Step 10), `"done"` right after apply completes on every `apply-*` path (before persist). Atomic write, same convention the workflow uses.
3. **Persist** — single-project: new Step 7.5 after the final summary is computed and before Step 8 cleanup; cross-project: new Step 10b.5 between 10b and 10c. Assemble the outcome object (D4) from the fragments already in hand, invoke `persist-run-knowledge` with `{ runDir, outcome }` — the skill, not the orchestrator, writes `outcome.json` — and surface its one-line digest. Skipped (silently, with the digest `Knowledge: not persisted (<reason>)`) on `cancel`, on every `abort`, and when `outcome` is `failed`. The summary's `Knowledge:` line is that digest; the existing `keep-plan` review bullet stays.

The single-project family is specified once: the delta lands on `npm-update-deep-patch-command` (the anchor) and the `experiments-plugin` delta states that recall and persist belong to the shared deep contract at every level, so `minor`/`major`/`engines` inherit by the existing "Deep command family consolidation" rule instead of receiving mirror deltas.

Hard rules gain one carve-out sentence each: writes to the knowledge root are permitted on the `apply-*` paths only (`apply-*` = `apply-all`, `apply-bumps-only`, `pick-subset` — every gate option other than `cancel`). `Cancel touches no files` stays literally true (its scope is files outside `plans/`, and cancel never reaches persist). Registry byte-identity is untouched.

### D10. Commands are thin

- `/experiments:knowledge-recall <pkg> [<from> <to>]` — with versions: runs `match-knowledge.mjs` on a one-package synthetic group and prints the hit(s) by class with paths; without: prints the hub's ranges table. Never opens note bodies in the main beyond the hub frontmatter.
- `/experiments:knowledge-persist [<run-dir>…] [--synthetic]` — no args: every dir under `plans/` whose `_meta.json.phase == "done"` and whose `runId` is absent from `index.json`, listed for confirmation (`AskUserQuestion`, multi-select, default all). Legacy runs get a `reconstructed` `outcome.json` (mechanism `reconstructed`, `gateOption: unknown`, changeset counts parsed, `bumps` inferred from `logs/apply-*.log` presence). `--synthetic` applies the tag to every selected run. This is the seeding tool; there is no separate seed script.

### D11. Scripts, tests, fixtures

| Script                      | Role                                                                                                                                                      |
| --------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/knowledge.mjs`         | root resolution, slug, frontmatter parse/serialize (strings only), `research.md` section parser, slot/marker helpers, range algebra over `lib/semver.mjs` |
| `copy-run-knowledge.mjs`    | D5 step 1 (bootstrap, allowlisted copy, note + hub skeletons, legacy reconstruction)                                                                      |
| `check-knowledge-note.mjs`  | D5 step 3 validator                                                                                                                                       |
| `build-knowledge-index.mjs` | D5 step 4, `supersededBy`                                                                                                                                 |
| `match-knowledge.mjs`       | D6 classifier                                                                                                                                             |
| `check-dossier.mjs` (edit)  | optional `## Prior runs` in position                                                                                                                      |

Fixtures: `scripts/fixtures/knowledge/` holds two trimmed run dirs cut from the real `commander-deep-minor` (cross-project, split) and `dryrun-alpha-minor` (single-project, legacy) runs, plus a pre-built mini vault for the matcher. Tests run through `pnpm --filter @m0n0lab/plugin-experiments run test:unit` (no nx target exists for the plugin; nothing here touches package exports, so `attw` does not apply).

### D12. Authoring and audit toolchain

As committed in `proposal.md` — Implementation approach: `skill-creator`, `plugin-dev:skill-development`, `plugin-dev:command-development`, `plugin-dev:plugin-structure`, `superpowers:writing-skills`, `mattpocock-skills:writing-for-agents`, `elements-of-style:writing-clearly-and-concisely` for every prose artefact; `experiments:writing-comments` loaded by every teammate touching `.mjs`; `plugin-dev:skill-reviewer`, `plugin-dev:plugin-validator` and `skill-creator` evals for audit. Each skill's `SKILL.md` stays a procedure; contracts and templates live in `reference/` (`note-templates.md`, `match-classes.md`, `prompt-block.md`) so the workflow and both orchestrators can reference one file instead of restating it.

### D13. Teammate topology

The allocation lives as per-task tags in `tasks.md` (`[wave · teammate · model · scheduling]`). Its precondition is this document: the shapes in D3, D4, D6, D7, D8 are the interfaces between waves A, B and C, so no teammate waits on another's output. The orchestrator's wave-D seam audit checks exactly these: every path, heading, marker, directive keyword and digest string used in one file is spelled identically in the others.

## Risks / Trade-offs

- [A wrong `exact` match silently skips research for a package] → equality on `name`, `from` and `to`; the copied section is labelled `source: prior-run`; the dossier lists it under `## Prior runs`; single-project still re-checks applicability.
- [Subagent-written summaries drift from the template] → slots + `check-knowledge-note.mjs` + two repair rounds; failure degrades to `status: draft`, excluded from recall, visible in the digest.
- [Legacy distillation invents universality that was never there] → `distilled: true` on the run note, written by the copy script; the hub marker keeps its fixed `run/level/mode/synthetic/supersededBy` shape and does not record it; the spike's seed is small enough to review by hand once.
- [`check-dossier.mjs` becomes stricter or looser than intended by the optional section] → single positional rule, covered by a test with and without the section.
- [Hub files grow without bound on hot packages] → one section per persisted range, markers make re-persist idempotent; `supersededBy` lets a reader skip covered ranges; pruning stays manual by design.
- [Persist runs after apply and could mask an apply failure] → persist never alters the summary's apply sections; its own failure prints one `Knowledge: not persisted (<reason>)` line and the run still reaches cleanup.
- [Obsidian frontmatter rejects nested values] → frontmatter is scalars and string lists only; structure lives in `index.json` and the note body.
- [Parallel teammates leave inconsistent seams] → contracts fixed here; wave-D audit is a named task, not a hope.

## Migration Plan

- No user action: the first persisted run bootstraps the vault; a missing vault makes recall a no-op.
- Seed: `/experiments:knowledge-persist` over the six terminated runs (four with `--synthetic`); review the two real run notes by hand once; rebuild the index.
- Rollback: delete the knowledge root; remove the three insertions from the orchestrators. No project file, registry entry or cache is touched by this change.

## Open Questions

- Exact Bases view definitions (`Runs.base`, `Packages.base` columns/sorts) — cosmetic, fixed during wave C.
- Whether the `## Applied` block of the run note should also carry per-package `logPath` pointers — decide when the first real run is persisted.
