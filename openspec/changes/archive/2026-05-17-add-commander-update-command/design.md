# Design: `commander-update`

## Context

`commander-add` (MON-129) defined the registry path, schema (v2), and the `add(record)` write contract. `commander-delete` (MON-130) closed the inverse. `commander-list` (MON-132) reads and surfaces drift. The missing piece is **in-place metadata edit**: a user adopts a new framework, refines the description, or wants to backfill `repoType` on a legacy v1 record. Today the only path is delete + re-add, which destroys `createdAt`, is racy if other commands read mid-flow, and is needlessly destructive.

Constraints carry over from the sibling commands: no runtime code, command is a single Markdown file dispatching built-in tools, atomic writes via temp + rename, no lockfile, single-invocation assumption.

Three decisions warrant a design doc: which fields are editable (ticket says three; registry spec earmarks drift remediation), how Haiku re-scan fits the update flow (default-off vs. default-on), and how the diff render handles legacy v1 drift.

## Goals / Non-Goals

**Goals**

- Edit one or more of `keywords`, `description`, `specialRules`, `repoType` on a registered project without disturbing `createdAt` or any other record.
- Show `current → proposed` diff before any write so the user can verify intent.
- Refresh `updatedAt` on every successful write.
- Reuse `commander-add`'s atomic-write recipe, `commander-normalize` skill, and `commander-delete`'s target-resolution pattern verbatim.
- Provide a clean remediation path for legacy v1 drift (record without `repoType`) via the same edit flow — no silent migration.
- Stay shippable as a single Markdown command.

**Non-Goals**

- Editing `path`, `monorepoRoot`, or renaming `name`. Path move is a different mental model (re-validate, possibly re-detect topology, possibly invalidate `monorepoRoot`); rename breaks the key invariant. Separate ticket if a real use case appears.
- Auto-detection by default. Update is opt-in re-scan via `--refresh` or interactive "Re-scan" pick.
- Bulk update (`--all`, predicate filters), `--dry-run`, `--yes`/`--force`. Same YAGNI stance as `commander-delete`.
- Schema bump. Stays at v2; `update` writes preserve v2 shape.
- Auto-fix of missing `path` drift. Update surfaces it the same way `commander-list` does; remediating a missing path means changing `path`, which is out of scope per above.
- Cross-invocation locking, cross-machine sync.

## Decisions

### Decision 1 — Editable field set: keywords, description, specialRules, repoType

The MON-131 ticket lists three (keywords, description, specialRules). We extend by one: `repoType`.

**Why include `repoType`:** the `commander-registry` spec explicitly defers v1-drift remediation to `commander-update` ("Auto-migration … is deferred to `commander-update`"). The diff render surfaces drift naturally, so the marginal cost of supporting `repoType` as an editable field is ~zero — refusing to support it forces the user back to delete + re-add (the very anti-pattern we are eliminating). `repoType` is enumerated (`single-repo` / `monorepo` / `multi-monorepo`), so the edit UX is a 3-option `AskUserQuestion`.

**Why exclude `path` and `monorepoRoot`:** changing `path` is conceptually "this project lives somewhere else now", which requires re-running validation (`test -d`), potentially re-detecting topology, and potentially invalidating `monorepoRoot`. None of that fits the "patch metadata" mental model. Better to handle path changes via delete + add (one command, intentional) or via a future `commander-move`.

**Why exclude rename of `name`:** the key invariant. Renaming would need a key-migration step; out of scope.

### Decision 2 — Target resolution: `A → B` (mirrors `commander-delete`)

- **A) Explicit name**: first positional argument or `--name <value>` from `ARGUMENTS`. If supplied and matches a registered project, skip B and proceed to field-selection. If supplied but missing, abort with `"project '<name>' is not registered"` — explicit input always wins.
- **B) Interactive picker**: when no name is supplied, call `list()` and present projects via `AskUserQuestion` (option label `<name> — <path>`, plus a final `"Cancel"`). User selection becomes the target.

**Empty-registry exit:** missing or empty registry → print `"no projects registered"` and exit cleanly. No prompt, no write.

### Decision 3 — Per-field source priority: `A → B → C` (Haiku is opt-in)

Per-field source priority mirrors `commander-add`, with a key difference: **Haiku auto-detect (B) is opt-in**.

- **A) Explicit flag value**: `--keywords <csv>`, `--description <text>`, `--rules <csv>`, `--repo-type <enum>`. Verbatim. Same `--keywords` normalization-bypass rule as `commander-add`.
- **B) Haiku re-scan** (opt-in): triggered by `--refresh` or by the interactive "Re-scan" pick. Re-runs the same subagent prompt as `commander-add` Step 2, then re-normalizes via `commander-normalize` skill. Output overrides `keywords`, `description`, `specialRules` for fields the user has marked editable.
- **C) `AskUserQuestion` per field**: pre-fills with the current value (rendered in the question copy so the user sees what they would replace).

**Why default-off Haiku:** an `update` invocation is rarely "re-register from scratch". The common case is "fix this one field". Running Haiku unconditionally wastes a subagent call, can clobber curated keywords with raw detection, and slows the interaction. `--refresh` makes the re-scan explicit.

**Why no Step 3 (monorepo subproject selection):** the project is already registered; `path` and `monorepoRoot` are fixed (Non-Goal). Re-scan via `--refresh` operates on the existing `path` only.

### Decision 4 — Diff render: only changed fields, with drift annotation

After all field values are resolved (A→B→C), compute the diff between the current record and the proposed record. Render as a two-column block, **including only fields whose normalized value would change**. Identity columns: `<current> → <proposed>`. Special cases:

- `keywords`: render as a sorted list per side; highlight added (`+`) and removed (`–`) entries.
- `specialRules`: same as keywords.
- `repoType` on a legacy v1 record: current = `∅` (rendered explicitly as "(none — legacy v1 record)"), proposed = the chosen enum. Annotate the row with `← drift backfill` so the user sees the reason.
- `description`: literal old/new strings.

If the diff is empty (every editable field resolved back to its current value), inform the user "no changes" and exit cleanly without writing. This avoids spurious `updatedAt` bumps.

### Decision 5 — Confirmation gate: Save / Edit / Abort

`AskUserQuestion` with three options:

- **Save** → atomic write (Step 6 below).
- **Edit** → re-enter Step C for a single field of the user's choice. Editable fields include `keywords`, `description`, `specialRules`, `repoType`. After the edit, recompute the diff and re-render. Loops until the user picks Save or Abort.
- **Abort** → exit cleanly, registry byte-equivalent.

`Abort` is framed as the safe default in copy; `AskUserQuestion` does not enforce defaults.

### Decision 6 — `update(name, patch)` registry primitive

Add one new operation to the registry contract. Strict, no UX affordances — error handling lives in the command layer.

`update(name, patch)` MUST:

1. Reject with `"no projects registered"` if the registry file is missing or `projects` is `{}`.
2. Reject with `"project '<name>' is not registered"` if `name` is not a key in `projects`.
3. Reject with `"invalid repoType: <value>"` if `patch.repoType` is present and not in `{ "single-repo", "monorepo", "multi-monorepo" }`.
4. Apply the patch field-by-field on a copy of the existing record. Patch fields are limited to `keywords`, `description`, `specialRules`, `repoType`. Any other field in the patch SHALL be rejected with `"field '<name>' is not editable"`.
5. Set `updatedAt` to the current UTC ISO-8601 timestamp. Preserve `createdAt` byte-equivalent.
6. Preserve key insertion order in `projects` (the updated record stays at its original position).
7. Persist via the same atomic recipe as `add` / `delete`.
8. Return the updated record so the caller can render a success message.

**Why same atomic recipe:** uniform write contract across all three mutating operations. Future Commander runtime extraction stays a pure move.

**Why preserve insertion order:** read consumers (`list`, `commander-list`) document insertion order. Reordering on update would break diff-friendliness and surprise users.

### Decision 7 — `commander-normalize` re-invoked on keyword edits

Whenever the resolved `keywords` value comes from Haiku (B) or `AskUserQuestion` (C), the command SHALL pass the raw list through the `commander-normalize` skill before persisting. The skill needs the resolved `repoType` (post-edit) and, for `multi-monorepo` projects, the subprojects context — but since `commander-update` cannot edit `path`/`monorepoRoot`, the subprojects context for a `multi-monorepo` record is degenerate (a single subproject == the project being edited). Pass `repoType` and an empty `subprojects` list for single/monorepo; for `multi-monorepo`, pass `[{ name, keywords: <newKeywords> }]` so the skill applies the same single-subproject path it would in `commander-add` Step 3.

**Bypass rule (identical to `commander-add`):** when the user supplied `--keywords`, the supplied list is persisted verbatim (lowercased, trimmed); the vocab suggestion flow (Step 7 reuse) is also suppressed.

### Decision 8 — Stay in `experiments`, minor bump `0.10.0 → 0.11.0`

Same plugin as the rest of `commander:*`. Minor bump because we are adding a new command (additive, no breaking change to existing commands or the registry's read path). Versions are driven by release-please from conventional commits — no manual `plugin.json` / `package.json` / `marketplace.json` edits.

## Risks / Trade-offs

- **Auto mode skips confirmation the user never sees → silent metadata change.** *Mitigation:* same `AskUserQuestion` gate as `commander-delete`. Diff render shows exactly what changes. If still thin, future `--dry-run` could land.
- **Haiku re-scan on `--refresh` clobbers curated keywords.** *Mitigation:* `--refresh` is opt-in; diff render shows added/removed entries side-by-side; user can `Edit` to override before saving. The bypass rule (`--keywords` ⇒ no normalize, no suggest) provides a "verbatim" escape hatch.
- **Concurrent `commander-update` + `commander-add`/`-delete` interleaving → lost write.** *Mitigation:* same as MON-129/MON-130 — single user, sequential invocations.
- **Empty diff (user edits then reverts to original value).** *Mitigation:* "no changes" exit short-circuits the write; `updatedAt` is not bumped.
- **`repoType` change without `path` change can produce an inconsistent record** (e.g., setting `repoType=monorepo` on a record whose `path` is a single-package project). *Mitigation:* this is user-driven; we trust the user's stated intent. The diff render shows the change explicitly. A future `--validate` flag could cross-check filesystem markers.
- **Field-by-field re-prompt fatigue when many fields edited.** *Mitigation:* `Edit` is one-field-at-a-time but loops back to the diff render after each edit — the user sees cumulative changes between edits. Acceptable for a low-frequency op.

## Migration Plan

No migration. New command, no schema changes. Rollback = revert the touched files; on-disk registries written before/after this change remain byte-compatible.

## Open Questions

- Should `Edit` allow editing more than one field at a time (a multi-select instead of one-at-a-time)? Leaning no — `AskUserQuestion` is comfortable with single-pick, and the diff-then-edit loop is already iterative. Revisit if user feedback shows fatigue.
- Should the diff render include unchanged fields (full record echo) for context? Leaning no — "only changes" reduces noise and is the typical diff UX. Full record is one `commander-list <name>` away.
- Should the vocab-suggestion flow (Step 7 in `commander-add`) be reused as-is, or scoped to "only dropped terms that are new since the last update"? Leaning reuse-as-is — the skill emits `droppedTerms` deterministically; surfacing them on every keyword edit matches the `add` UX.