---
description: Remove a project record from the user-scoped Commander registry at <HOME>/.claude/commander/projects.json
---

# commander-delete

Remove a project record from the user-scoped Commander registry by `name`. The inverse of `commander-add`.

Resolves the deletion target with priority **A → B**:

- **A)** explicit name (first positional argument or `--name <value>`),
- **B)** interactive pick from the current `list()` of registered projects via `AskUserQuestion`.

A confirmation prompt (`AskUserQuestion`, default = cancel) renders the record's `name`, `path`, and `description` before any write. Persistence reuses the `commander-add` atomic recipe (temp + rename); failure modes leave `projects.json` untouched.

---

## Registry contract (delete operation)

The full registry contract — path, schema (v2), record shape, read behaviour, atomic write recipe, JSON formatting — is documented in [`add.md`](./add.md). This section adds only the new `delete(name)` write primitive; everything else is reused verbatim.

### Path

`<HOME>/.claude/commander/projects.json` — same as `commander-add`. `<HOME>` resolves to `$HOME` on POSIX and `%USERPROFILE%` on Windows.

### Lazy create

`delete` is a write operation but **MUST NOT** create the file or its parent directory. A missing file is treated the same as an empty registry — see "Delete flow" below — and SHALL surface as a "no projects registered" error without any on-disk side effect.

### Delete flow

`delete(name)` is the low-level removal primitive. Like `add`, it is strict and has no UX affordances; the command layer (Steps 3–6 below) handles target resolution and confirmation.

`delete(name)` MUST:

1. Reject with `"no projects registered"` if the registry file does not exist OR if it exists with `projects: {}` (empty object). MUST NOT create the file in this case.
2. Reject with `"project '<name>' is not registered"` if `name` is not a key in `projects`. MUST NOT modify the file.
3. Otherwise:
   a. Remove the entry at `projects[name]`.
   b. Preserve every other project record byte-equivalent in its fields (no reordering, no synthetic field changes).
   c. Preserve the on-disk `version` value (no schema downgrade or upgrade triggered by deletion).
   d. Persist via the atomic write recipe from `commander-add` (serialize → write `projects.json.tmp` → `mv` over `projects.json`).
4. Return the removed record so the command layer can render a success message quoting `name` and `path`.

If any step in 3.d fails, the previous `projects.json` MUST remain unchanged.

### JSON formatting (reused)

Same as `commander-add`:

- 2-space indent.
- UTF-8, no BOM.
- Exactly one trailing newline.
- Keys preserved in insertion order (do not sort, do not reorder remaining records).

---

## Invocation

```text
/commander:delete [<name> | --name <name>]
```

Both forms are equivalent. Omit the argument to enter the interactive picker.

## Step 1 — Parse explicit name (Priority A)

Parse `ARGUMENTS` for a target name. Recognize either form:

- **Positional**: the first non-flag token is treated as `name`.
- **Flag**: `--name <value>`.

Rules:

1. If a name is supplied via either form, set `target = name` and skip Step 2 (the picker).
2. If a name is supplied AND it is not present in the registry (`getByName(name)` returns null), abort immediately with `"project '<name>' is not registered"`. Do not enter the picker as a fallback — explicit input always wins.
3. If neither form is supplied, fall through to Step 2.

To check existence, `Read` `<HOME>/.claude/commander/projects.json` and inspect `projects[name]`. Treat a missing file as an empty registry — it cannot contain the requested name, so this collapses to the "no projects registered" exit in Step 2.

## Step 2 — Interactive picker (Priority B)

Run only when no name was supplied in Step 1.

1. `list()` the registered projects (`Read` the registry; if missing, treat as empty).
2. **Empty registry exit.** If the registry is missing OR `projects` is `{}`, print `"no projects registered"` and exit cleanly. Do not prompt the user. Do not create or modify any file.
3. **Otherwise** present every registered project via a single `AskUserQuestion` call. One option per project, plus a final explicit "Cancel" option.

### Option labels

For each project, build the option label as:

```text
<name> — <path>
```

Use `path` (not `description`) as the disambiguating suffix so similarly named projects are easy to tell apart. If `path` is unusually long, the suffix may be truncated to keep the label readable; the full record is shown again in Step 3 before any write, so the picker label only needs enough context to pick.

Append a final `"Cancel"` option (label exactly `"Cancel"`).

### Picker selection handling

- If the user selects `"Cancel"` (or aborts the prompt entirely), exit with the neutral message `"deletion cancelled"`. No write.
- Otherwise, set `target = <selected project's name>` and proceed to Step 3.

## Step 3 — Confirmation

Required for every successful target resolution (both Priority A and Priority B). This is the safety gate.

1. Look up the full record: `record = getByName(target)`.
2. Render `record.name`, `record.path`, and `record.description` to the user (a brief block is enough — the goal is a visual sanity check before the destructive op).
3. Prompt with a single `AskUserQuestion` call offering exactly two options:
    - `"Delete"` — destructive.
    - `"Cancel"` — non-destructive.

The prompt copy SHALL state that **deletion is irreversible** and SHALL frame `"Cancel"` as the safe default (e.g., "this cannot be undone — pick `Cancel` if unsure"). `AskUserQuestion` does not enforce a default option, so the wording carries the safety.

### Confirmation selection handling

- On `"Cancel"` (or any abort/cancellation of the prompt): exit with `"deletion cancelled"`. No write.
- On `"Delete"`: proceed to Step 4.

## Step 4 — Atomic delete

Reaching this step means the user explicitly confirmed deletion of `target`.

1. **Read** the current registry from `<HOME>/.claude/commander/projects.json`.
    - Defensive check: if the file is missing OR `projects[target]` is no longer present (race with another process / hand edit), abort with the matching error from the Delete-flow contract above (`"no projects registered"` or `"project '<target>' is not registered"`). Do not write.
2. Remove `projects[target]` from the in-memory object.
3. Serialize the updated registry as JSON with **2-space indentation** and a **single trailing newline**. Preserve the existing `version` value verbatim. Preserve key insertion order for the remaining `projects` entries.
4. **Write** the serialized content to `<HOME>/.claude/commander/projects.json.tmp` (overwrite any pre-existing temp).
5. Atomically replace the registry:

    ```bash
    mv "<HOME>/.claude/commander/projects.json.tmp" "<HOME>/.claude/commander/projects.json"
    ```

    On POSIX and on Windows when both paths share a filesystem, `mv` is atomic. If the process is interrupted between step 4 and step 5, `projects.json` remains in its previous state with the target record still present.

6. Surface a concise success message quoting the removed record:

    ```text
    Removed "<name>" (<path>).
    ```

If any step (1–5) fails, the previous `projects.json` MUST remain unchanged. If the failure occurs after step 4 but before step 5, remove the leftover temp file:

```bash
rm -f "<HOME>/.claude/commander/projects.json.tmp"
```

---

## Error messages

- `"no projects registered"` — registry file is missing or `projects` is `{}`. Used both in Step 2 (interactive empty-registry exit) and in Step 4 (defensive race).
- `"project '<name>' is not registered"` — explicit name (Step 1) or defensive race (Step 4) targeted a key not present in `projects`.
- `"deletion cancelled"` — neutral exit when the user picks `"Cancel"` (or aborts) at the picker (Step 2) or confirmation (Step 3).
- `"unsupported registry version: <n>"` — reader hit a `version` greater than `2`. Same behavior as the read path documented in `commander-add`.
- `"registry file is not valid JSON"` — `Read` succeeded but parsing failed; ask the user to inspect `<HOME>/.claude/commander/projects.json` by hand.

## Non-goals (deferred)

- Bulk delete (`--all`, `--matching`, `--older-than`).
- Soft delete / undo. The registry has no history; restoring means replaying `add`.
- `--yes` / `--force` flag to skip confirmation. Defer until a real scripted use case shows up.
- `--dry-run`. Probably not worth it for a single-record op.
- Deleting external state (project files on disk, git remotes). This command edits the registry only.
