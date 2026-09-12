## Purpose

Defines the knowledge store: an append-only, Obsidian-compatible vault on the user's filesystem that holds the durable result of applied deep-update runs — one immutable note per run, one accumulative hub per package, plus a rebuildable index — so a later run on any project can reuse research it already paid for.

## ADDED Requirements

### Requirement: Store location and `knowledge_root` override

The knowledge store SHALL live at `~/.claude/experiments/knowledge/` by default, a sibling of `~/.claude/experiments/plans/` in the same user-scoped zone as the commander registry.

The experiments plugin manifest SHALL declare `userConfig.knowledge_root` (type string, default `""`). A non-empty value SHALL override the default root. A leading `~` SHALL be expanded to the user's home directory. A relative value SHALL be rejected: resolution SHALL abort with the exact message `Error: knowledge_root must be absolute or ~-prefixed.`, SHALL exit non-zero, and SHALL create no directory and write no file.

Root resolution SHALL exist in exactly one place, `claude-plugins/experiments/scripts/lib/knowledge.mjs`. Skills and commands SHALL obtain the root by invoking a script that calls it; they SHALL NOT restate or re-implement the expansion or validation rule.

#### Scenario: Default root when the override is unset

- **WHEN** `knowledge_root` is absent or is the empty string
- **THEN** the resolved root SHALL be `~/.claude/experiments/knowledge/`
- **AND** the `~/.claude/experiments/plans/` directory SHALL NOT be read or written by resolution

#### Scenario: Tilde-prefixed override is expanded

- **WHEN** `knowledge_root` is `~/vaults/updates`
- **THEN** the resolved root SHALL be the user's home directory joined with `vaults/updates`

#### Scenario: Relative override aborts with the exact message

- **WHEN** `knowledge_root` is `rel/path`
- **THEN** resolution SHALL abort with `Error: knowledge_root must be absolute or ~-prefixed.`
- **AND** no directory under the current working directory or under the default root SHALL be created

---

### Requirement: Vault layout and identifiers

The store SHALL have exactly this layout under the resolved root:

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

The first persist into a non-existent root SHALL bootstrap this skeleton; a persist into an existing root SHALL add to it without rewriting unrelated files.

`runId` SHALL be the run directory's `_meta.json.planDirName` verbatim, for example `commander-deep-minor-minor-1784387463`. `pkgSlug` SHALL follow the changelog cache's slug rule — `@scope/name` becomes `@scope__name` — so a hub and that package's cached changelogs share one key.

The raw copy under `runs/<runId>/` SHALL contain only the allowlisted artefacts named above. Changelog bodies SHALL be linked to the existing `~/.claude/changelogs/` cache and SHALL NOT be copied into the store. `changelogs/`, `logs/`, `chronology.md`, and the plan-mode plan SHALL NOT be copied.

#### Scenario: First persist bootstraps the skeleton

- **WHEN** a run is persisted and the resolved root does not exist
- **THEN** the root SHALL be created with `runs/`, `packages/`, `.obsidian/app.json` containing `{}`, `Runs.base`, and `Packages.base`
- **AND** `index.json` SHALL exist after the persist completes

#### Scenario: Excluded artefacts never reach the raw copy

- **WHEN** a run directory containing `changelogs/`, `logs/`, and `chronology.md` is persisted
- **THEN** `runs/<runId>/` SHALL contain `dossier.md`, `_meta.json`, `outcome.json`, the per-group `research.md` and `_meta.json`, and the per-project `changeset.md`
- **AND** SHALL contain no `changelogs/` directory, no `logs/` directory, and no `chronology.md`

#### Scenario: Scoped package names are slugged like the changelog cache

- **WHEN** the package `@nx/js` is persisted
- **THEN** its hub SHALL be `packages/@nx__js.md`
- **AND** the slug SHALL equal the key used by the `~/.claude/changelogs/` cache for the same package

---

### Requirement: No "plan" in store names beyond the opaque `runId`

No file name, directory name, frontmatter key, frontmatter value, heading, marker keyword, or Bases view name in the store SHALL contain the word "plan". The store's vocabulary SHALL be `run`, `knowledge`, `note`, and `hub`.

The single carve-out SHALL be the value of `runId`, which is copied verbatim from `_meta.json.planDirName` and is treated as an opaque identifier: the word survives inside that string only, and SHALL NOT appear in the key naming it.

#### Scenario: Vault names are free of the reserved word

- **WHEN** every file name, directory name, frontmatter key, and Markdown heading under the root is inspected
- **THEN** none SHALL contain "plan" in any casing

#### Scenario: The identifier carve-out is value-only

- **WHEN** a run whose `_meta.json.planDirName` is `commander-deep-minor-minor-1784387463` is persisted
- **THEN** the frontmatter key SHALL be `runId` and its value SHALL be that string verbatim
- **AND** no key named after the legacy field SHALL appear in the note

---

### Requirement: Run note contract

`runs/<runId>.md` SHALL be system-owned and SHALL be regenerated on every re-persist of the same `runId`.

Its frontmatter SHALL carry exactly these keys: `type` (always `run`), `runId`, `level` (`patch` | `minor` | `major` | `engines`), `mode` (`single-project` | `cross-project`), `createdAt` (from `_meta.json`), `persistedAt`, `projects` (list of project slugs; a single-project run carries one entry), `packages` (list of `"<name>@<from>..<to>"` strings), `outcome` (`applied` | `partial` | `legacy`), `gateOption` (`apply-all` | `apply-bumps-only` | `pick-subset` | `unknown`), `status` (`ok` | `draft`), `source` (`run-dir` | `seeded-legacy`), and `tags` (list, always including `run`, plus `synthetic` when the run is flagged).

Every frontmatter value SHALL be a scalar or a list of strings. Nested mappings and lists of objects SHALL NOT appear in frontmatter; structured data belongs in `index.json` and in the note body.

The body SHALL open with the heading `# Run <runId>` followed by an `> [!info]` callout naming level, mode, projects and `createdAt` and linking the raw `dossier` and `outcome`, then these sections in this order:

- `## Summary` — one `<!-- slot:summary -->` … `<!-- /slot -->` pair, filled by a subagent, at most 8 lines, no code blocks.
- `## Packages` — a script-built table with one row per persisted package carrying its range, a wikilink to the hub section, and its outcome.
- `## Applied` — script-built from `outcome.json` and the copied changesets: per project, the bump count, the changeset status, and the applicable / inapplicable counts.

Nothing outside a `<!-- slot -->` pair SHALL be written or edited by a model.

#### Scenario: Frontmatter stays flat

- **WHEN** a run note is written for a cross-project run over two projects and seven packages
- **THEN** `projects` and `packages` SHALL be lists of strings
- **AND** no frontmatter value SHALL be a mapping or a list of mappings

#### Scenario: Summary respects its cap and its slot

- **WHEN** the `## Summary` slot is filled
- **THEN** the content between `<!-- slot:summary -->` and `<!-- /slot -->` SHALL be at most 8 lines and SHALL contain no fenced code block
- **AND** the `## Packages` and `## Applied` sections SHALL be byte-identical to what the script wrote

#### Scenario: Re-persisting the same run regenerates the note

- **WHEN** the same `runId` is persisted a second time
- **THEN** `runs/<runId>.md` SHALL be regenerated in place with a new `persistedAt`
- **AND** no second note file for that run SHALL be created

---

### Requirement: Package hub contract

`packages/<pkgSlug>.md` SHALL accumulate one section per persisted range for that package.

Its frontmatter SHALL carry exactly these keys: `type` (always `package`), `name` (the package name), `ranges` (list of `"<from>..<to>"` strings, deduplicated, appended as ranges are persisted), `runs` (list of wikilink strings of the form `"[[runs/<runId>]]"`), `latest` (the maximum `to` across `ranges`), and `tags` (list, always including `package`). Values SHALL be scalars or lists of strings only.

The body SHALL open with `# <name>`. Each persisted range SHALL be one `## <from> → <to>` section whose first line is the marker

```text
<!-- run:<runId> level:<level> mode:<mode> synthetic:<true|false> supersededBy:<runId or empty> -->
```

followed by an `> [!info] Source:` callout linking the run note, and then, in this order:

- `### Universal` — one `<!-- slot:universal -->` … `<!-- /slot -->` pair, script-copied from the run's `(universal)` research sections.
- `### Applied` — script-built from the copied `changesets/**/changeset.md`: per project, the applicable and inapplicable titles, or `no changeset` when absent.
- `### Summary` — one `<!-- slot:summary -->` … `<!-- /slot -->` pair, filled by a subagent, at most 5 lines: what the range brings, who should care, what earlier projects did.

For a legacy run whose research carries no universal / this-project split, the `### Universal` slot SHALL be emitted empty with a `<!-- distill -->` marker for the subagent to fill by distillation, and the run note SHALL gain `distilled: true`.

Section identity SHALL be the `<!-- run:<runId> … -->` marker. Re-persisting a run SHALL replace that run's section in place; it SHALL NOT append a duplicate. Persisting a range not yet present for the package SHALL append a new `##` section and extend `ranges` and `runs`. Everything outside a `<!-- slot -->` pair SHALL be script-owned and SHALL NOT be edited by a model.

#### Scenario: Re-persisting replaces the section rather than duplicating it

- **WHEN** a run already recorded in `packages/@nx__js.md` is persisted again
- **THEN** the hub SHALL contain exactly one section whose marker names that `runId`
- **AND** the section's `### Universal` and `### Applied` content SHALL be rewritten from the current raw copy

#### Scenario: A new range appends a section

- **WHEN** `@nx/js 23.1.0 → 23.2.0` is persisted and the hub already holds `23.0.2 → 23.1.0`
- **THEN** a second `##` section SHALL be appended with its own marker
- **AND** `ranges` SHALL list both ranges and `latest` SHALL become `23.2.0`

#### Scenario: Legacy research is marked for distillation

- **WHEN** a run whose `research.md` predates the universal / this-project split is persisted
- **THEN** the hub's `### Universal` slot SHALL be emitted empty carrying `<!-- distill -->`
- **AND** the run note SHALL carry `distilled: true`

---

### Requirement: `outcome.json` contract

The persist skill SHALL write `outcome.json` into the run directory — from the outcome object the orchestrator assembles, stamping `recordedAt` — and copy it with the run, making the apply result durable. Its shape SHALL be:

```jsonc
{
  "runId": "<planDirName>",
  "level": "minor",
  "mode": "cross-project",
  "gateOption": "apply-all", // apply-all | apply-bumps-only | pick-subset | unknown (legacy)
  "recordedAt": "<ISO 8601>",
  "projects": [
    {
      "projectName": "monolab", // single-project: the run slug
      "mechanism": "apply-npm-updates", // apply-npm-updates | apply-engine-bumps | reconstructed (legacy)
      "bumps": {
        /* verbatim result fragment of the mechanism: appliedGeneric/appliedOverrides/installRan/logPath/failure, or applied/failure for engines */
      },
      "changeset": {
        "status": "approved", // approved | rejected | skipped | not-run | unknown
        "path": "changesets/monolab/changeset.md", // run-dir-relative, or null
        "applicable": 1,
        "inapplicable": 55, // counts parsed from changeset.md headings; null when absent
      },
    },
  ],
}
```

`bumps` SHALL hold the mechanism's result fragment verbatim; it SHALL NOT be reshaped or summarised.

The run-level `outcome` SHALL derive from `projects[]`: `applied` when every project's `bumps.failure` is `null`, `partial` when at least one is `null`, and `failed` otherwise. Only `applied` and `partial` runs SHALL be persisted; a `failed` run and a cancelled run SHALL write nothing to the store. A run whose applicable count is zero SHALL still be persisted, because "nothing to apply at this range" is itself reusable.

A run seeded from a pre-existing run directory SHALL carry `mechanism: "reconstructed"`, `gateOption: "unknown"`, changeset counts parsed from the changeset file, and `bumps` inferred from the run's apply log presence; its note SHALL carry `outcome: legacy` and `source: seeded-legacy`. A run seeded with the synthetic flag SHALL carry the `synthetic` tag on its note and `synthetic:true` in every hub marker it writes.

#### Scenario: Mixed failures yield a partial run

- **WHEN** a cross-project run has one project with `bumps.failure` null and one with a non-null failure
- **THEN** the run-level `outcome` SHALL be `partial`
- **AND** the run SHALL be persisted

#### Scenario: A fully failed run persists nothing

- **WHEN** every project in a run has a non-null `bumps.failure`
- **THEN** the run-level `outcome` SHALL be `failed`
- **AND** no file under the resolved root SHALL be created or modified

#### Scenario: A zero-applicable run is still persisted

- **WHEN** an applied run's changeset reports `applicable: 0`
- **THEN** a run note and the corresponding hub sections SHALL be written
- **AND** the run note `outcome` SHALL be `applied`

---

### Requirement: `index.json` is a rebuildable cache, never the source of truth

`index.json` SHALL be rebuilt from disk — note frontmatter, hub markers, and the copied `groups/*/_meta.json` — after every persist and before every match. It SHALL NOT be hand-edited, SHALL NOT be the authority for any fact, and deleting it SHALL be non-destructive: a rebuild SHALL restore it from the notes and hubs alone.

It SHALL carry a `runs` array, one entry per persisted run, with at least `runId`, `notePath`, `level`, `mode`, `createdAt`, `outcome`, `status`, `projects`, and `tags`; and a `packages` array, one entry per hub, with at least `name`, `hubPath`, `latest`, and a `ranges` array whose entries carry at least `from`, `to`, `anchor`, `runId`, `notePath`, `level`, `mode`, `createdAt`, `status`, `groupId`, `bucketKey`, `synthetic`, and `supersededBy`.

The index builder SHALL compute `supersededBy` — a later section for the same package whose range covers an older one — and SHALL write it back into the older section's marker in the hub. `supersededBy` SHALL be informational: it SHALL NOT remove, hide, or rewrite the superseded section.

#### Scenario: The index survives deletion

- **WHEN** `index.json` is deleted and the index is rebuilt
- **THEN** the rebuilt file SHALL list every persisted run and every hub range present on disk
- **AND** no note or hub SHALL be modified other than `supersededBy` marker updates

#### Scenario: Supersession is recorded in the older marker

- **WHEN** a range covering an already-persisted older range for the same package is indexed
- **THEN** the older section's marker SHALL carry `supersededBy:<runId>` of the covering run
- **AND** the older section's `### Universal`, `### Applied`, and `### Summary` content SHALL remain unchanged

#### Scenario: A draft note is not a recall candidate

- **WHEN** a run note carries `status: draft`
- **THEN** the index SHALL record it as `draft`
- **AND** it SHALL NOT be offered as a candidate to any match against the store

---

### Requirement: Append-only lifecycle

The store SHALL be append-only. Nothing in it SHALL be deleted automatically, and no time-based expiry SHALL apply: a note's or a range's usefulness is decided by version coverage, never by age. The 10-day stale cleanup of `~/.claude/experiments/plans/` SHALL NOT reach the knowledge root.

Only runs that reached an `applied` or `partial` outcome, or an explicit persist of an existing run directory, SHALL write to the store. Re-persisting an already-present run SHALL be idempotent: the run note is regenerated and the hub sections keyed by its marker are replaced, with no duplicates and no growth in file count.

A note with `status: draft` and any note carrying the `synthetic` tag SHALL be excluded from recall; both SHALL remain on disk and SHALL remain visible to a human reading the vault.

Pruning SHALL be manual only. No skill, command, or script in this change SHALL remove a run note, a hub, a hub section, or a raw copy.

#### Scenario: Age never removes knowledge

- **WHEN** a run note is older than any staleness threshold applied to run directories
- **THEN** it SHALL remain in the store unchanged
- **AND** it SHALL remain a recall candidate if its `status` is `ok` and it carries no `synthetic` tag

#### Scenario: Synthetic notes stay visible but unusable for recall

- **WHEN** a run persisted with the synthetic flag is indexed
- **THEN** its note and hub sections SHALL exist on disk with the `synthetic` tag and `synthetic:true` markers
- **AND** it SHALL NOT be returned as a hit by a match against the store

#### Scenario: No automatic deletion path exists

- **WHEN** any persist, index rebuild, or match runs against a populated store
- **THEN** no existing run note, hub, hub section, or raw copy SHALL be deleted

---

### Requirement: Obsidian compatibility with zero runtime dependency

The store SHALL open as an Obsidian vault as it stands: `.obsidian/app.json` containing `{}` marks the folder, and `Runs.base` and `Packages.base` provide views filtered on the `type` property. Notes SHALL use Obsidian-native constructs — YAML frontmatter as properties, `[[wikilinks]]` between run notes and hubs, `tags`, and `> [!info]` callouts.

Nothing at runtime SHALL require the Obsidian application, its CLI, or any MCP server. Every write, validation, index rebuild, and match SHALL be performed by the plugin's own zero-dependency scripts, and the store SHALL be equally queryable with `rg` over the Markdown plus its frontmatter.

The vault files SHALL be plain UTF-8 Markdown and JSON, so that removing the `.obsidian/` directory and the `*.base` views SHALL leave every note, hub, and index readable and usable.

#### Scenario: The vault opens without preparation

- **WHEN** the resolved root is opened as an Obsidian vault
- **THEN** run notes and hubs SHALL show their frontmatter as properties, their tags, their callouts, and working links between a run note and each hub it touches

#### Scenario: No Obsidian dependency at runtime

- **WHEN** a run is persisted, the index is rebuilt, and a match is run on a machine where Obsidian is not installed
- **THEN** every step SHALL complete successfully
- **AND** no invocation of the Obsidian application, its CLI, or an MCP server SHALL occur

#### Scenario: Plain-text queryability

- **WHEN** the store is searched with `rg` for a package name and for the frontmatter key `outcome`
- **THEN** the matching hub and the matching run notes SHALL be found from the Markdown alone
- **AND** removing `.obsidian/` and the `*.base` files SHALL leave those results unchanged
