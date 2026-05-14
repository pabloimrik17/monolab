---
description: Edit metadata of a project registered in the user-scoped Commander registry at <HOME>/.claude/commander/projects.json
---

# commander-update

Patch one or more editable fields on a single registered project record in place: `keywords`, `description`, `specialRules`, `repoType`. Preserves `createdAt`, refreshes `updatedAt`, and reuses the `commander-add` atomic-write recipe. The inverse of "delete + re-add" — and the only path that remediates legacy v1 drift (record missing `repoType`) without losing history.

Resolves the target with priority **A → B**:

- **A)** explicit name (first positional argument or `--name <value>`),
- **B)** interactive pick from `list()` via `AskUserQuestion`.

Per-field source priority **A → B → C**, mirroring `commander-add`, with one key difference: Haiku re-scan (B) is **opt-in** (`--refresh` or the `"Re-scan via Haiku"` pick in the Edit menu). The common case is "fix one field", not "re-register from scratch".

A diff (`current → proposed`) renders before any write, with `+`/`–` markers on `keywords`/`specialRules` and a `← drift backfill` annotation when a legacy v1 record gains `repoType`. The confirmation gate is `Save` / `Edit` / `Abort`; the prompt copy frames `Abort` as the safe default.

---

## Registry contract (update operation)

The full registry contract — path, schema (v2), record shape, read behaviour, atomic write recipe, JSON formatting — is documented in [`commander-add.md`](./commander-add.md). This section adds only the new `update(name, patch)` write primitive; everything else is reused verbatim.

### Path

`<HOME>/.claude/commander/projects.json` — same as `commander-add`. `<HOME>` resolves to `$HOME` on POSIX and `%USERPROFILE%` on Windows.

### Lazy create

`update` is a write operation but **MUST NOT** create the file or its parent directory. A missing file is treated the same as an empty registry and SHALL surface as `"no projects registered"` without any on-disk side effect.

### Update flow

`update(name, patch)` is the low-level patch primitive. Like `add` and `delete` it is strict and has no UX affordances; the command layer (Steps 1–9 below) handles target resolution, prompting, diff render, and confirmation.

`update(name, patch)` MUST:

1. Reject with `"no projects registered"` if the registry file does not exist OR if it exists with `projects: {}` (empty object). MUST NOT create the file in this case.
2. Reject with `"project '<name>' is not registered"` if `name` is not a key in `projects`. MUST NOT modify the file.
3. Reject with `"field '<key>' is not editable"` if the patch contains a key outside the editable set `{ keywords, description, specialRules, repoType }`.
4. Reject with `"invalid repoType: <value>"` if `patch.repoType` is present and not exactly one of `"single-repo"`, `"monorepo"`, `"multi-monorepo"`.
5. Apply the patch field-by-field on a copy of the existing record. Fields absent from the patch SHALL remain byte-equivalent.
6. Preserve `createdAt` byte-equivalent — the operation MUST NOT touch `createdAt`.
7. Set `updatedAt` to the current UTC ISO-8601 timestamp.
8. Preserve key insertion order in `projects` — the updated record MUST remain at its original position (replace in place, do not delete-then-insert).
9. Preserve the on-disk `version` value verbatim (no schema downgrade or upgrade triggered by update).
10. Persist via the atomic write recipe from `commander-add` (serialize → write `projects.json.tmp` → `mv` over `projects.json`).
11. Return the updated record so the command layer can render a success message.

If any step in 10 fails, the previous `projects.json` MUST remain unchanged.

### Legacy v1 backfill

When the target record predates v2 and has no `repoType` field, `update(name, { repoType: "<enum>" })` SHALL persist the new `repoType` in place. All other fields on that record SHALL be byte-equivalent and the record's position in `projects` SHALL be preserved. The registry contract performs no auto-migration on its own — backfill is always user-initiated via `update`.

### JSON formatting (reused)

Same as `commander-add`:

- 2-space indent.
- UTF-8, no BOM.
- Exactly one trailing newline.
- Keys preserved in insertion order (do not sort, do not reorder remaining records).

---

## Invocation

```text
/experiments:commander-update [<name> | --name <name>] [--keywords <csv>] [--description <text>] [--rules <csv>] [--repo-type <enum>] [--refresh]
```

All flags are optional. Both positional `<name>` and `--name <name>` are accepted and equivalent.

## Step 1 — Parse explicit arguments (Priority A)

Parse `ARGUMENTS` as a flag string. Recognize:

| Flag            | Maps to        | Notes                                                                                |
| --------------- | -------------- | ------------------------------------------------------------------------------------ |
| `--name`        | `name`         | Equivalent to the first positional token.                                            |
| `--keywords`    | `keywords`     | Comma-separated string → split on `,`, trim each, lowercase each, deduplicate.       |
| `--description` | `description`  | Quoted string; use as-is.                                                            |
| `--rules`       | `specialRules` | Comma-separated string → split on `,`, trim each, deduplicate.                       |
| `--repo-type`   | `repoType`     | Enum value: `single-repo` \| `monorepo` \| `multi-monorepo`. Validate at parse time. |
| `--refresh`     | (boolean)      | No value. Opt-in trigger for the Haiku re-scan (Step 4).                             |

Rules:

1. The first non-flag token (if any) is treated as the target `name`. `--name <value>` is equivalent.
2. **Reject any unrecognized flag** before any read or write. Abort with `"unknown flag: <flag>"` (verbatim flag string).
3. Validate `--repo-type <value>` against `{ single-repo, monorepo, multi-monorepo }` at parse time. On miss, abort with `"invalid repoType: <value>"` and do NOT prompt further; do NOT read or modify the registry.
4. Split / trim / lowercase / deduplicate `--keywords` and split / trim / deduplicate `--rules` csv inputs into string arrays. Empty entries (e.g., `,,foo`) are dropped.
5. **Explicit `--keywords` bypasses normalization.** When supplied, the resulting list is persisted verbatim (lowercased, trimmed, deduplicated). The `commander-normalize` skill SHALL NOT be invoked and the vocab-suggestion flow (Step 9) SHALL be suppressed for this invocation. Identical rule to `commander-add` Step 1 Rule 5.
6. If a name was supplied (positional or `--name`), check existence via `getByName(name)` (`Read` the registry; treat missing file as empty). If the name is not in `projects`, abort with `"project '<name>' is not registered"` — explicit input always wins, the picker SHALL NOT be used as a fallback. If the registry file is missing or `projects` is empty, abort with `"no projects registered"`.

The "editable-field flags" referenced below are the four manifest-shaping flags: `--keywords`, `--description`, `--rules`, `--repo-type`. `--refresh` is NOT an editable-field flag.

## Step 2 — Interactive picker (Priority B for target)

Run only when no name was supplied in Step 1.

1. `list()` the registered projects (`Read` the registry; if missing, treat as empty).
2. **Empty registry exit.** If the registry is missing OR `projects` is `{}`, print `"no projects registered"` and exit cleanly. Do not prompt the user. Do not create or modify any file.
3. **Otherwise** present every registered project via a single `AskUserQuestion`. One option per project, plus a final explicit `"Cancel"` option.

### Option labels

For each project, build the option label as:

```text
<name> — <path>
```

Use `path` (not `description`) as the disambiguating suffix so similarly named projects are easy to tell apart. If `path` is unusually long, the suffix may be truncated to keep the label readable; the full record is rendered again in the diff (Step 6) before any write.

Append a final `"Cancel"` option (label exactly `"Cancel"`).

### Picker selection handling

- If the user selects `"Cancel"` (or aborts the prompt entirely), exit with `"update cancelled"`. No write.
- Otherwise, set `target = <selected project's name>` and proceed to Step 3.

## Step 3 — Field-pick menu (initial entry)

Decide what to do on first entry based on which flags were supplied in Step 1:

- **No editable-field flag AND no `--refresh`** → render a single `AskUserQuestion` listing each editable field as its own option, plus three meta-options. One pass through this menu picks **one** field to edit (or a meta-action); after editing, control flows to Step 6 (diff render) and the menu is re-offered from the confirmation gate's `"Edit"` option.

    Options (exact labels):

    | Label               | Effect                                                                                      |
    | ------------------- | ------------------------------------------------------------------------------------------- |
    | `Edit keywords`     | Run Step 5 with field = `keywords` (pre-filled with current value).                         |
    | `Edit description`  | Run Step 5 with field = `description` (pre-filled with current value).                      |
    | `Edit specialRules` | Run Step 5 with field = `specialRules` (pre-filled with current value).                     |
    | `Edit repoType`     | Run Step 5 with field = `repoType` (3-option pick; current value quoted in copy).           |
    | `Re-scan via Haiku` | Run Step 4 (Haiku re-scan), then Step 6.                                                    |
    | `Save (no changes)` | Skip directly to Step 6 with an empty proposed diff (will short-circuit to `"no changes"`). |
    | `Abort`             | Exit with `"update cancelled"`. No write.                                                   |

- **At least one editable-field flag supplied AND `--refresh` NOT supplied** → SKIP this menu on first entry. The flags already express the user's intent; jump to Step 6 (diff render). The field-pick menu remains accessible via the `"Edit"` option at the confirmation gate (Step 7).
- **`--refresh` supplied (with or without editable-field flags)** → run Step 4 (Haiku re-scan) before Step 6, regardless of whether any editable-field flag was also supplied. The field-pick menu is NOT shown on first entry; the Haiku-resolved values become the proposed values for any field NOT supplied by Priority A.

### `Edit repoType` copy

When the user picks `Edit repoType`, present a 3-option `AskUserQuestion` with options `single-repo`, `monorepo`, `multi-monorepo`. Quote the current value (or `(none — legacy v1 record)` if the field is absent) in the question copy so the user sees what is being replaced.

## Step 4 — Haiku re-scan (Priority B for field values, opt-in)

Run only when `--refresh` was supplied in Step 1 OR the user picked `"Re-scan via Haiku"` in the Step 3 menu.

1. Dispatch the Haiku subagent against the record's current `path` (NOT `monorepoRoot`) using the same prompt as `commander-add` Step 2. The subagent prompt and CRITICAL OUTPUT FORMAT block are reused verbatim — see [`commander-add.md`](./commander-add.md#subagent-prompt).
2. Apply the same tolerant-recovery + single re-dispatch parsing rules documented in `commander-add` Step 2 "Parse the response". If the re-dispatch still does not parse, abandon Priority B for this invocation and fall through to per-field prompts via `AskUserQuestion` (Step 5) at the user's next edit pass.
3. On successful parse, overwrite the in-memory proposed values for the fields that Priority A did NOT supply:
    - `keywords` ← Haiku-detected `keywords` (whole-tree list for `single-repo`/`monorepo`; per-subproject list is NOT recomputed — `commander-update` cannot edit `path`/`monorepoRoot`).
    - `description` ← Haiku-detected top-level `description`.
    - `specialRules` ← Haiku-detected `specialRules` (may be empty).
4. **Do NOT auto-change `repoType` from the re-scan.** Re-classifying the record's topology against an unchanged `path` is rarely the user's intent and would silently flip a v2 record's `repoType` field. The user must edit `repoType` explicitly via Priority A (`--repo-type`) or Priority C (`Edit repoType` in the menu) if a change is desired.
5. Run the `commander-normalize` skill on the resolved `keywords` — **unless** Priority A supplied `--keywords`, in which case normalize is bypassed (Step 1 Rule 5). Pass:
    - `keywords`: the Haiku-resolved (or Step 1 Rule 5 — bypassed) raw list,
    - `description`: the resolved `description` (post-Step-4.3),
    - `specialRules`: the resolved `specialRules` (post-Step-4.3),
    - `repoType`: the record's current `repoType` (or the Priority-A-supplied `--repo-type` if any — see Step 4.4 for why re-scan does not auto-change it),
    - `subprojects`: empty for `single-repo`/`monorepo`; for `multi-monorepo`, pass `[{ name, keywords: <resolvedKeywords> }]` (degenerate single-subproject shape, since `commander-update` cannot edit topology — see design.md Decision 7).
6. Remember the skill's `droppedTerms` output for Step 9. When normalize was bypassed, treat `droppedTerms` as empty (Step 9 will skip).

## Step 5 — Prompted edits (Priority C)

Entered from the Step 3 field-pick menu OR from the `"Edit"` option at the confirmation gate (Step 7). One pass = one field.

For each editable field, prompt with a single `AskUserQuestion`. Quote the current value in the question copy so the user sees what they would replace; pre-fill the answer (where applicable) with the current value.

- `keywords`: "Comma-separated keywords describing the stack. Current: `<comma-joined current keywords>`."
  Split the answer on `,`, trim each entry, lowercase each, deduplicate. Empty answer = no change (loops back to confirmation with no diff on this field).
- `description`: "One-sentence description (aim for 10–15 words). Current: `<current description>`."
  Empty answer = no change.
- `specialRules`: "Comma-separated rules. Current: `<comma-joined current rules>` (or `(none)` if empty). Leave empty to clear."
  Split / trim / deduplicate. Empty answer is interpreted as "no special rules" (proposed value = `[]`) — distinct from "no change". To leave the existing rules untouched the user picks a different field or cancels the edit.
- `repoType`: 3-option `AskUserQuestion` with options `single-repo`, `monorepo`, `multi-monorepo`. Quote the current value (`(none — legacy v1 record)` for absent) in the question copy.

After the prompt:

1. If the edited field was `keywords` AND Priority A did NOT supply `--keywords`, re-run the `commander-normalize` skill on the new raw list with the same arguments as Step 4.5 (using the record's current `repoType` unless `repoType` was also edited this pass — in which case use the edited value). Replace the in-memory proposed `keywords` with the normalized list and capture `droppedTerms` for Step 9.
2. Return control to Step 6 (recompute the diff) and Step 7 (re-prompt the confirmation gate).

## Step 6 — Diff render

After Step 3 / Step 4 / Step 5 has resolved every proposed field value, compute the diff between the current record and the proposed record.

Rules:

1. **Include only fields whose normalized proposed value differs from the current value.** `updatedAt` is NEVER a diff row (it is refreshed in Step 8 only and is not user-meaningful as a "change").
2. Render `keywords` and `specialRules` as two **sorted** lists per side. Annotate added entries with a leading `+` and removed entries with a leading `–` (en dash, U+2013, identical to `commander-list`'s drift suffixes). Unchanged entries on each side keep their literal text.
3. Render `description` as the literal old and new strings on consecutive lines.
4. Render `repoType` as `<current> → <proposed>`. Substitute `"(none — legacy v1 record)"` for an absent current value. When the current value is absent, append the annotation `← drift backfill` on the same line.
5. If the diff is **empty** (every resolved field matches its current value): print `"no changes"` and exit cleanly. Do NOT bump `updatedAt`. Do NOT write.

### Suggested layout

A simple two-column block is enough; alignment is informational, not load-bearing:

```text
Update "<name>":

  description:
    – Portfolio tracker, SolidStart-based, lives inside monolab monorepo.
    + Portfolio tracker, SolidStart-based, with realtime price feed.

  keywords:
    – react
    + react
    + realtime-pricing
      solid-start
      typescript

  repoType:
    (none — legacy v1 record) → single-repo  ← drift backfill
```

Diff rendering is descriptive — the goal is "user can see what changes before saving". A literal "before / after" block also works as long as the rules above are honoured.

## Step 7 — Confirmation gate (Save / Edit / Abort)

Run after every Step 6 render (initial pass and every `Edit` loop).

Prompt via a single `AskUserQuestion` with exactly three options:

- `"Save"` — proceed to Step 8 (atomic write).
- `"Edit"` — re-enter Step 5 for a single field. Present the same editable-field options as Step 3 (`Edit keywords`, `Edit description`, `Edit specialRules`, `Edit repoType`), plus `Re-scan via Haiku` (re-runs Step 4 in-place). After the edit, recompute the diff (Step 6) and re-prompt the confirmation gate. The `Edit` loop is unbounded — the user can refine fields until satisfied.
- `"Abort"` — exit with `"update cancelled"`. No write.

The prompt copy SHALL frame `"Abort"` as the safe default (e.g., "press Abort if anything looks off — no changes will be saved"). `AskUserQuestion` does not enforce defaults, so the wording carries the safety.

Reaching Step 8 requires an explicit `"Save"` selection on a non-empty diff.

## Step 8 — Atomic update write

Reaching this step means the user explicitly confirmed `"Save"` on a non-empty proposed diff.

1. **Re-read** the current registry from `<HOME>/.claude/commander/projects.json` (do NOT reuse the in-memory copy from Step 2 — minimize the read-to-write window for hand edits).
2. **Defensive check.** If the file is missing OR `projects[target]` is no longer present (race with another process / hand edit), abort with the matching error (`"no projects registered"` or `"project '<target>' is not registered"`) and exit without writing.
3. Build the patched record:
    - Start from `Object.assign({}, projects[target])` (or equivalent — shallow copy preserving key insertion order on the record).
    - Apply each resolved patch field (`keywords` / `description` / `specialRules` / `repoType`).
    - Preserve `createdAt` byte-equivalent.
    - Set `updatedAt` to the current UTC ISO-8601 timestamp (e.g., `date -u +%Y-%m-%dT%H:%M:%SZ`).
4. **Defensive re-validation.** If the patched record's `repoType` is present and not in `{ single-repo, monorepo, multi-monorepo }`, abort with `"invalid repoType: <value>"`. This branch SHOULD be unreachable through normal flow (Step 1 Rule 3 and the Step 5 enum picker both filter), but it is the safety net for hand-crafted patch construction errors.
5. Replace `projects[target]` with the patched record **in place** (preserve insertion order — do NOT delete-then-insert).
6. Serialize the updated registry as JSON with **2-space indentation** and a **single trailing newline**. Preserve the existing `version` value verbatim. Preserve key insertion order for all `projects` entries.
7. `Write` the serialized content to `<HOME>/.claude/commander/projects.json.tmp` (overwrite any pre-existing temp).
8. Atomically replace the registry:

    ```bash
    mv "<HOME>/.claude/commander/projects.json.tmp" "<HOME>/.claude/commander/projects.json"
    ```

    On POSIX and on Windows when both paths share a filesystem, `mv` is atomic. If the process is interrupted between step 7 and step 8, `projects.json` remains in its previous state with the pre-update record still present.

9. Surface a concise success message:

    ```text
    Updated "<name>" (<changed-field-list>).
    ```

    where `<changed-field-list>` is the comma-separated names of the fields that appeared in the Step 6 diff (e.g., `description, keywords`).

If any step (1–8) fails AFTER the temp file was written (step 7) but before the rename completes (step 8), remove the leftover temp:

```bash
rm -f "<HOME>/.claude/commander/projects.json.tmp"
```

## Step 9 — Vocabulary suggestion

Run **only after Step 8 succeeded** AND `keywords` was edited via Haiku (Step 4) or `AskUserQuestion` (Step 5). NOT when `--keywords` was supplied (Step 1 Rule 5 — normalize was bypassed, so there are no `droppedTerms` to surface).

**Skip entirely** when ANY of the following holds:

- `droppedTerms` (from Step 4.5 or Step 5.1) is empty.
- The session-level "Skip vocab suggestions" flag is set (shared with `commander-add` — see below).
- `gh` is not on `PATH`. Detect via `command -v gh >/dev/null 2>&1`. Do NOT prompt or error — silently skip.

Otherwise present a single `AskUserQuestion` with three options, identical to `commander-add` Step 7:

- **Yes** — open a GitHub issue suggesting the dropped terms be added to the skill's vocabulary. Invoke:

    ```bash
    gh issue create \
      --title "vocab: add <term1>[, <term2>, ...]" \
      --body "<body>"
    ```

    Title lists every dropped term comma-separated; body is:

    ```text
    Dropped terms surfaced by `commander-normalize` during a `commander-update` invocation.

    Terms: <comma-separated dropped terms>
    Project: <name>
    Date (UTC): <YYYY-MM-DD>

    Consider adding these to `claude-plugins/experiments/skills/commander-normalize/references/vocabulary.json` (canonical, synonyms, or excludes as appropriate).
    ```

    On `gh` non-zero exit, surface stderr to the user but do NOT roll back the registry write — the suggestion is post-hoc.

- **No** — dismiss for this project. The registry write stands.
- **Skip session** — set a session-level flag (in-conversation memory only, not persisted) that suppresses Step 9 for the remainder of the current Claude Code session, then dismiss this prompt without invoking `gh`.

The session-skip flag SHALL be **shared with `commander-add`** — setting it in either command suppresses Step 9 (here) and Step 7 (in `commander-add`) for the remainder of the session, in either direction.

The flow SHALL NOT block: the write has already succeeded by the time this prompt appears.

---

## Error messages

- `"no projects registered"` — registry file is missing or `projects` is `{}`. Used in Step 1 Rule 6 (explicit-name path with missing/empty registry), Step 2 (interactive empty-registry exit), and Step 8.2 (defensive race).
- `"project '<name>' is not registered"` — explicit name (Step 1 Rule 6) or defensive race (Step 8.2) targeted a key not present in `projects`.
- `"unknown flag: <flag>"` — Step 1 Rule 2 saw a flag outside `{ --name, --keywords, --description, --rules, --repo-type, --refresh }`.
- `"invalid repoType: <value>"` — Step 1 Rule 3 received a `--repo-type` value outside the enum, OR the Step 8.4 defensive re-validation rejected the patched record.
- `"field '<key>' is not editable"` — the `update(name, patch)` primitive (above) rejected a patch key outside `{ keywords, description, specialRules, repoType }`. Defensive — should be unreachable through the command flow.
- `"unsupported registry version: <n>"` — reader hit a `version` greater than `2`. Same behavior as the read path documented in `commander-add`.
- `"registry file is not valid JSON"` — `Read` succeeded but parsing failed; ask the user to inspect `<HOME>/.claude/commander/projects.json` by hand.

`"update cancelled"` and `"no changes"` are neutral exit messages, not errors.

## Non-goals (deferred)

- Editing `path`, `monorepoRoot`, or renaming `name`. Path move is a different mental model (re-validate, possibly re-detect topology, possibly invalidate `monorepoRoot`); rename breaks the key invariant. Separate ticket if a real use case appears.
- Bulk update (`--all`, predicate filters), `--dry-run`, `--yes` / `--force`. Same YAGNI stance as `commander-delete`.
- Schema bump. Stays at v2; `update` writes preserve v2 shape.
- Auto-fix of missing `path` drift. The diff render surfaces topology-related drift (legacy v1 `repoType`) but does not silently rewrite path strings.
- Cross-invocation locking, cross-machine sync.
