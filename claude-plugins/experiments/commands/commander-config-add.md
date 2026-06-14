---
description: Track a config file (project-relative path) for a registered project in the user-scoped Commander config registry at <HOME>/.claude/commander/configs.json
---

# commander-config-add

Register a single config file (by project + project-relative path) to track for an already-registered Commander project, so the downstream `commander:config-*` family (`config-list`, `config-scan`, `config-align`) can act on it.

This command stages in the **`experiments`** plugin — monolab's beta home for commander tooling, the same plugin as the `commander-update-*` family — and graduates to the `commander` plugin later, exactly as the CRUD commands (`add`/`list`/`update`/`delete`) did once stable. The persistence file still lives in the **shared** commander data dir (`~/.claude/commander/configs.json`), consistent with how the experiments `commander-update-*` commands already read `~/.claude/commander/projects.json`.

Resolves the target **project** (priority A→C) and the target **file path** (priority A→C):

- **A)** explicit arguments (parsed from `ARGUMENTS`),
- **C)** interactive pick / prompt via `AskUserQuestion`.

There is **no auto-detection** (no Priority B). Bulk discovery of config files is out of scope — that is `config-scan` (MON-158). Writes are synchronous and atomic (temp + rename). User confirmation is always required before any on-disk change.

---

## Config registry contract

The config registry is a **sibling** of `projects.json` with its own versioned schema. It is re-implemented by every `commander:config-*` command via built-in tools (`Read`, `Write`, `Bash`) — no shared runtime. This block is the authoritative reference. `projects.json` is **never** read, written, or otherwise affected by config-registry operations (the _command_ reads `projects.json` to validate the project; that read is separate and never mutates it).

### Path

`<HOME>/.claude/commander/configs.json` — a sibling of `projects.json` in the same Claude Code data directory. `<HOME>` resolves to `$HOME` on POSIX and `%USERPROFILE%` on Windows. All path references below use this `<HOME>` placeholder.

### Lazy create

- **Reads** (`read`, `list`) MUST NOT create the file or its parent directory. A missing file MUST be treated as an empty config registry (`{ "version": 1, "configs": {} }` in memory; nothing on disk).
- **Writes** MUST create `<HOME>/.claude/commander/` recursively if it doesn't exist, and then create `configs.json` atomically with the full versioned schema.

### Schema template

The on-disk file is a single JSON object:

```json
{
    "version": 1,
    "configs": {}
}
```

For this change the schema `version` is `1`. Readers MUST abort with `"unsupported config registry version"` if they see a `version` greater than `1` (the highest known version) and MUST NOT overwrite the file. The config registry version is **independent** of the `projects.json` registry version.

`configs` is keyed by project name (the same key used in `projects.json`); each value is an array of config entries.

### Config-entry shape

Each entry in a project's config array is a JSON object:

```json
{ "path": "eslint.config.js" }
```

- `path` (string, required) — the config file location **relative to the owning project's `path`**, expressed with POSIX separators (`/`), without a leading `./`, without any `..` segments, and never absolute.

Rules:

- Entries are **objects, not bare strings**, from day one, so future per-file metadata can be added as additional optional fields without a breaking shape change.
- No `type` and no `archetypes` field is persisted. A file's applicable archetype is derived at read time from the owning project's `keywords` in `projects.json` (resolved via the project-name key); the config `type` is derived from the path. A v1 writer MUST NOT synthesize either field — storing them would duplicate `projects.json.keywords` and drift when `commander:update` changes the project's keywords.

### Read behaviour

- `read()` → full `{ version, configs }` object; returns `{ "version": 1, "configs": {} }` when the file is missing. MUST NOT create the file or directory.
- `list(projectName)` → the array of config entries for `projectName`, or `[]` when the project has no tracked configs or the file is missing. MUST NOT create or modify the file.

Reads never re-validate entries. An orphan entry (project absent from `projects.json`) or a missing-file entry (resolved path no longer on disk) is **drift** — returned as-is, never auto-removed; surfacing it is the consumer's job (`config-list`, MON-157).

### Add flow

`add(projectName, entry)` is the low-level persistence primitive (the command layer enforces that `projectName` is a registered project before calling it). It MUST:

1. Reject with `"path already tracked"` if an entry whose `path` equals `entry.path` already exists for `projectName`. The on-disk file MUST remain unchanged.
2. Create `configs[projectName]` as an empty array if it does not yet exist, then append `entry`.
3. Preserve the insertion order of existing entries and of other projects' arrays.
4. Preserve the config registry `version` value.
5. Persist via the atomic write recipe below.

### Atomic write recipe

Always:

1. Serialize the updated config registry to JSON with **2-space indentation** and a **single trailing newline**.
2. `Write` the serialized content to a sibling temp file `<HOME>/.claude/commander/configs.json.tmp` (overwrite any pre-existing temp).
3. `Bash mv "<HOME>/.claude/commander/configs.json.tmp" "<HOME>/.claude/commander/configs.json"` — rename is atomic on POSIX and on Windows when the paths share a filesystem.
4. If any step fails, the previous `configs.json` MUST remain unchanged.

### JSON formatting

- 2-space indent.
- UTF-8, no BOM.
- Exactly one trailing newline.
- Keys preserved in insertion order (do not sort).

---

## Invocation

```text
/experiments:commander-config-add [--project <name>] [--file <relpath>]
```

Both flags are optional, and both also accept a positional form: the **first** positional is the project name, the **second** is the file path. Any missing field is resolved interactively (Priority C).

## Step 1 — Parse explicit arguments (Priority A)

Parse `ARGUMENTS`. Recognize:

| Flag        | Maps to   | Positional fallback | Notes                                                   |
| ----------- | --------- | ------------------- | ------------------------------------------------------- |
| `--project` | `project` | 1st positional      | Registry key (project name). Do not mutate the value.   |
| `--file`    | `file`    | 2nd positional      | Candidate path, interpreted relative to `project.path`. |

Rules:

1. Collect only fields the user explicitly passed; absence means "Priority C resolves it".
2. A flag form takes precedence over the positional in the same slot if both are somehow present.
3. If **both** `project` and `file` are supplied, skip the interactive picker and the file prompt (Step 2) entirely and go straight to **Step 3 — Path normalization and validation**.

## Step 2 — Target resolution (Priority C — interactive)

### 2.1 Resolve the project

Read the project registry read-only to enumerate / validate projects. Resolve `REGISTRY_PATH` = `<HOME>/.claude/commander/projects.json`. Probe with `Bash test -f`; a missing file is an empty registry (do NOT create it). When present, `Read` and JSON-parse it; honor its version gate (abort `"unsupported registry version: <n>"` on `version > 2`).

- **Empty / missing registry** (no projects): print `"no projects registered"` with the hint `Use /commander:add to register one.` and exit cleanly — **no prompt, no write.**
- **Explicit project supplied (Priority A)**: if `projects[<name>]` does not exist, abort with `"project '<name>' is not registered"`. No file created or modified.
- **No project supplied, registry non-empty**: present the registered project names via `AskUserQuestion` (one option per project; include an explicit **Cancel** option). The user's selection becomes the target project. On Cancel: exit without writing.

Hold the resolved `project.path` (absolute) from the registry record — Step 3 needs it.

### 2.2 Resolve the file path

- **Explicit file supplied (Priority A)**: use it as the candidate path.
- **No file supplied**: prompt via `AskUserQuestion` for the path **relative to the chosen project** (e.g. "Config file path, relative to `<project.path>`?"). On cancel / empty: exit without writing.

The command MUST NOT dispatch an auto-detection subagent.

## Step 3 — Path normalization and validation

Operate on the candidate path against the resolved `project.path`:

1. **Normalize** to a project-relative POSIX path:
    - strip a leading `./`,
    - collapse redundant separators,
    - if the candidate is an **absolute path that lies inside** `project.path`, convert it to its project-relative form.
2. **Reject escapes**: if the normalized path contains `..` segments that escape the project, or is an absolute path **outside** `project.path`, abort with `"config path must be inside the project"`. **No write.**
3. **Validate existence**: the resolved absolute path `<project.path>/<relpath>` MUST exist on disk and be a regular file:

    ```bash
    test -f "<project.path>/<relpath>"
    ```

    If it does not, abort with `"config file does not exist: <path>"`. **No write.**

## Step 4 — Duplicate handling

`list(project)` from the config registry. If an entry whose `path` equals the normalized path already exists for the project, inform the user (`"already tracked"`) and exit **without writing** — an idempotent no-op. `configs.json` stays byte-equivalent.

## Step 5 — Confirmation and write

### 5a. Confirmation

Render the resolved **project name** and the **normalized project-relative path** so the user can verify, then require explicit confirmation via `AskUserQuestion` with two options:

- **Save** — proceed to the write.
- **Cancel** — exit without writing (framed as the safe default).

### 5b. On "Save"

Invoke the config-registry `add(project, { path })` operation:

1. `Read` the current `configs.json` if present, else start from `{ "version": 1, "configs": {} }`. Honor the version gate: abort `"unsupported config registry version"` on `version > 1`, no overwrite.
2. Append `{ "path": "<relpath>" }` to `configs[project]`, creating the array if absent. Preserve insertion order and the `version`.
3. Serialize with 2-space indent and a single trailing newline.
4. Ensure the dir exists:

    ```bash
    mkdir -p "<HOME>/.claude/commander"
    ```

5. `Write` the serialized content to `<HOME>/.claude/commander/configs.json.tmp`.
6. Atomically replace:

    ```bash
    mv "<HOME>/.claude/commander/configs.json.tmp" "<HOME>/.claude/commander/configs.json"
    ```

7. Surface a concise success message quoting the project and the tracked path, e.g. `Tracking "<relpath>" for project "<project>".`

### 5c. On "Cancel" (or any abort)

Exit without writing; `configs.json` is unchanged with a neutral message and no error. If the abort happens after the temp file was written but before the rename, remove it:

```bash
rm -f "<HOME>/.claude/commander/configs.json.tmp"
```

---

## Error messages

- `"no projects registered"` — the project registry is missing or empty (Step 2.1). Hint `/commander:add`. Clean exit, no write.
- `"project '<name>' is not registered"` — explicit `--project` not present in `projects.json` (Step 2.1). No write.
- `"config path must be inside the project"` — normalized path escapes the project (Step 3.2). No write.
- `"config file does not exist: <path>"` — resolved absolute path is missing or not a regular file (Step 3.3). No write.
- `"already tracked"` — the normalized path is already in `configs[project]` (Step 4). Idempotent no-op.
- `"path already tracked"` — low-level `add()` safety net for the duplicate guard (Step 5b).
- `"unsupported config registry version"` — reader hit a `configs.json` `version` greater than `1`. No overwrite.
- `"unsupported registry version: <n>"` — `projects.json` reader hit a `version` greater than `2`. No write.

## Non-goals (deferred)

- Auto-discovery / bulk add of config files — `config-scan` (MON-158).
- Editing, deleting, or listing tracked configs — config CRUD (MON-157).
- Cleaning up orphan config entries when a project is deleted — surfaced as drift; cleanup lands with MON-157.
- Concurrency (lockfile / CAS) — single-invocation assumption, same as the project registry.
