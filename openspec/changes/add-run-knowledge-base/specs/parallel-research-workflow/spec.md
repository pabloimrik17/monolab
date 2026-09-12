## MODIFIED Requirements

### Requirement: Workflow input contract

The workflow SHALL accept exactly these inputs:

- `groups` (required) — array of group records as emitted by `group-packages-for-research`: `[{ groupId, bucketKey, packages: [...] }]`.
- `level` (required) — one of `patch`, `minor`, `major`, `engines`. Embedded into the plan-dir slug and into `_meta.json.level`. Determines the title of `dossier.md`.
- `scanResult` (required) — the verbatim `ScanResult` JSON for single-project callers, or a synthesized cross-project `ScanResult`-shaped value for cross-project callers. Persisted as `scan.json` (single-project) or as part of `scan-by-project.json` + `cross-project-plan.json` (cross-project; see "Cross-project plan-dir layout").
- `mode` (optional) — one of `single-project`, `cross-project`. Default `single-project`. Selects the cross-project research contract (universal-only findings, no codebase cross-reference) when `cross-project`.
- `slugOverride` (optional in single-project mode, REQUIRED in cross-project mode) — string used as the plan-dir basename slug instead of the CWD/`package.json#name`-derived slug. Sanitized identically to derived slugs (lowercase, replace `[^a-z0-9]+` with `-`, trim leading/trailing `-`, truncate to 40 chars).
- `maxConcurrent` (optional, integer, default `5`) — per-batch concurrency cap; identical to today's contract.
- `priorKnowledge` (optional) — the recall output object emitted by `recall-run-knowledge`, passed through verbatim: `{ hits, related, summary }`, where each `hits[]` entry carries `name`, `from`, `to`, `groupId`, `class` (one of `exact`, `overlap`, `prior`), `runId`, `priorFrom`, `priorTo`, `delta`, `hubPath`, `anchor`, `notePath`, `level`, `mode`, `createdAt`; each `related[]` entry carries `name`, `groupId`, `bucketKey`, `hubs`; and `summary` carries the per-class counts. Default absent.

The workflow SHALL reject invocations with:

- An unknown `mode` value: abort with `Error: invalid mode "<value>". Expected single-project|cross-project.` before any side effect.
- `mode: "cross-project"` and an absent or empty `slugOverride`: abort with `Error: slugOverride is required when mode is cross-project.` before any side effect.
- A `maxConcurrent` outside `[1, 10]`: abort with `Error: maxConcurrent must be between 1 and 10, got <value>.` (unchanged).

When `priorKnowledge` is absent, the workflow SHALL behave exactly as it does today: every subagent dispatch prompt and the resulting `dossier.md` SHALL be byte-for-byte what the same invocation produces with no knowledge base at all. An empty `hits` and `related` pair SHALL be treated as absent.

When `priorKnowledge` is present, it is read-only context: the workflow SHALL NOT mutate it, SHALL NOT re-classify its entries, and SHALL consume it in exactly two places — the phase-1+2 dispatch prompts (see "Subagent dispatch prompt template" and "Cross-project subagent prompt template (mandatory)") and the phase-4 `## Prior runs` section (see "Phase 4 — dossier synthesis by teammate"). It SHALL NOT change group membership, batching, the changelog phase, or the bump set.

The workflow SHALL NOT mutate any input.

#### Scenario: Defaults preserve single-project behavior

- **WHEN** a caller invokes the workflow with `mode` and `slugOverride` both omitted
- **THEN** the workflow runs in single-project mode using the CWD/`package.json#name`-derived slug
- **AND** the subagent prompt, plan-dir layout, and `dossier.md` template follow the single-project contract

#### Scenario: Cross-project mode without slugOverride is rejected

- **WHEN** a caller invokes the workflow with `mode: "cross-project"` and no `slugOverride`
- **THEN** the workflow aborts with `Error: slugOverride is required when mode is cross-project.` before creating any plan-dir
- **AND** performs no scan, no research, no synthesis

#### Scenario: priorKnowledge absent is today's run

- **WHEN** a caller invokes the workflow without `priorKnowledge`
- **THEN** no dispatch prompt carries a `## Prior knowledge (not verified for this project)` block
- **AND** `dossier.md` carries no `## Prior runs` section

#### Scenario: priorKnowledge present is read-only context

- **WHEN** a caller invokes the workflow with a `priorKnowledge` object carrying one `exact` hit in group `nx-1`
- **THEN** the workflow SHALL NOT modify the object, its `hits`, or its `related` entries
- **AND** the hit SHALL reach the `nx-1` dispatch prompt and the dossier's `## Prior runs` section
- **AND** `nx-1` SHALL keep the same packages, batch position, and changelog phase it would have had without the input

---

### Requirement: Subagent dispatch prompt template

Each subagent dispatched in phase 1+2 SHALL receive a prompt that explicitly enforces non-termination across two failure modes observed in dry-runs: (a) returning the `fetch-changelog` executable's structured summary as the agent's final answer, and (b) returning the first per-package failure (notably `no_changelog_source` for `@types/*`) as the agent's final answer.

The dispatch prompt SHALL include, at minimum: numbered execution steps; an explicit rule that the `fetch-changelog` executable's output is INTERMEDIATE data and the subagent MUST NOT terminate after invoking it; explicit handling for `no_changelog_source` (write `error.txt`, continue); a required final-response format `<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.`; and a closing reminder that the task is incomplete if `research.md` is missing in the success path or `_meta.json` is not updated.

When the `priorKnowledge` input is present, the prompt for a group SHALL additionally carry, after the mandatory contract above, a block headed `## Prior knowledge (not verified for this project)` holding one directive line per `hits[]` entry whose `groupId` is that group's and one line per `related[]` entry in that group. A group with no hit and no related entry SHALL NOT receive the block. The directive lines SHALL follow these four forms:

```text
- <pkg> <from → to>: EXACT — after fetching its changelog, do not research it. Copy the `### Universal` section of <hubPath> under heading `## <pkg> (<from → to>)` verbatim, first line `source: prior-run <runId>`. [single-project: then write the `(this project)` sections by checking each copied finding against this codebase.]
- <pkg> <from → to>: OVERLAP with <priorFrom → priorTo> — research only <delta>; read <hubPath> section `<anchor>` first and do not repeat its findings.
- <pkg> <from → to>: PRIOR run <priorFrom → priorTo> — its findings do not carry over. Read only `### Applied` under <anchor> for how earlier projects handled this package.
- <pkg>: RELATED — sibling hubs in bucket <bucketKey>: <paths>. Context only.
```

The block's heading SHALL carry the "not verified for this project" qualifier verbatim; the prompt SHALL NOT present prior findings as established for the current codebase. The block SHALL NOT alter phase 1: a package carrying an `EXACT` directive stays in its group and still fetches its changelog, so the bump set, the chronology and the per-package cache coverage are unchanged. `PRIOR` directives SHALL point the subagent at the hub's `### Applied` section only and SHALL NOT hand it the hub's findings.

The skill SHALL NOT dispatch a subagent with a looser prompt; substitution is a spec violation.

#### Scenario: Executable output is intermediate

- **WHEN** a subagent invokes the `fetch-changelog` executable and receives a success summary
- **THEN** the dispatch prompt mandates the subagent treat that summary as intermediate and continue to the next package, ultimately writing `research.md` and updating `_meta.json` before returning

#### Scenario: Exact hit becomes a copy directive

- **WHEN** `priorKnowledge` carries an `exact` hit for `@nx/js 23.0.2 → 23.1.0` in group `nx-1`
- **THEN** the `nx-1` prompt carries the `## Prior knowledge (not verified for this project)` block with an `EXACT` line naming the hit's `hubPath` and `runId`
- **AND** the line instructs the subagent to fetch the changelog, skip research, and copy the hub's `### Universal` section under `## @nx/js (23.0.2 → 23.1.0)` with first line `source: prior-run <runId>`
- **AND** in `single-project` mode it also instructs the subagent to write the `(this project)` sections by checking each copied finding against this codebase

#### Scenario: Overlap hit restricts research to the delta

- **WHEN** `priorKnowledge` carries an `overlap` hit whose `delta` is the sub-range not covered by the prior run
- **THEN** the group's prompt carries an `OVERLAP` line naming `<priorFrom → priorTo>`, the `delta` to research, and the hub section `<anchor>` to read first
- **AND** the line forbids repeating the prior section's findings

#### Scenario: Absent priorKnowledge leaves the prompt untouched

- **WHEN** the workflow dispatches phase-1+2 subagents and `priorKnowledge` is absent
- **THEN** no prompt contains a `## Prior knowledge (not verified for this project)` block
- **AND** every prompt is byte-for-byte the prompt dispatched before this capability existed

---

### Requirement: Phase 2 — parallel codebase research

For each group whose phase advanced to `research`, the subagent SHALL:

1. Read every changelog written in phase 1 plus the codebase context available to it (file enumeration, recent edits, framework patterns).
2. Produce `groups/<groupId>/research.md` containing, per package that fetched successfully, a `## <package> (<from> → <to>)` heading followed by these four `###` sections in this exact order:
   - `### Workarounds resolved (universal)` — bug fixes the new version resolves, described independently of any codebase. Bullets SHALL NOT carry file globs, directory hints, or project paths.
   - `### Workarounds resolved (this project)` — the subset of those fixes that touches this codebase. Each bullet SHALL include a brief justification and one or more file globs or directory hints.
   - `### Improvements applicable (universal)` — new APIs, behaviors, or features the version introduces, described independently of any codebase. Bullets SHALL NOT carry file globs, directory hints, or project paths.
   - `### Improvements applicable (this project)` — the subset this codebase could adopt, cross-referenced against its patterns. Each bullet SHALL include a brief justification and one or more file globs or directory hints.

   Effort target: ~20% of the subagent's allocated work across the two `Workarounds resolved` sections, ~80% across the two `Improvements applicable` sections — unchanged by the split. This four-heading contract is the `single-project` contract; in `cross-project` mode `research.md` keeps the `(universal)` headings only, per "Cross-project subagent prompt template (mandatory)", because per-project applicability lives in each project's `changeset.md`.

3. The subagent SHALL NOT propose code changes, line numbers, or diff sketches. Output is opportunity-level only.
4. If a package has no findings under one of the four headings, the subagent SHALL still write a sentinel line `_no findings_` under that heading rather than omitting the heading.
5. After writing `research.md`, update the group's `_meta.json` to `phase: "done"`, `status: "ok"`, `completedAt: <now>`.

When the dispatch prompt carried an `EXACT` directive for a package (see "Subagent dispatch prompt template"), the subagent SHALL NOT research that package: the copied `### Universal` section of the named hub supplies the package's `(universal)` sections verbatim, the first line under the package heading SHALL be `source: prior-run <runId>`, and only the `(this project)` sections SHALL be freshly authored by checking each copied finding against this codebase.

If the subagent encounters an unrecoverable error during phase 2, it SHALL update `_meta.json` to `phase: "research"`, `status: "error"`, `errorPhase: "research"`, `errorReason: "<message>"`, `completedAt: <now>`, and exit without writing `research.md`.

#### Scenario: Research output structure

- **WHEN** a group with packages `[react, react-dom]` finishes phase 2 successfully in `single-project` mode
- **THEN** `groups/<id>/research.md` exists and contains, for each of `react` and `react-dom`, the headings `### Workarounds resolved (universal)`, `### Workarounds resolved (this project)`, `### Improvements applicable (universal)`, and `### Improvements applicable (this project)` in that order

#### Scenario: No findings sentinel

- **WHEN** the subagent finds no applicable improvements for a package in this codebase
- **THEN** the package's `### Improvements applicable (this project)` section in `research.md` contains the literal line `_no findings_`
- **AND** every other one of the package's four headings that has no findings carries the same sentinel rather than being omitted

#### Scenario: No code suggestions

- **WHEN** the subagent identifies an opportunity to adopt a new API
- **THEN** the corresponding bullet under `### Improvements applicable (this project)` describes the area (file globs or directory hints) and the justification, and SHALL NOT contain code blocks, line numbers, or diff sketches
- **AND** the matching bullet under `### Improvements applicable (universal)` describes what the version introduces without naming any path

#### Scenario: Exact-hit package carries the copied prior section

- **WHEN** the dispatch prompt carried an `EXACT` directive for `@nx/js 23.0.2 → 23.1.0`
- **THEN** `research.md` opens that package with `## @nx/js (23.0.2 → 23.1.0)` whose first line is `source: prior-run <runId>`
- **AND** the `(universal)` sections are the hub's `### Universal` content copied verbatim, with no fresh research performed for that package
- **AND** in `single-project` mode the `(this project)` sections are still authored by checking each copied finding against this codebase

#### Scenario: Research-phase error preserves changelog work

- **WHEN** phase 2 errors out for a group whose phase 1 succeeded
- **THEN** `groups/<id>/changelogs/` is preserved on disk, `_meta.json` is set to `phase: "research"`, `status: "error"`, `errorPhase: "research"`, and `research.md` is not written

---

### Requirement: Phase 4 — dossier synthesis by teammate

When all groups are healthy or the user chose `continue-without`, a named synthesizer teammate SHALL produce `dossier.md` at the plan-dir root. The main conversation SHALL NOT read the groups' `research.md` files or changelog bodies to produce or review the dossier — it handles paths and digests only. The single documented exception is the synthesizer terminal-failure fallback below.

In `single-project` mode at `level ∈ {patch, minor}` the file SHALL begin with an `H1` titled `Deep-<level> dossier: <slug>` followed by the five `H2` sections `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `<Level> bump set`, `Changelogs` in this fixed order, plus the optional `## Prior runs` in that position — immediately after `## Skipped or unavailable` and immediately before the bump set. The bump-set heading SHALL be the title-cased level followed by ` bump set` — interpolated from the `level` input (it SHALL NOT be hardcoded to `Patch`). Two deltas modify this baseline: for `level ∈ {major, engines}` a sixth H2 — `## Breaking changes & migration` — is prepended before `Improvements` (see the level-specific requirements); in `cross-project` mode the H1, the `Improvements` heading variant, and the `Cross-project bump set` heading follow the "Cross-project `dossier.md` template" requirement.

`## Prior runs` SHALL be written only when the `priorKnowledge` input carries at least one hit of class `exact`, `overlap`, or `prior`; with no such hit the section SHALL be omitted entirely — no heading and no sentinel line. When written it SHALL contain one `-` bullet per such hit, in the form `- <pkg> <from → to> — <class> hit from [[runs/<runId>]] (<level>, <mode>, <createdAt>)`. `related` entries SHALL NOT produce bullets. The section's position is the same at every level, before the mode's bump set and after `## Skipped or unavailable`, independently of the level-specific `## Breaking changes & migration` section. The layer-1 compliance script (`check-dossier.mjs`) SHALL accept the section as optional in exactly that position, SHALL NOT require it, and SHALL treat it as a structure violation anywhere else.

The teammate populates the non-chronology sections by reading the healthy groups' `research.md` files plus the mode's scan artifacts — `scan.json` in `single-project` mode; `scan-by-project.json` and `cross-project-plan.json` in `cross-project` mode (which has no `scan.json`). The bump-set section SHALL list every update from those artifacts regardless of group health — in `single-project` mode as a markdown table with columns `package | current → target | location`; in `cross-project` mode per the "Cross-project `dossier.md` template" requirement. The `Changelogs` section SHALL be the output of the deterministic chronology script (see "Changelog chronology section in dossier.md"); the teammate links or embeds that output and SHALL NOT re-type changelog bodies.

Before the dossier is surfaced to the user, the two-layer compliance check defined by the experiments-plugin "Dossier synthesis by teammate with two-layer compliance check" requirement SHALL run (repair loop capped at 3 rounds, residual violations escalated into the user gate).

**Synthesizer terminal-failure fallback.** If the synthesizer teammate terminates abnormally (e.g., an API failure) before completing `dossier.md`, the skill SHALL tear it down and re-dispatch a fresh synthesizer exactly once. On a second consecutive terminal failure the skill SHALL degrade to **direct synthesis**: the main agent authors the dossier from the healthy groups' `research.md` files and the script-assembled chronology (appended verbatim, never re-typed). Both compliance layers remain mandatory on the degraded path — the layer-2 fresh-eyes subagent is the independence backstop once author independence is lost — and the degraded dossier SHALL carry a one-line banner noting the fallback. Every input needed for recovery already lives on disk (per-group `research.md`, `chronology.md`, scan artifacts); no phase SHALL be re-run. This is the bounded, documented exception to the main-context diet rule: on this path the main agent MAY read only the healthy groups' `research.md` files, SHALL append `chronology.md` via a mechanical file-level append (never loading changelog bodies into context), and SHALL NOT read `changelogs/` or the `~/.claude/changelogs/` cache; the digest surfaced to the user keeps its bounded size.

The skill SHALL update the global `_meta.json.phase` to `"synthesis"` before dispatching the synthesizer teammate. The skill SHALL NOT set `_meta.json.phase` to `"executing"` or `"done"`; advancing past `"synthesis"` is consumer-owned (the calling command sets these phases when applying begins or completes).

#### Scenario: Dossier authored by the teammate, not the main

- **WHEN** phase 3 completes successfully or the user chose `continue-without`
- **THEN** `dossier.md` is authored by the named synthesizer teammate
- **AND** the main conversation does not read `research.md` files or changelog bodies

#### Scenario: Synthesizer dies twice → direct synthesis with both layers

- **WHEN** the synthesizer teammate terminates abnormally before writing `dossier.md` and its one re-dispatch also terminates abnormally
- **THEN** the main agent authors the dossier directly from the on-disk `research.md` files + script-assembled chronology, with a one-line fallback banner
- **AND** both compliance layers still run before the dossier is surfaced

#### Scenario: Dossier structure is fixed

- **WHEN** `dossier.md` is written for a `patch` run that received no `priorKnowledge` hit
- **THEN** it contains exactly the five H2 section headings `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `Patch bump set`, `Changelogs` in that order
- **AND** it contains no `## Prior runs` heading and no sentinel standing in for one
- **AND** the layer-1 compliance script accepts the file

#### Scenario: Prior runs present

- **WHEN** `dossier.md` is written for a `patch` run whose `priorKnowledge` carries one `exact` hit, one `prior` hit, and two `related` entries
- **THEN** a `## Prior runs` H2 sits immediately after `## Skipped or unavailable` and immediately before `## Patch bump set`
- **AND** it holds exactly two bullets, one per hit, each of the form `- <pkg> <from → to> — <class> hit from [[runs/<runId>]] (<level>, <mode>, <createdAt>)`
- **AND** the `related` entries produce no bullet
- **AND** the layer-1 compliance script accepts the section in that position

#### Scenario: Bump-set heading is level-derived

- **WHEN** `dossier.md` is written for a `minor` run
- **THEN** the bump-set heading reads `## Minor bump set` (not `## Patch bump set`)

#### Scenario: Bump set always present

- **WHEN** the scan returned 12 updates and 2 groups were skipped via `continue-without`
- **THEN** the `<Level> bump set` table contains all 12 updates regardless of which groups were skipped

#### Scenario: Phase set to synthesis before dispatch

- **WHEN** the workflow advances past the integrity gate
- **THEN** the global `_meta.json.phase` is set to `"synthesis"` before the synthesizer teammate is dispatched

---

### Requirement: Cleanup is opt-in at flow end

At the end of the workflow (after a successful execution step, after `cancel`, or after `abort`), the skill SHALL prompt via `AskUserQuestion` with options `delete-plan` (recursive removal of the plan directory) and `keep-plan` (leave it for inspection). The skill SHALL NOT delete the plan directory without explicit `delete-plan` selection.

When the consumer persisted the run into the knowledge base (via the `persist-run-knowledge` skill), it SHALL have done so **before** this prompt is raised, so `delete-plan` never destroys knowledge that is not already persisted outside the plan directory. The prompt's position at flow end is therefore unchanged and its options keep their meaning.

The workflow itself SHALL NOT write anywhere outside `~/.claude/experiments/plans/` and `~/.claude/changelogs/`. Persisting to the knowledge root is the consumer's step, not the workflow's, and the presence of `priorKnowledge` SHALL NOT grant the workflow any write path to it.

#### Scenario: Delete on confirmation

- **WHEN** the user selects `delete-plan` at flow end
- **THEN** the plan directory and all of its contents are recursively removed

#### Scenario: Keep on choice

- **WHEN** the user selects `keep-plan`
- **THEN** the plan directory remains on disk and will only be removed by a future stale-cleanup prompt

#### Scenario: Persistence precedes the cleanup prompt

- **WHEN** the consumer persisted the run via `persist-run-knowledge` and the user then selects `delete-plan`
- **THEN** the run's knowledge is already outside the plan directory and survives the removal
- **AND** the workflow itself wrote nothing outside `~/.claude/experiments/plans/` and `~/.claude/changelogs/` during the run

---

### Requirement: Cross-project subagent prompt template (mandatory)

When `mode === "cross-project"`, the workflow SHALL dispatch every phase-1+2 subagent with a prompt that:

1. **Omits** the `Codebase root: <CWD>` line present in single-project mode.
2. **Replaces** the phase-2 instructions with the cross-project contract:
   - Subagents SHALL NOT use `Read` / `Glob` / `Grep` on any project source file. Findings are derived solely from the changelog.
   - Subagents SHALL produce `research.md` with `### Workarounds resolved (universal)` and `### Improvements applicable (universal)` headings per package.
   - Each finding SHALL contain a universal description of what the version fixes or introduces, plus an optional `Hint:` line carrying abstract context — file globs by convention (`apps/**/use*.ts`), framework names (`React`, `Hono server-mode`), idiomatic patterns (`hooks pattern`, `Server Components`). The `Hint:` line SHALL NOT name specific project paths.
3. **Preserves** the rest of the mandatory contract from single-project mode:
   - Steps 1–4 (read `_meta.json`, invoke the `fetch-changelog` executable per package, write `error.txt` on per-package failure, do not terminate after the executable returns).
   - Steps 7–8 (advance `_meta.json` to `phase: "done"` / `status: "ok"` after writing `research.md`, or to `phase: "changelogs"` / `status: "error"` on every-package failure).
   - The final-line response format (`<groupId>: ok — <fetched>/<total> changelogs; <researched> researched.`).
4. **Appends**, when the `priorKnowledge` input is present, the same `## Prior knowledge (not verified for this project)` block defined by the "Subagent dispatch prompt template" requirement — same heading, same four directive forms, same per-group scoping and same omission when a group has no hit and no related entry — in its cross-project flavour: the `EXACT` line's bracketed `[single-project: …]` clause is dropped, because cross-project `research.md` has no `(this project)` sections. An `EXACT` hit therefore yields the copied `### Universal` section under `## <pkg> (<from → to>)` with first line `source: prior-run <runId>` and nothing else for that package. `OVERLAP`, `PRIOR`, and `RELATED` lines are worded identically to single-project mode.

The workflow SHALL NOT dispatch a cross-project subagent without this prompt template. Substituting a looser prompt is a spec violation.

#### Scenario: Cross-project subagent fetches via the executable

- **WHEN** the workflow dispatches a phase-1 subagent in cross-project mode
- **THEN** the subagent prompt SHALL NOT contain a `Codebase root:` line
- **AND** the prompt instructs the subagent to invoke the `fetch-changelog` executable per package

#### Scenario: Cross-project exact directive copies the universal section only

- **WHEN** the workflow dispatches a cross-project subagent for a group carrying an `exact` hit and `priorKnowledge` is present
- **THEN** the prompt carries the `## Prior knowledge (not verified for this project)` block with an `EXACT` line that omits the `[single-project: …]` clause
- **AND** the resulting `research.md` carries the copied `### Universal` content under `## <pkg> (<from → to>)` with first line `source: prior-run <runId>`, and no `(this project)` section

---

### Requirement: Cross-project `dossier.md` template

When `mode === "cross-project"`, phase 4 synthesis SHALL write `dossier.md` with the following exact structure (top-to-bottom):

- An H1 title formatted as `Deep-<level> dossier (cross-project): <slug>` (e.g. `# Deep-patch dossier (cross-project): commander-deep-patch`).
- A single descriptive line `Projects covered: <comma-separated project names from scan-by-project.json keys, alphabetical>`.
- The five H2 sections `Improvements (universal — applicability checked per project at apply time)`, `Workarounds resolved`, `Skipped or unavailable`, `Cross-project bump set`, `Changelogs`, in that order, plus the optional `## Prior runs` H2 in that position — after `Skipped or unavailable` and before `Cross-project bump set`.
- The `Improvements` section contains `-` bullets, each with the form `[<priority>] <package> — <opportunity>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Workarounds resolved` section contains `-` bullets, each with the form `<package> — <bug fixed in this version>. Hint: <abstract hint or "none">. (group: <groupId>; affects projects: <comma-separated project names>)`.
- The `Skipped or unavailable` section contains `-` bullets, each with the form `<groupId> — <reason>.`.
- The optional `Prior runs` section follows the "Phase 4 — dossier synthesis by teammate" requirement without variation: one bullet per `exact`/`overlap`/`prior` hit in the form `- <pkg> <from → to> — <class> hit from [[runs/<runId>]] (<level>, <mode>, <createdAt>)`, and the whole section omitted when there is no such hit.
- The `Cross-project bump set` section contains a markdown table whose columns are exactly `package`, `proposed target`, `projects (locations)`.
- The `Changelogs` section is the final section and SHALL follow the "Changelog chronology section in dossier.md" requirement (cross-project variant: representative `from → to`, dedup by package).

Rules:

- Sections with zero items still render with a single sentinel line: `_no improvements identified_`, `_no workarounds resolved_`, `_no skipped groups_`. The `Changelogs` section uses the per-package `_no changelog available_` sentinel defined in its own requirement. `Prior runs` is the one exception: it has no sentinel and is omitted entirely rather than rendered empty.
- The `affects projects:` list per improvement / workaround bullet is derived from `scan-by-project.json` and `cross-project-plan.json`: for the bullet's package, list every project name whose `ScanResult.updates[]` includes the package.
- The `Cross-project bump set` table cell format: `<projectName> (<location>)`, with `;` separating projects and `,` separating multiple locations within the same project.
- Table rows sorted by `package` name (alphabetical, stable).
- The `<reason>` cell in `Skipped or unavailable` follows the same rule as single-project: for `failed`/`missing` groups, copy `groups/<id>/_meta.json.errorReason` verbatim; for `expected-missing` groups (degraded path), use the constant string `research consolidated from cache (subagent dispatch limited)`.

#### Scenario: Cross-project dossier uses cross-project H1 and project-tagged bullets

- **WHEN** phase 4 completes in cross-project mode with `slug: "commander-deep-patch"`, `level: "patch"`, and three improvement bullets affecting different project subsets
- **THEN** `dossier.md` H1 reads `# Deep-patch dossier (cross-project): commander-deep-patch`
- **AND** the second line reads `Projects covered: <alphabetical comma-separated names>`
- **AND** each improvement bullet ends with `(group: <id>; affects projects: <names>)`

#### Scenario: Changelogs is the final cross-project section

- **WHEN** phase 4 completes in cross-project mode
- **THEN** `dossier.md` ends with the `## Changelogs` section, after `## Cross-project bump set`

#### Scenario: Cross-project prior runs sits before the bump set

- **WHEN** phase 4 completes in cross-project mode with two `overlap` hits in `priorKnowledge`
- **THEN** a `## Prior runs` H2 sits after `## Skipped or unavailable` and before `## Cross-project bump set`, holding one bullet per hit
- **AND** `## Changelogs` is still the final section
- **AND** with no `exact`/`overlap`/`prior` hit the section is absent altogether, with no sentinel line

#### Scenario: Single-project dossier template unchanged in shape

- **WHEN** phase 4 completes in single-project mode
- **THEN** `dossier.md` follows the single-project template (H1 `Deep-<level> dossier: <slug>`, sections `Improvements (applicable to this codebase)`, `Workarounds resolved`, `Skipped or unavailable`, `<Level> bump set`, `Changelogs`)
- **AND** improvement bullets carry `(group: <groupId>)` without the `affects projects:` tag
