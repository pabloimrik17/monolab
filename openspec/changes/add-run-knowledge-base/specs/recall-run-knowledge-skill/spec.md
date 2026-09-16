## Purpose

Consults the persisted run knowledge base before a deep update run dispatches its research workflow, classifies every scanned `pkg (from → to)` against what earlier runs already concluded, and hands the result to the workflow as `priorKnowledge` without pulling a single note body through the main window.

## ADDED Requirements

### Requirement: Skill file exists

The skill SHALL exist at `claude-plugins/experiments/skills/recall-run-knowledge/SKILL.md` with YAML frontmatter containing `name: recall-run-knowledge` and a `description` that triggers when a deep update run has grouped its packages and is about to dispatch research.

The match-class contract SHALL live at `claude-plugins/experiments/skills/recall-run-knowledge/reference/match-classes.md`, so the workflow and both orchestrators reference one file instead of restating it. `SKILL.md` SHALL stay a procedure and SHALL NOT carry a second copy of the class table.

#### Scenario: Skill file location

- **WHEN** examining the experiments plugin structure
- **THEN** `skills/recall-run-knowledge/SKILL.md` SHALL exist with frontmatter `name: recall-run-knowledge`
- **AND** `skills/recall-run-knowledge/reference/match-classes.md` SHALL exist

#### Scenario: Class table lives in reference only

- **WHEN** examining `SKILL.md`
- **THEN** it SHALL point to `reference/match-classes.md` for the class conditions
- **AND** it SHALL NOT restate the four class conditions inline

---

### Requirement: Trigger point and inputs

The skill SHALL be invoked by both deep orchestrators after `group-packages-for-research` has emitted its groups and before the `parallel-research-workflow` dispatch: in the single-project deep family as Step 3.5, between Step 3 (group) and Step 4 (workflow dispatch); in the cross-project orchestrator as Step 6.5.3b, between 6.5.2 (group) and 6.5.4 (invoke), over the deduplicated update set.

Its input SHALL be the emitted `groups[]` — each group carrying its `groupId`, its `bucketKey` and its `packages[]` with `name`, `from` and `to` — plus the run's `level` and `mode`. The skill SHALL NOT re-derive grouping, SHALL NOT re-scan the workspace, and SHALL NOT alter the group membership it was given.

#### Scenario: Single-project insertion point

- **WHEN** a single-project deep run has completed Step 3 grouping
- **THEN** recall SHALL run as Step 3.5 before the Step 4 workflow dispatch

#### Scenario: Cross-project insertion point

- **WHEN** the cross-project orchestrator has completed 6.5.2 grouping
- **THEN** recall SHALL run as 6.5.3b over the deduplicated set before the 6.5.4 workflow invocation

#### Scenario: Groups are not modified

- **WHEN** recall classifies a package as `exact`
- **THEN** that package SHALL remain in its group with its `from` and `to` unchanged
- **AND** the group's membership SHALL be identical to what grouping emitted

---

### Requirement: No-op when the base is absent

When the resolved knowledge root does not exist, or exists without an `index.json`, the skill SHALL return `{ "hits": [] }` and SHALL emit the digest `Knowledge: no base at <root>`.

In that case the run SHALL be byte-for-byte today's run plus that one digest line: no `priorKnowledge` SHALL be passed to the workflow, no prompt block SHALL be appended, and no `## Prior runs` section SHALL appear in the dossier.

The same no-op SHALL apply when the base exists but yields no hit and no related entry.

#### Scenario: Missing knowledge root

- **WHEN** the resolved knowledge root does not exist
- **THEN** the skill SHALL return `{ "hits": [] }`
- **AND** SHALL print `Knowledge: no base at <root>`
- **AND** SHALL NOT pass `priorKnowledge` to the workflow

#### Scenario: Root without an index

- **WHEN** the knowledge root exists but contains no `index.json`
- **THEN** the skill SHALL behave exactly as for a missing root

#### Scenario: Run otherwise unchanged

- **WHEN** recall is a no-op
- **THEN** the subagent prompts SHALL be the prompts of a run without this change
- **AND** the dossier SHALL carry no `## Prior runs` section

---

### Requirement: Match classes

For every scanned package the skill SHALL classify the current `(from → to)` range against the base via `match-knowledge.mjs` into exactly one of four classes. Unless stated otherwise a class requires the candidate to carry the same `name` as the scanned package.

- `exact` — `prior.from == cur.from && prior.to == cur.to`. The hit SHALL carry `delta: null` and SHALL direct the research subagent to copy the hub's `### Universal` section instead of researching the package.
- `overlap` — the ranges intersect and are not equal. The hit SHALL carry a `delta` naming the sub-range or sub-ranges of the current range that the prior range does not cover, and SHALL restrict fresh research to that delta.
- `prior` — `prior.to <= cur.from`. The hit SHALL contribute applicability only, from the hub's `### Applied`, and SHALL NOT contribute findings.
- `related` — no same-name hit exists for the package and another package in the same `bucketKey` has a hub. The entry SHALL contribute context paths only and SHALL appear in `related[]`, never in `hits[]`.

A package SHALL receive at most one same-name hit. When several candidates match, the skill SHALL prefer `exact` over `overlap` over `prior`, and SHALL break a remaining tie by the newest `createdAt`.

#### Scenario: Identical range classifies as exact

- **WHEN** the base holds `@nx/js 23.0.2 → 23.1.0` and the current scan bumps `@nx/js` from `23.0.2` to `23.1.0`
- **THEN** the hit SHALL carry `"class": "exact"`
- **AND** `delta` SHALL be `null`

#### Scenario: Disjoint earlier range classifies as prior

- **WHEN** the base holds `@nx/js 23.0.2 → 23.1.0` and the current scan bumps `@nx/js` from `23.1.0` to `23.2.0`
- **THEN** the hit SHALL carry `"class": "prior"`
- **AND** it SHALL offer the hub's `### Applied` section only, never its findings

#### Scenario: Intersecting range classifies as overlap with a delta

- **WHEN** the base holds `@nx/js 23.0.2 → 23.1.0` and the current scan bumps `@nx/js` from `23.0.5` to `23.3.0`
- **THEN** the hit SHALL carry `"class": "overlap"`
- **AND** `delta` SHALL be `(23.1.0, 23.3.0]`

#### Scenario: Sibling in the same bucket is related

- **WHEN** `@nx/workspace` has no hub of its own and `@nx/js` in the same `bucketKey` `nx` does
- **THEN** `@nx/workspace` SHALL appear in `related[]` with `bucketKey` `nx` and the sibling hub path
- **AND** SHALL NOT appear in `hits[]`

---

### Requirement: Exclusions and staleness

A run note tagged `synthetic` or carrying `status: draft` SHALL never be a match candidate, in any class, including as a sibling hub behind a `related` entry.

Staleness SHALL be decided by version comparison only. The skill SHALL NOT discard, downgrade or deprioritise a candidate because of its age; `createdAt` SHALL serve only as the tiebreaker between candidates of the same class, and SHALL NOT act as a filter.

#### Scenario: Synthetic note yields no hit

- **WHEN** the only candidate for `@nx/js 23.0.2 → 23.1.0` comes from a run note tagged `synthetic` with an identical range
- **THEN** the package SHALL receive no hit

#### Scenario: Draft note yields no hit

- **WHEN** the only candidate for a package comes from a run note whose frontmatter reads `status: draft`
- **THEN** the package SHALL receive no hit

#### Scenario: Age never filters

- **WHEN** an `exact` candidate is the oldest note in the base
- **THEN** it SHALL still be emitted as an `exact` hit

#### Scenario: Age breaks a tie

- **WHEN** two `exact` candidates exist for the same package and range
- **THEN** the one with the newest `createdAt` SHALL be the emitted hit

---

### Requirement: Output contract

The skill SHALL produce one JSON object with five top-level keys: the three below plus the two the matcher sets, `root` and `baseAbsent`.

`hits[]` — one entry per classified package, each carrying `name`, `from`, `to`, `groupId`, `class`, `runId`, `priorFrom`, `priorTo`, `delta`, `hubPath`, `anchor`, `notePath`, `level`, `mode` and `createdAt`. `hubPath` and `notePath` SHALL be relative to the knowledge root; `anchor` SHALL be the hub section heading text, e.g. `23.0.2 → 23.1.0`.

`related[]` — one entry per context-only package, each carrying `name`, `groupId`, `bucketKey` and `hubs[]`.

`summary` — the counts `exact`, `overlap`, `prior`, `related` and `packages`, where `packages` is the number of scanned packages considered.

`root` — the resolved absolute knowledge root. It SHALL be present on every output, including the absent-base and failure shapes, because `hubPath` and `notePath` are relative to it and the dispatch prompt's `Knowledge root:` line is what makes them openable.

`baseAbsent` — `true` when the root is missing or holds no `index.json`, `false` otherwise. A base that exists but cannot be rebuilt SHALL NOT set it; that case SHALL carry `baseAbsent: false` and an additional `error` key naming the reason, so the caller reports `recall failed` rather than asserting a base that is not there.

This is the object the workflow receives as `priorKnowledge`, so it SHALL match the shape the `parallel-research-workflow` delta fixes for that input.

The skill SHALL pass this object unchanged to `parallel-research-workflow` as its optional `priorKnowledge` input. It SHALL NOT reshape, trim or summarise the object on the way, and it SHALL NOT inject prior text into subagent prompts by any route other than that input.

#### Scenario: Hit carries the full field set

- **WHEN** a package matches
- **THEN** its `hits[]` entry SHALL carry `name`, `from`, `to`, `groupId`, `class`, `runId`, `priorFrom`, `priorTo`, `delta`, `hubPath`, `anchor`, `notePath`, `level`, `mode` and `createdAt`

#### Scenario: Summary counts agree with the arrays

- **WHEN** the output holds one `exact` hit and one `related` entry over seven scanned packages
- **THEN** `summary` SHALL read `exact: 1`, `overlap: 0`, `prior: 0`, `related: 1`, `packages: 7`

#### Scenario: Object reaches the workflow unchanged

- **WHEN** at least one hit exists
- **THEN** the same object SHALL be passed to the workflow as `priorKnowledge`
- **AND** no other channel SHALL carry prior text into the run

---

### Requirement: Main-window context diet

The main window SHALL receive exactly one line from recall: `Knowledge: <e> exact, <o> overlap, <p> prior, <r> related of <n> packages`, where the counts are the fields of `summary`.

The main SHALL NOT open a package hub, a run note or any raw run artefact under the knowledge root. Every read of a note body SHALL happen in a subagent or in a script.

#### Scenario: Digest is the whole main-window output

- **WHEN** recall finds one `exact` hit and one `related` entry over seven packages
- **THEN** the main SHALL receive `Knowledge: 1 exact, 0 overlap, 0 prior, 1 related of 7 packages`
- **AND** no hub or note content SHALL enter the main window

#### Scenario: Hub bodies stay out of the main

- **WHEN** a hit names a `hubPath`
- **THEN** the main SHALL hold the path only
- **AND** the hub's `### Universal` section SHALL be read by the research subagent, not by the main

---

### Requirement: Recall is read-only

Recall SHALL NOT write, move or delete any run artefact, workspace file, registry entry or changelog cache entry.

The groups SHALL reach the matcher on stdin (`--groups -`) rather than through a file, so that no scratch file outside the knowledge root is ever created. The single disk write recall MAY cause is the index rebuild performed by `build-knowledge-index.mjs` before matching, and that write SHALL stay inside the knowledge root. It SHALL write `index.json`, and it MAY refresh a `supersededBy` value in a hub's section marker — the one write the store delta requires of the index builder, script-owned in both cases and re-stamping the note's pre-image. No slot content, no frontmatter other than that marker, and no run note SHALL be altered. A failure of that rebuild SHALL NOT abort the run; it SHALL degrade to no `priorKnowledge` and the `recall failed` digest.

#### Scenario: No write outside the knowledge root

- **WHEN** recall runs
- **THEN** no file outside the knowledge root SHALL be created, modified or deleted
- **AND** the groups SHALL be passed to the matcher on stdin rather than written to a scratch file

#### Scenario: Recall failure is non-fatal

- **WHEN** the matcher exits non-zero for any reason other than an absent base
- **THEN** the run SHALL continue with no `priorKnowledge`
- **AND** the digest SHALL read `Knowledge: recall failed (<reason>)`

#### Scenario: Index rebuild is the only write

- **WHEN** recall rebuilds the index before matching
- **THEN** every file written SHALL be under the knowledge root
- **AND** the writes SHALL be limited to `index.json` and, where a later range now covers an earlier one, that hub section marker's `supersededBy` value with the note's pre-image re-stamped
- **AND** no slot content and no run note SHALL be modified

#### Scenario: Rebuild failure degrades, never aborts

- **WHEN** the index rebuild fails
- **THEN** recall SHALL return `{ "hits": [] }` with the digest `Knowledge: recall failed (<reason>)`
- **AND** the run SHALL continue to the workflow dispatch
- **AND** it SHALL NOT report the absent-base digest, which asserts a base that is missing rather than one that could not be read
