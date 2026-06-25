## Context

`commander-registry` (MON-128) persists the user's projects at `<HOME>/.claude/commander/projects.json` (`version: 2`, keyed by project name). Each record carries `keywords` — the project's archetype signal (react, typescript, monorepo, …). `/commander:add` (MON-129) is the only writer so far; `list`/`update`/`delete` round out CRUD over that file. The contract is re-implemented inside each command's `.md` via Claude Code built-ins (`Read`, `Write`, `Bash`) — there is no shared runtime.

`config-add` (MON-156) is the first of the `config-*` family. It must record, per project, which config files the user wants tracked, so that downstream commands can act on them: `config-list` (MON-157) renders them, `config-scan` (MON-158) bulk-discovers them, and `config-align` (MON-155 epic) aligns them cross-project respecting archetype.

## Goals / Non-Goals

**Goals:**

- A user can register a single config file (by project + relative path) to track, with project/file validation and an idempotent, atomic write.
- The persistence shape leaves `projects.json` and its four shipped commands completely untouched.
- The per-file shape is the minimum that doesn't paint `config-align` into a corner.

**Non-Goals:**

- Auto-discovery / bulk add of config files — that is `config-scan` (MON-158).
- Editing, deleting, or listing tracked configs — that is the config CRUD family (MON-157).
- The alignment engine itself (MON-155 epic).
- Cleaning up orphaned config entries when a project is deleted — see "Risks".
- Concurrency (lockfile/CAS) — single-invocation assumption, same as the project registry v1/v2.

## Decisions

**Sibling `configs.json`, not a field on the project record.** Tracked configs live in a new file `<HOME>/.claude/commander/configs.json` with its own `version: 1`, keyed by project name. Rationale:

- It keeps `projects.json` at `version: 2` and byte-for-byte readable by the four shipped CRUD commands. Those commands abort on a registry `version` greater than the one they know (`> 2`), so embedding configs in the project record forces a choice between (a) bending the registry's "increment version on schema change" rule by staying at v2 with a new field, or (b) a v2→v3 bump that requires raising the version ceiling in `add`/`list`/`update`/`delete` in lockstep. A sibling file sidesteps both.
- `config-align` is likely to want richer per-file structure later; isolating it in its own file keeps that growth from bloating the project record.

*Alternative rejected:* extend `ProjectRecord` with a `configs[]` field. Simpler "single source of truth" and free referential integrity, but couples the config schema's evolution to the project registry's version line and the four shipped commands. The sibling file trades that coupling for two files keyed by the same name (and the orphan risk below).

**Minimal per-file shape: `{ path }`.** Each config entry stores only the project-relative path. Rationale (this resolves the ticket's open design question):

- **Archetype is a project property, not a file property.** It equals the owning project's `keywords` in `projects.json`. Since `configs.json` is keyed by project name, `config-align` derives a file's applicable archetypes by joining `configs.json[project] → projects.json[project].keywords`. Storing `archetypes` per entry would (1) duplicate `projects.json.keywords`, identical across every file of a project, carrying zero per-file information, and (2) drift when `commander:update` changes the project's keywords.
- **`type`/role is derivable from the path** (`eslint.config.js` → eslint, `.prettierrc` → prettier). The only genuinely ambiguous case is a generically-named file, and that can be re-derived or annotated when `config-align` exists and has a concrete need.
- Entries are **objects, not bare strings**, from day one, so adding optional fields later (e.g. `type`) is additive — not a breaking `string → object` shape change.

*Alternative rejected:* enriched `{ path, type, archetypes[] }`. Denormalizes project keywords per file for no per-file gain and invites drift; `config-align` doesn't exist yet, so its data model shouldn't be speculatively designed here.

**Keyed by project name (same key as `projects.json`).** Makes the join to project archetype trivial and makes referential intent explicit. The configs primitive itself stays agnostic of `projects.json`; the *command* enforces that the project exists before writing.

**Command staged in the `experiments` plugin (not `commander`).** `config-add` ships as `/experiments:commander-config-add`. The `experiments` plugin is monolab's staging area for beta commander tooling — the same home as the `commander-update-*` family — and the command graduates to the `commander` plugin later, exactly as the CRUD commands (`add`/`list`/`update`/`delete`) did once stable. The persistence file still lives in the **shared** commander data dir (`~/.claude/commander/configs.json`), consistent with how the experiments `commander-update-*` commands already read `~/.claude/commander/projects.json` — the data home is independent of which plugin currently ships the command. Structurally this means the change touches the `experiments-plugin` spec (command-file + README listing), not `commander-plugin`, and the release/version line follows the `experiments` plugin's release-please flow (`feat(experiments): …`).

**A→C resolution, no Haiku.** `config-add` is the deterministic, single-file, manual entry point. Project resolves via explicit arg or an interactive picker over `commander-registry.list()`; file resolves via explicit arg or a prompt. No auto-detection subagent — bulk/auto discovery is explicitly `config-scan` (MON-158). This keeps the command cheap and predictable.

**Path normalization + add-time validation.** The supplied path is normalized to a project-relative POSIX path (strip leading `./`, no `..` escapes, never absolute-outside-project). At add time the resolved absolute path (`<project.path>/<relpath>`) must exist and be a file. Paths are **not** re-validated on read — a later-missing file is surfaced as drift (mirroring `projects.json`'s missing-`path` drift signal), not auto-removed.

## Risks / Trade-offs

- **Two files keyed by project name can drift.** Deleting a project via `commander:delete` does **not** cascade into `configs.json` in this change, so its config entries become orphans. Accepted: orphans (and later-missing files) are treated as **drift** — read operations return them as-is and surfacing/cleanup is the consumer's job (`config-list` skips/flags them; cleanup lands with the config CRUD family, MON-157). This mirrors `commander-registry`'s existing drift contract.
- **`configs.json` may need to grow for `config-align`.** Mitigated by object-shaped entries (additive growth) and by living in its own file (no impact on `projects.json`).
- **Re-implemented contract (no shared runtime).** The `configs.json` read/add/atomic-write recipe is documented in the command file and duplicated by future `config-*` commands, exactly as the `projects.json` contract is today. The `commander-config-registry` spec is the authoritative reference.
