# Knowledge-store note templates

The shape of the two files the knowledge store holds: the run note `runs/<runId>.md` and the package hub `packages/<pkgSlug>.md`. `copy-run-knowledge.mjs` writes both; `check-knowledge-note.mjs` validates both against what is written here.

**Ownership is the rule that matters.** Every byte outside a `<!-- slot:… -->` … `<!-- /slot -->` pair is script-owned: frontmatter, headings, callouts, markers, tables, the `## Applied` and `### Applied` blocks. A model fills slots and touches nothing else. The validator proves it by hashing the file outside the slots before and after.

Frontmatter is Obsidian-safe: scalars and lists of strings only. Nested mappings and lists of objects never appear — structure lives in `index.json` and in the note body.

The fenced templates below fix what a reader and a validator depend on: which keys exist and in what order, the exact marker and slot-pair spellings, the heading text and the order of sections. `copy-run-knowledge.mjs` owns the surrounding whitespace and the exact rendering of the script-built tables and lists.

---

## Run note — `runs/<runId>.md`

System-owned and regenerated whole on every re-persist of the same `runId`.

```markdown
---
type: run
runId: commander-deep-minor-minor-1784387463
level: minor
mode: cross-project
createdAt: 2026-07-18T15:11:03Z
persistedAt: 2026-09-13T10:02:11Z
projects: [dotfiles, monolab]
packages: ["@commitlint/cli@21.1.0..21.2.1", "@nx/js@23.0.2..23.1.0"]
outcome: applied
gateOption: apply-all
status: ok
source: run-dir
tags: [run, minor, cross-project]
---

# Run commander-deep-minor-minor-1784387463

> [!info] minor · cross-project · dotfiles, monolab · 2026-07-18T15:11:03Z — raw artefacts in [[runs/commander-deep-minor-minor-1784387463/dossier|dossier]], [[runs/commander-deep-minor-minor-1784387463/outcome.json|outcome]]

## Summary

<!-- slot:summary -->
<!-- /slot -->

## Packages

| package         | range           | hub                                           | outcome    |
| --------------- | --------------- | --------------------------------------------- | ---------- |
| @commitlint/cli | 21.1.0 → 21.2.1 | [[packages/@commitlint__cli#21.1.0 → 21.2.1]] | applicable |

## Applied

### dotfiles

- bumps: 2 applied, 0 failed
- changeset: approved — applicable 1, inapplicable 55
```

### Run-note frontmatter keys

Exactly these thirteen, in this order:

| Key           | Type            | Values / source                                                                                                                                               |
| ------------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `type`        | string          | always `run`                                                                                                                                                  |
| `runId`       | string          | `_meta.json.planDirName` verbatim — the one opaque identifier allowed to carry the legacy word                                                                |
| `level`       | string          | `patch` \| `minor` \| `major` \| `engines`                                                                                                                    |
| `mode`        | string          | `single-project` \| `cross-project`                                                                                                                           |
| `createdAt`   | string          | ISO 8601, from `_meta.json`                                                                                                                                   |
| `persistedAt` | string          | ISO 8601, stamped at persist                                                                                                                                  |
| `projects`    | list of strings | project slugs; a single-project run carries one entry                                                                                                         |
| `packages`    | list of strings | `"<name>@<from>..<to>"`                                                                                                                                       |
| `outcome`     | string          | `applied` \| `partial` \| `legacy`                                                                                                                            |
| `gateOption`  | string          | `apply-all` \| `apply-bumps-only` \| `pick-subset` \| `unknown`                                                                                               |
| `status`      | string          | `ok` \| `draft` — `draft` means the summary failed validation, and recall skips it                                                                            |
| `source`      | string          | `run-dir` \| `seeded-legacy`                                                                                                                                  |
| `tags`        | list of strings | always contains `run`; carries `<level>` and `<mode>`; gains `synthetic` when the run is flagged, and `distilled` when the run also carries `distilled: true` |

One conditional key: **`distilled: true`**, written by `copy-run-knowledge.mjs` when the run's research predated the universal / this-project split and it emitted the hub's `### Universal` slot for distillation. No model ever sets it. It is absent otherwise. (`specs/run-knowledge-store/spec.md` lists the thirteen keys above as "exactly these keys" and separately requires `distilled: true` on a distilled note; treat the thirteen as always-present and `distilled` as the one conditional addition.)

### Body sections, in this order

| Section                               | Owner                  | Content                                                                                                                                                                                                                                                         |
| ------------------------------------- | ---------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `# Run <runId>` + `> [!info]` callout | script                 | Level, mode, projects, `createdAt`; wikilinks to the raw `dossier` and `outcome`.                                                                                                                                                                               |
| `## Summary`                          | **subagent**, one slot | `<!-- slot:summary -->` … `<!-- /slot -->`. At most 8 lines. No fenced code block.                                                                                                                                                                              |
| `## Packages`                         | script                 | One row per persisted package: columns `package`, `range`, `hub`, `outcome` (`applicable`, `no findings` or `no changeset` — the package's own result, not the run's). The `hub` cell is a wikilink to the hub section, `[[packages/<pkgSlug>#<from> → <to>]]`. |
| `## Applied`                          | script                 | Built from `outcome.json` plus the copied changesets: per project, the bump count, the changeset status, and the applicable / inapplicable counts.                                                                                                              |

The `## Applied` rendering above is illustrative; `copy-run-knowledge.mjs` owns its exact layout. What is fixed is that it is script-built, carries those four facts per project, and is never edited by a model.

---

## Package hub — `packages/<pkgSlug>.md`

Accumulative: one `##` section per persisted range. `pkgSlug` follows the changelog cache's slug rule, so `@nx/js` becomes `@nx__js` and the hub shares a key with that package's cached changelogs.

```markdown
---
type: package
name: "@commitlint/cli"
ranges: ["21.1.0..21.2.1"]
runs: ["[[runs/commander-deep-minor-minor-1784387463]]"]
latest: 21.2.1
tags: [package]
---

# @commitlint/cli

## 21.1.0 → 21.2.1

<!-- run:commander-deep-minor-minor-1784387463 level:minor mode:cross-project synthetic:false supersededBy: -->

> [!info] Source: [[runs/commander-deep-minor-minor-1784387463]] · minor · cross-project · 2026-07-18T15:11:03Z

### Universal

<!-- slot:universal -->
<!-- /slot -->

### Applied

#### monolab

- applicable: Adopt the new `--no-color` flag in the lint script
- inapplicable: 55 title(s)

### Summary

<!-- slot:summary -->
<!-- /slot -->
```

### Hub frontmatter keys

Exactly these six:

| Key      | Type            | Values / source                                                  |
| -------- | --------------- | ---------------------------------------------------------------- |
| `type`   | string          | always `package`                                                 |
| `name`   | string          | the package name, `@scope/name` quoted                           |
| `ranges` | list of strings | `"<from>..<to>"`, deduplicated, appended as ranges are persisted |
| `runs`   | list of strings | wikilinks, `"[[runs/<runId>]]"`                                  |
| `latest` | string          | the maximum `to` across `ranges`                                 |
| `tags`   | list of strings | always contains `package`                                        |

### Section shape

Each persisted range is one `## <from> → <to>` section. Its first line is the marker, and the marker is the section's identity:

```text
<!-- run:<runId> level:<level> mode:<mode> synthetic:<true|false> supersededBy:<runId or empty> -->
```

`supersededBy` is written by `build-knowledge-index.mjs` into the **older** section's marker when a later section for the same package covers its range. It is informational: the superseded section keeps its content and stays in the hub.

Then, in this order:

| Section                     | Owner                                                                   | Content                                                                                                                                 |
| --------------------------- | ----------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `> [!info] Source:` callout | script                                                                  | Wikilink to the run note, plus level, mode, `createdAt`.                                                                                |
| `### Universal`             | script-copied, or **subagent** when the slot carries `<!-- distill -->` | `<!-- slot:universal -->` … `<!-- /slot -->`, holding the run's `(universal)` research findings. No line cap.                           |
| `### Applied`               | script                                                                  | Built from the copied `changesets/**/changeset.md`: per project, the applicable and inapplicable titles, or `no changeset` when absent. |
| `### Summary`               | **subagent**, one slot                                                  | `<!-- slot:summary -->` … `<!-- /slot -->`. At most 5 lines: what the range brings, who should care, what earlier projects did.         |

Re-persisting a run replaces the section carrying its marker in place — never appends a second one. Persisting a range the package does not yet hold appends a new `##` section and extends `ranges` and `runs`.

---

## Slots

Every slot a model may write, with its cap:

| File     | Slot                      | Cap       | Filled by                                         |
| -------- | ------------------------- | --------- | ------------------------------------------------- |
| run note | `<!-- slot:summary -->`   | ≤ 8 lines | subagent, always                                  |
| hub      | `<!-- slot:universal -->` | no cap    | script, except when it carries `<!-- distill -->` |
| hub      | `<!-- slot:summary -->`   | ≤ 5 lines | subagent, always                                  |

Rules the validator enforces on slot content:

- Content sits strictly between the `<!-- slot:… -->` and `<!-- /slot -->` lines. The marker lines themselves are never moved, rewritten or removed.
- The line cap counts the lines between the markers.
- No fenced code block inside any slot.
- No heading inside any slot contains the word "plan" — and neither does any heading anywhere in the store.
- Every byte outside the slot pairs is byte-identical to what the script wrote.

## Legacy distillation

A single-project `research.md` written before the universal / this-project split mixes universal facts with project globs, so the copy script cannot lift a `(universal)` section out of it. It emits the hub's `### Universal` slot holding one line:

```text
<!-- distill -->
```

That line is an instruction to the subagent, not content: the subagent replaces it with the universal findings it distils from the mixed sections, so the finished slot carries findings and no marker. The durable record that distillation happened is `distilled: true` on the run note, and the count reaches the caller's digest as `<d> distilled`.

## Synthetic runs

A run persisted with the synthetic flag carries the `synthetic` tag on its run note and `synthetic:true` in every hub marker it writes. Both stay on disk and stay readable by a human; neither is ever returned as a recall hit.

## The pre-image marker

Every run note and every hub ends with one script-owned line:

```text
<!-- knowledge:preimage <sha256> -->
```

It is the hash of the file with every slot blanked — the "everything outside the slots" bytes, as `copy-run-knowledge.mjs` last wrote them. `check-knowledge-note.mjs` recomputes it to prove no model edited frontmatter, a heading, a callout, a marker or a table. Any script that rewrites script-owned content afterwards restamps it; `build-knowledge-index.mjs` does so when it writes `supersededBy` back into a marker. Removing the line is itself a violation (`missing preimage marker`).
