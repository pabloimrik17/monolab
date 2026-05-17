---
description: Register the current (or specified) project in the user-scoped Commander registry at <HOME>/.claude/commander/projects.json
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

`<HOME>/.claude/commander/projects.json` — where `<HOME>` resolves to `$HOME` on POSIX and `%USERPROFILE%` on Windows. All path references below use this `<HOME>` placeholder.

### Lazy create

- **Reads** (`read`, `list`, `getByName`) MUST NOT create the file or its parent directory. A missing file MUST be treated as an empty registry (`{ "version": 2, "projects": {} }` in memory; nothing on disk).
- **Writes** MUST create `<HOME>/.claude/commander/` recursively if it doesn't exist, and then create `projects.json` atomically.

### Schema template

The on-disk file is a single JSON object:

```json
{
    "version": 2,
    "projects": {}
}
```

For this change the schema `version` is `2`. Readers MUST abort with `"unsupported registry version"` if they see a version greater than `2` (i.e., the highest known version) and MUST NOT overwrite the file. Readers SHALL accept `version: 1` and `version: 2` files; v1 records may lack `repoType` (see "Record shape" — legacy drift is surfaced by future `commander-update` / `commander-list`, not auto-migrated).

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
    "repoType": "multi-monorepo",
    "specialRules": ["No ESLint"],
    "monorepoRoot": "/Users/.../monolab"
}
```

Fields (schema v2):

- `name` (string, required) — unique registry key; kebab-case or plain lowercase.
- `path` (string, required) — absolute path to the effective project directory.
- `keywords` (string[], required, non-empty) — frameworks / languages / stacks. Normalized via the `commander-normalize` skill (controlled vocabulary; deterministic).
- `description` (string, required, non-empty) — 10–15-word summary.
- `createdAt` (string, required) — UTC ISO-8601 timestamp of first registration.
- `updatedAt` (string, required) — UTC ISO-8601 timestamp of last modification.
- `repoType` (string, required in v2) — one of `"single-repo"`, `"monorepo"`, `"multi-monorepo"`. Required on every record written by a v2-aware writer.
- `specialRules` (string[], optional) — rules not evident from the code.
- `monorepoRoot` (string, optional) — absolute path to the monorepo root, set only when `path` is a subproject.

### Read behaviour

- `read()` → full `{ version, projects }` object; `{ version: 1, projects: {} }` when the file is missing.
- `list()` → array of `ProjectRecord` in insertion order (JSON key order).
- `getByName(name)` → the record or `null`; MUST NOT create the file.

### Add flow

`add(record)` is the low-level persistence primitive. It is strict and has no UX affordances — error handling and recovery (re-prompt, abort) live in the command layer (Step 5.2). Callers are expected to check uniqueness and path existence first; the rejections below are the safety net.

`add(record)` MUST:

1. Reject with `"project name already registered"` if `name` is already a key in `projects`.
2. Reject with `"path does not exist"` if `path` is not an existing directory on disk.
3. Reject with `"invalid repoType: <value>"` if `record.repoType` is not exactly one of `"single-repo"`, `"monorepo"`, `"multi-monorepo"`.
4. Set `createdAt` and `updatedAt` to the current UTC ISO-8601 timestamp.
5. **Upgrade the file's `version` field to `2` on first v2 write** when the on-disk file is `"version": 1`. Existing records that predate v2 SHALL be preserved byte-for-byte (do NOT synthesize a `repoType` for them). Only the newly inserted record carries `repoType`. Future `commander-update` / `commander-list` will surface drift on legacy records.
6. Persist via the atomic write recipe below.

### Atomic write recipe

Always:

1. Serialize the updated registry to JSON with **2-space indentation** and a **single trailing newline**.
2. `Write` the serialized content to a sibling temp file `<HOME>/.claude/commander/projects.json.tmp` (overwrite any pre-existing temp).
3. `Bash mv "<HOME>/.claude/commander/projects.json.tmp" "<HOME>/.claude/commander/projects.json"` — rename is atomic on POSIX and on Windows when the paths share a filesystem.
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
3. Always resolve `path` to an absolute path before any downstream use (e.g., `Bash cd "<path>" && pwd`).
4. If all required fields (`name`, `path`, `keywords`, `description`) are present after parsing, **skip Priority B entirely** and go straight to **Step 5 — Validation**, then **Step 6 — Confirmation and write**. In this case Step 2.5 (normalization) is ALSO skipped: explicit `--keywords` is persisted verbatim (lowercased, trimmed) without vocabulary filtering and without a post-write vocabulary suggestion.
5. **Explicit `--keywords` bypasses normalization.** Whenever the user passes `--keywords`, the supplied list is persisted verbatim (lowercased, trimmed) and Step 2.5 is not invoked for that list. The vocabulary suggestion flow (Step 7) is ALSO suppressed for this invocation.

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

## Step 2.5 — Normalization

Run after Step 2, before Step 3. **Skip entirely if the user supplied `--keywords`** (see Step 1 Rule 5).

Invoke the `commander-normalize` skill (from the `experiments` plugin) to transform the raw Haiku keyword output into the final persisted `keywords[]`.

### Skill invocation contract

**Inputs:**

- `keywords` (string[]) — raw detected keywords from Haiku.
- `description` (string) — top-level (or subproject) description from Haiku.
- `specialRules` (string[]) — detected special rules (may be empty).
- `repoType` (string) — one of `"single-repo"`, `"monorepo"`, `"multi-monorepo"`. See "Derive repoType" below.
- `subprojects` (object[], only when `repoType == "multi-monorepo"`) — `[{ name, keywords }, ...]`.

**Outputs:**

- `keywords` (string[]) — normalized, deduplicated, alphabetically sorted, every entry in the canonical vocabulary.
- `droppedTerms` (string[]) — raw terms dropped by the vocabulary filter that are NOT in the excludes list. Feeds Step 7.

### Derive repoType

Map Haiku's `monorepoType` to the persisted `repoType`:

- `monorepoType: "none"` → `repoType: "single-repo"`
- `monorepoType: "single"` → `repoType: "monorepo"`
- `monorepoType: "multi"` → `repoType: "multi-monorepo"`

When Priority A supplied all fields and Haiku was skipped, `repoType` is still required. Determine it by:

1. **Filesystem-marker inference** at `path`: presence of any of `pnpm-workspace.yaml`, `nx.json`, `turbo.json`, `lerna.json`, `rush.json`, `package.json` with a top-level `workspaces` field, `Cargo.toml` with a `[workspace]` table, or `go.work` indicates a monorepo. If one clearly dominant app exists, `"monorepo"`; if multiple independent subprojects exist, `"multi-monorepo"`; otherwise `"single-repo"`.
2. **If inference is ambiguous**, prompt via `AskUserQuestion` with the three enumeration values (`single-repo`, `monorepo`, `multi-monorepo`) as options.

### Invocation flow

**For `repoType` in `{"single-repo", "monorepo"}`:**

1. Call the skill once with the whole-tree `keywords`, `description`, `specialRules`, and `repoType`.
2. Use the returned `keywords` as the final persisted list.
3. Remember `droppedTerms` for Step 7.

**For `repoType == "multi-monorepo"`:**

1. **Single skill invocation.** Pass:
    - `keywords`: top-level raw keywords (may be `[]` if Haiku did not emit a top-level list; the top-level union is produced from subprojects).
    - `description`: top-level monorepo description.
    - `specialRules`: top-level special rules (may be empty).
    - `repoType = "multi-monorepo"`.
    - `subprojects`: full detected subproject list as `[{ name, keywords, description?, specialRules? }]`. Include each subproject's own `description`/`specialRules` when Haiku emitted them so per-subproject promotion (Step 5 of the skill) is scoped correctly.
2. The skill returns `{ keywords, subprojects, droppedTerms }`:
    - `subprojects[i].keywords` — each subproject's normalized (non-aggregated) list. Step 3 persists this on the chosen subproject record.
    - `keywords` — top-level union. Informational only; surfaced at confirmation, never persisted on individual records.
    - `droppedTerms` — already deduplicated across all inputs. Feeds Step 7.

### Use the normalized output

Replace Haiku's raw `keywords` with the normalized list(s). Downstream steps (3, 4, 5, 6) operate on normalized keywords only.

## Step 3 — Monorepo subproject selection

Run after Step 2, before Step 4.

- If `monorepoType === "multi"` **and** the user did not supply a subproject via `--path`:
    1. Present the detected subprojects via `AskUserQuestion` (one option per subproject, label = `subprojects[i].name`, description = short path hint).
    2. On selection: set `path = subprojects[i].path` (absolute), `monorepoRoot = TARGET_PATH`, `keywords = subprojects[i].keywords` (the **already-normalized** per-subproject list produced by Step 2.5 — NOT the raw Haiku list, and NOT the top-level aggregated union), and **`description = subprojects[i].description`** (the per-subproject summary emitted by Haiku). If the subagent omitted `subprojects[i].description`, keep the top-level `description` as a fallback and flag it for user edit in the confirmation step.
- If `monorepoType === "single"`: leave `monorepoRoot` unset; keep the aggregated + normalized `keywords` from Step 2.5 and the top-level `description`.
- If `monorepoType === "none"`: leave `monorepoRoot` unset.

Confirmation step: echo the derived `path`, `monorepoRoot` (if any), `repoType`, and `keywords` back to the user and offer per-field edit before proceeding. Use `AskUserQuestion` with an "Edit `<field>`" option per editable field plus a "Continue" option.

## Step 4 — Prompted fallbacks (Priority C)

For each required field still missing after Steps 1–3, prompt via `AskUserQuestion`, **one field per question**:

- `name`: "What short name should identify this project in the Commander registry?"
- `path`: "Absolute path to the project directory?" (pre-fill with `$CWD`). After the user answers, resolve `path` to an absolute path (e.g., `Bash cd "<path>" && pwd`) before validation or persistence — the same invariant as Step 1 Rule 3.
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
    - `Read` `<HOME>/.claude/commander/projects.json` if it exists; treat missing file as empty.
    - If `projects[name]` already exists: inform the user and use `AskUserQuestion` to either pick a new name or abort. On abort: exit without writing. This command-level pre-check is what makes the layered design work — if this check is skipped or races, the low-level `add(record)` safety net still rejects with `"project name already registered"` (see the "Add flow" contract above).

3. `keywords` is non-empty and `description` is non-empty. If either is empty, re-enter Priority C for that field.

## Step 6 — Confirmation and write

### 6a. Final confirmation

Render the fully populated record (including `repoType`) and ask `AskUserQuestion` with options:

- "Save" — proceed to the write.
- "Edit" — re-enter Step 4 for a single field of the user's choice. The editable fields include `name`, `path`, `keywords`, `description`, `specialRules`, **and `repoType`** (presented as a 3-option pick: `single-repo` / `monorepo` / `multi-monorepo`). If `path` is the edited field, re-normalize it to an absolute path before returning to Step 5. If `repoType` is the edited field and it changes the topology (e.g., `single-repo` → `multi-monorepo`), re-run Step 2.5 normalization on the keyword set so the persisted list reflects the new topology.
- "Abort" — exit without writing.

### 6b. On "Save"

1. Set `createdAt` and `updatedAt` to the current UTC ISO-8601 timestamp (e.g., `date -u +%Y-%m-%dT%H:%M:%SZ`).
2. `Read` the current registry if present, else start from `{ "version": 2, "projects": {} }`. If the on-disk file is `{ "version": 1, ... }`, upgrade the in-memory `version` to `2` (legacy records remain in `projects` unchanged — their fields are preserved byte-for-byte and no synthetic `repoType` is added).
3. Insert the new record at `projects[name]` (the new record MUST include `repoType`).
4. Serialize with 2-space indent and a trailing newline.
5. Ensure `<HOME>/.claude/commander/` exists:

    ```bash
    mkdir -p "<HOME>/.claude/commander"
    ```

6. `Write` the serialized content to `<HOME>/.claude/commander/projects.json.tmp`.
7. Atomically replace:

    ```bash
    mv "<HOME>/.claude/commander/projects.json.tmp" "<HOME>/.claude/commander/projects.json"
    ```

8. Surface a concise success message: `Registered "<name>" at <path>.`

### 6c. On any abort

Exit without writing. Do not leave `projects.json.tmp` behind if step 6b step 7 already wrote it — remove it:

```bash
rm -f "<HOME>/.claude/commander/projects.json.tmp"
```

(Only applies if the abort happens between steps 6b.7 and 6b.8.)

## Step 7 — Vocabulary suggestion

Run **only after Step 6b step 8** (i.e., the write succeeded).

**Skip entirely** when ANY of the following holds:

- `droppedTerms` (from Step 2.5) is empty.
- The user supplied `--keywords` explicitly (Step 2.5 was bypassed; there is nothing to suggest).
- The session-level "Skip vocab suggestions" flag is set (see options below).
- `gh` is not on `PATH`. Detect via `command -v gh >/dev/null 2>&1`. Do NOT prompt or error — silently skip.

Otherwise present a single `AskUserQuestion` with three options:

- **Yes** — open a GitHub issue suggesting the dropped terms be added to the skill's vocabulary. Invoke:

    ```bash
    gh issue create \
      --title "vocab: add <term1>[, <term2>, ...]" \
      --body "<body>"
    ```

    where the title lists every dropped term comma-separated and the body is:

    ```text
    Dropped terms surfaced by `commander-normalize` during a `commander-add` invocation.

    Terms: <comma-separated dropped terms>
    Project: <name>
    Date (UTC): <YYYY-MM-DD>

    Consider adding these to `claude-plugins/experiments/skills/commander-normalize/references/vocabulary.json` (canonical, synonyms, or excludes as appropriate).
    ```

    On `gh` non-zero exit, surface the stderr to the user but do NOT roll back the registry write — the suggestion is post-hoc.

- **No** — dismiss for this project. The registry write stands.
- **Skip session** — set a session-level flag (in-conversation memory only, not persisted) that suppresses Step 7 for the remainder of the current Claude Code session, then dismiss this prompt without invoking `gh`.

The flow SHALL NOT block: the write has already succeeded by the time this prompt appears.

---

## Error messages

- `"path does not exist: <path>"` — validation failure in Step 5.1.
- `"project name already registered: <name>"` — validation failure in Step 5.2.
- `"unsupported registry version: <n>"` — reader hit a `version` greater than `2` (the highest known version).
- `"invalid repoType: <value>"` — `add(record)` received a `repoType` outside the enum.
- `"registry file is not valid JSON"` — `Read` succeeded but parsing failed; ask the user to inspect `<HOME>/.claude/commander/projects.json` by hand.

## Non-goals (deferred)

- Delete, update, list, config-add commands (separate tickets).
- Concurrency (lockfile, CAS) — single-invocation assumption carries over from v1.
- Auto-migration of v1 records to v2 — `commander-add` writes v2 only; legacy v1 records are preserved as drift and surfaced by future `commander-update` / `commander-list`.
- Cross-machine sync.
