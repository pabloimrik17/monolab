---
description: Register the current (or specified) project in the user-scoped Commander registry at ~/.claude/commander/projects.json
---

# commander-add

Register a project in the user-scoped Commander registry so future `commander:*` commands can operate on it by name.

Collects project metadata (`name`, `path`, `keywords`, `description`, optional `specialRules`) with priority **A → B → C**:

- **A)** explicit arguments (parsed from `ARGUMENTS`),
- **B)** auto-detection via a Haiku subagent that inspects the target directory,
- **C)** field-by-field prompt via `AskUserQuestion`.

Writes are synchronous and atomic (temp + rename). User confirmation is always required before any on-disk change.

---

## Registry contract

The same contract is re-implemented by every `commander:*` command via built-in tools (`Read`, `Write`, `Bash`, `Glob`). No shared runtime — this block is the authoritative reference.

### Path

`~/.claude/commander/projects.json` — resolved from `$HOME` on POSIX, `%USERPROFILE%` on Windows.

### Lazy create

- **Reads** (`read`, `list`, `getByName`) MUST NOT create the file or its parent directory. A missing file MUST be treated as an empty registry (`{ "version": 1, "projects": {} }` in memory; nothing on disk).
- **Writes** MUST create `~/.claude/commander/` recursively if it doesn't exist, and then create `projects.json` atomically.

### Schema template

The on-disk file is a single JSON object:

```json
{
    "version": 1,
    "projects": {}
}
```

For this change the schema `version` is `1`. Readers MUST abort with `"unsupported registry version"` if they see a higher version and MUST NOT overwrite the file.

### Record shape

Each entry in `projects` is keyed by `name` and has the shape:

```json
{
    "name": "investlab",
    "path": "/Users/.../monolab/apps/investlab",
    "keywords": ["react", "solid-start", "typescript"],
    "description": "Portfolio tracker, SolidStart-based, lives inside monolab monorepo.",
    "createdAt": "2026-04-19T12:00:00Z",
    "updatedAt": "2026-04-19T12:00:00Z",
    "specialRules": ["No ESLint"],
    "monorepoRoot": "/Users/.../monolab"
}
```

Fields:

- `name` (string, required) — unique registry key; kebab-case or plain lowercase.
- `path` (string, required) — absolute path to the effective project directory.
- `keywords` (string[], required, non-empty) — frameworks / languages / stacks.
- `description` (string, required, non-empty) — 10–15-word summary.
- `createdAt` (string, required) — UTC ISO-8601 timestamp of first registration.
- `updatedAt` (string, required) — UTC ISO-8601 timestamp of last modification.
- `specialRules` (string[], optional) — rules not evident from the code.
- `monorepoRoot` (string, optional) — absolute path to the monorepo root, set only when `path` is a subproject.

### Read behaviour

- `read()` → full `{ version, projects }` object; `{ version: 1, projects: {} }` when the file is missing.
- `list()` → array of `ProjectRecord` in insertion order (JSON key order).
- `getByName(name)` → the record or `null`; MUST NOT create the file.

### Add flow

`add(record)` MUST:

1. Reject with `"project name already registered"` if `name` is already a key in `projects`.
2. Reject with `"path does not exist"` if `path` is not an existing directory on disk.
3. Set `createdAt` and `updatedAt` to the current UTC ISO-8601 timestamp.
4. Persist via the atomic write recipe below.

### Atomic write recipe

Always:

1. Serialize the updated registry to JSON with **2-space indentation** and a **single trailing newline**.
2. `Write` the serialized content to a sibling temp file `~/.claude/commander/projects.json.tmp` (overwrite any pre-existing temp).
3. `Bash mv ~/.claude/commander/projects.json.tmp ~/.claude/commander/projects.json` — rename is atomic on POSIX and on Windows when the paths share a filesystem.
4. If any step fails, the previous `projects.json` MUST remain unchanged.

### JSON formatting

- 2-space indent.
- UTF-8, no BOM.
- Exactly one trailing newline.
- Keys preserved in insertion order (do not sort).

---

## Invocation

```text
/experiments:commander-add [--name <slug>] [--path <dir>] [--keywords <csv>] [--description <text>] [--rules <csv>]
```

All flags are optional. Any missing field is first attempted via auto-detection (B), then prompted (C).

## Step 1 — Parse explicit arguments (Priority A)

Parse `ARGUMENTS` as a flag string. Recognize:

| Flag            | Maps to        | Notes                                                                    |
| --------------- | -------------- | ------------------------------------------------------------------------ |
| `--name`        | `name`         | Kebab-case preferred; do not mutate the user-supplied value.             |
| `--path`        | `path`         | Resolve to an absolute path before use. Default to `$CWD` if not passed. |
| `--keywords`    | `keywords`     | Comma-separated string → split, trim, lowercase.                         |
| `--description` | `description`  | Quoted string; use as-is.                                                |
| `--rules`       | `specialRules` | Comma-separated string → split, trim. Optional.                          |

Rules:

1. Collect only fields the user explicitly passed. Do not guess; absence means "Priority B should try".
2. If `--path` is absent, default to `$CWD` (the working directory at invocation time).
3. Always resolve `path` to an absolute path before any downstream use (e.g., `Bash cd <path> && pwd`).
4. If all required fields (`name`, `path`, `keywords`, `description`) are present after parsing, **skip Priority B entirely** and go straight to **Step 5 — Validation**, then **Step 6 — Confirmation and write**.

## Step 2 — Haiku auto-detection (Priority B)

Only run this step if at least one required field is still missing after Step 1.

Dispatch a Haiku subagent to inspect the target directory:

```text
Agent({
  model: "haiku",
  subagent_type: "general-purpose",
  description: "commander auto-detect",
  prompt: "<see subagent prompt below>"
})
```

### Subagent prompt

````text
You are analyzing a project directory to populate a Commander registry record.

TARGET_PATH: <absolute path from Step 1>

Tasks:

1. Determine whether TARGET_PATH is a monorepo root. Look for these marker files in TARGET_PATH:
   - pnpm-workspace.yaml
   - nx.json
   - turbo.json
   - lerna.json
   - rush.json
   - package.json with a top-level "workspaces" field (array or { packages: [...] })
   - Cargo.toml with a [workspace] table
   - go.work

2. If it is a monorepo, enumerate the subprojects:
   - For pnpm: read the `packages` globs in pnpm-workspace.yaml
   - For npm/yarn: read `workspaces` in package.json
   - For nx: read `projects` in nx.json or scan for project.json files
   - For turbo: same as the underlying workspaces declaration
   - For cargo: read `members` in [workspace]
   - For go: read `use` directives in go.work
   Return each subproject's absolute path and its short name (the directory basename).

3. Classify monorepoType:
   - "none" if no marker files
   - "single" if exactly one subproject exists, or if the repo has a clearly dominant app with only internal libs as siblings
   - "multi" if multiple independent subprojects are present

4. Extract keywords (lowercase, kebab-case) covering frameworks, runtimes, and languages:
   - If monorepoType in {"none","single"}: scan the whole tree.
   - If monorepoType == "multi": return keywords per subproject (do NOT aggregate).
   Signals: package.json dependencies, tsconfig presence, Cargo.toml, go.mod, requirements.txt, pyproject.toml, Gemfile, pom.xml, presence of frameworks (react, next, solid, vue, svelte, nestjs, express, fastify, remix, expo, tauri, electron, django, flask, fastapi, rails, axum, tokio, actix, gin, echo), ORMs (prisma, drizzle, sqlalchemy), infra (docker, terraform, kubernetes).

5. Write a 10–15-word description summarizing what the project is.
   - If monorepoType == "multi": also emit `subprojects[i].description` for each subproject (10–15 words each, scoped to that subproject). The top-level `description` remains a monorepo-level summary.
   - If monorepoType in {"none","single"}: only the top-level `description` is required.

6. List special rules you can observe that are NOT obvious from code. Examples: "No ESLint", "Tests required for all mutations", "Uses exactOptionalPropertyTypes: true". Return [] if none.

CRITICAL OUTPUT FORMAT: your entire response MUST be a single JSON object. No markdown fences (no ```json). No prose before or after. No explanations. The first character of your response MUST be `{` and the last character MUST be `}`. Nothing else.

Schema (annotated for you; do NOT include the annotations in the output):

{
  "isMonorepo": boolean,
  "monorepoType": "none" | "single" | "multi",
  "subprojects": [
    {
      "name": string,
      "path": string,
      "keywords": string[],
      "description": string
    }
  ],
  "keywords": string[],
  "description": string,
  "specialRules": string[]
}

Example of a correctly formatted response (non-monorepo):

{"isMonorepo":false,"monorepoType":"none","subprojects":[],"keywords":["react","typescript"],"description":"Single-page React app tracking personal investments with TypeScript and Vite.","specialRules":[]}
````

### Parse the response

1. Attempt a strict parse: the raw response MUST be valid JSON whose first character is `{` and last is `}`.
2. If that fails, try a **tolerant recovery** once before re-dispatching: strip any surrounding markdown code fence (a line of three backticks, optionally followed by a language tag such as `json`, at the start, and a matching closing line of three backticks at the end), then strip any prose before the first `{` and after the last matching `}`, then re-parse. If the recovered string parses, use it.
3. If tolerant recovery fails, re-dispatch **once** with a stricter prompt that quotes the original prompt's "CRITICAL OUTPUT FORMAT" block verbatim plus: "Your previous response was not valid JSON. Emit ONLY the JSON object. First character `{`, last character `}`. No fences, no prose, no explanation."
4. If the re-dispatch still doesn't parse, abandon Priority B and fall through to Priority C for every still-missing field.

### Use the detected values

Populate any required field still missing from Step 1 with the detected equivalent:

- `keywords` ← detected `keywords` (whole-tree list for `none`/`single`; per-subproject list is applied in Step 3 for `multi`).
- `description` ← detected top-level `description` (monorepo-level for `multi`; per-subproject override is applied in Step 3).
- `specialRules` ← detected `specialRules` (may be empty).
- If `isMonorepo` is true, remember `monorepoType` and `subprojects` for Step 3.

## Step 3 — Monorepo subproject selection

Run after Step 2, before Step 4.

- If `monorepoType === "multi"` **and** the user did not supply a subproject via `--path`:
    1. Present the detected subprojects via `AskUserQuestion` (one option per subproject, label = `subprojects[i].name`, description = short path hint).
    2. On selection: set `path = subprojects[i].path` (absolute), `monorepoRoot = TARGET_PATH`, `keywords = subprojects[i].keywords`, and **`description = subprojects[i].description`** (the per-subproject summary emitted by Haiku). If the subagent omitted `subprojects[i].description`, keep the top-level `description` as a fallback and flag it for user edit in the confirmation step.
- If `monorepoType === "single"`: leave `monorepoRoot` unset; keep the aggregated `keywords` and top-level `description`.
- If `monorepoType === "none"`: leave `monorepoRoot` unset.

Confirmation step: echo the derived `path`, `monorepoRoot` (if any), and `keywords` back to the user and offer per-field edit before proceeding. Use `AskUserQuestion` with an "Edit `<field>`" option per editable field plus a "Continue" option.

## Step 4 — Prompted fallbacks (Priority C)

For each required field still missing after Steps 1–3, prompt via `AskUserQuestion`, **one field per question**:

- `name`: "What short name should identify this project in the Commander registry?"
- `path`: "Absolute path to the project directory?" (pre-fill with `$CWD`)
- `keywords`: "Comma-separated keywords describing the stack (frameworks, languages)?" — split on `,`, trim each, lowercase each before persisting.
- `description`: "One-sentence description of this project? Aim for 10–15 words." (the word count is a guideline in the question copy, not a hard-enforced limit)
- `specialRules` (optional): "Any rules a future assistant should know about that aren't evident from code? Comma-separated, leave empty to skip."

Abort rule: if the user cancels or provides an empty answer for a **required** field and does not retry, the command MUST exit without writing. Empty on an **optional** field (`specialRules`) is treated as "none" and proceeds.

## Step 5 — Validation

Before prompting for final confirmation, validate:

1. `path` exists on disk:

    ```bash
    test -d "<path>"
    ```

    If absent: abort with `"path does not exist: <path>"`. No write.

2. `name` is unique in the registry:
    - `Read` `~/.claude/commander/projects.json` if it exists; treat missing file as empty.
    - If `projects[name]` already exists: inform the user and use `AskUserQuestion` to either pick a new name or abort. On abort: exit without writing.

3. `keywords` is non-empty and `description` is non-empty. If either is empty, re-enter Priority C for that field.

## Step 6 — Confirmation and write

### 6a. Final confirmation

Render the fully populated record and ask `AskUserQuestion` with options:

- "Save" — proceed to the write.
- "Edit" — re-enter Step 4 for a single field of the user's choice.
- "Abort" — exit without writing.

### 6b. On "Save"

1. Set `createdAt` and `updatedAt` to the current UTC ISO-8601 timestamp (e.g., `date -u +%Y-%m-%dT%H:%M:%SZ`).
2. `Read` the current registry if present, else start from `{ "version": 1, "projects": {} }`.
3. Insert the new record at `projects[name]`.
4. Serialize with 2-space indent and a trailing newline.
5. Ensure `~/.claude/commander/` exists:

    ```bash
    mkdir -p ~/.claude/commander
    ```

6. `Write` the serialized content to `~/.claude/commander/projects.json.tmp`.
7. Atomically replace:

    ```bash
    mv ~/.claude/commander/projects.json.tmp ~/.claude/commander/projects.json
    ```

8. Surface a concise success message: `Registered "<name>" at <path>.`

### 6c. On any abort

Exit without writing. Do not leave `projects.json.tmp` behind if step 6b step 6 already wrote it — remove it:

```bash
rm -f ~/.claude/commander/projects.json.tmp
```

(Only applies if the abort happens between steps 6b.6 and 6b.7.)

---

## Error messages

- `"path does not exist: <path>"` — validation failure in Step 5.1.
- `"project name already registered: <name>"` — validation failure in Step 5.2.
- `"unsupported registry version: <n>"` — reader hit a future schema version.
- `"registry file is not valid JSON"` — `Read` succeeded but parsing failed; ask the user to inspect `~/.claude/commander/projects.json` by hand.

## Non-goals (deferred)

- Delete, update, list, config-add commands (separate tickets).
- Concurrency (lockfile, CAS) — v1 assumes single-invocation.
- Schema migrations — `version` is fixed at `1` for this change.
- Cross-machine sync.
