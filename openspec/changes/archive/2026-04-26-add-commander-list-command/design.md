## Context

Commander already ships a writer (`/experiments:commander-add`) that registers projects under `<HOME>/.claude/commander/projects.json` (schema v2). The registry contract — file path, lazy-create, schema, atomic-write, `read`/`list`/`getByName` — is already specced under `commander-registry` and re-implemented inline in `commander-add.md` using built-in tools (Read, Write, Bash). There is no shared runtime; each `commander:*` command re-implements the contract.

`commander:list` is the first read-only consumer. The existing `commander-add.md` already promises "future `commander-list` will surface drift" for legacy v1 records. This change cashes in that promise.

Constraints inherited from the broader Commander design:
- Pure built-in-tools implementation (Read, Bash). No new runtime, no new dependency.
- Read-only. Must never write `projects.json` or its temp sibling.
- Non-destructive on drift: surface, never auto-fix (auto-migration is `commander-update`'s job, separate ticket).
- Insertion order is the contract — do not resort.

## Goals / Non-Goals

**Goals:**
- One slash command (`/experiments:commander-list`) that prints every registered project in a human-readable, vertically-aligned YAML-ish block.
- Surface two drift conditions inline next to the project name: legacy v1 records lacking `repoType`, and records whose `path` is no longer on disk.
- Empty registry produces a single helpful line that points to `commander-add`.
- Unsupported registry version is surfaced via the existing reader contract (`unsupported registry version`) and exits non-zero without overwriting.
- Zero new dependencies. Zero new code in `packages/`.

**Non-Goals:**
- Filtering, sorting, or formatting flags (`--format`, `--name`, `--keyword`, `--repo-type`). Add when a real caller asks.
- Auto-migration of v1 records to v2. Belongs to `commander-update`.
- Stale `updatedAt` detection or "stale registry" warnings (no clear definition of stale).
- Schema evolution to v3. The reader sticks with the existing v2 contract.
- A shared "registry contract" library or sidecar skill. The contract stays duplicated in each `commander:*` command file (the existing `commander-add.md` makes this explicit). Extraction is deferred until a third consumer exists.
- Network calls, telemetry, GitHub interactions.
- Tests. The `experiments` plugin commands are not unit-tested today; manual verification only.

## Decisions

### Decision 1 — Output format: YAML-ish block per project

```
investlab  [legacy: missing repoType]
  path:          /Users/etherless/WebstormProjects/monolab/apps/investlab  (NOT FOUND)
  monorepoRoot:  /Users/etherless/WebstormProjects/monolab
  repoType:      multi-monorepo
  keywords:      react, solid-start, typescript
  description:   Portfolio tracker, SolidStart-based, lives inside monolab monorepo.
  specialRules:
    - No ESLint
    - Tests required for all mutations
  registered:    2026-04-19  (updated 2026-04-22)

qup
  path:          /Users/etherless/WebstormProjects/qup
  repoType:      single-repo
  keywords:      expo, react-native, typescript
  description:   Expo mobile app for habit tracking.
  registered:    2026-04-20

2 projects registered.
```

**Rationale**:
- All metadata visible (the ticket asks "muestra todos los metadatos"); a tabular layout would force truncation.
- Two-space indent + colon-aligned keys at column 17 (`path:` is 5 chars, `monorepoRoot:` is 13, `description:` is 12 — pad to 17 spaces from start of key) yields a calm, scannable layout.
- Optional fields (`monorepoRoot`, `specialRules`) only appear when non-empty — no `null` sentinel rows.
- Blank line between projects keeps blocks visually separate without horizontal rules.
- `registered:` collapses two timestamps. Show only `createdAt` if `updatedAt == createdAt`; otherwise append `(updated <date>)`. Date-only (no time) keeps the line short and matches the granularity users actually need.
- Multiple drift suffixes stack: `[legacy: missing repoType] [missing path]`. Order is fixed: legacy first, then missing-path.

**Alternatives considered**:
- *Compact table*: rejected — truncates `description` and hides `specialRules` / `path`.
- *Markdown with headings*: rejected for v1 — looks great inside Claude Code's chat renderer but degrades in raw terminal logs and on the JSON output of MCP tools that consume the command's text.
- *JSON output*: deferred to a future `--format json` flag.

### Decision 2 — Drift detection scope: legacy v1 + missing path only

Detect exactly:
- `record.repoType` is absent or empty → `[legacy: missing repoType]`.
- `Bash test -d "<path>"` fails → `[missing path]`. Annotate the `path:` line with ` (NOT FOUND)`.

**Rationale**:
- These are the two drift conditions the existing specs already commit to surfacing. No scope creep.
- Both are cheap: `repoType` is an in-memory check; `test -d` is one shell call per record. With realistic registries (< 50 projects), total cost is negligible.
- Anything richer (broken `monorepoRoot`, `keywords` outside the canonical vocabulary, stale `updatedAt`) would require either re-running normalization or arbitrary policy. Defer to `commander-update`.

**Alternatives considered**:
- Validate `monorepoRoot` exists too: rejected as v1 scope — same logic, different field, can ship in a follow-up if anyone reports it.
- Validate `keywords` against the current `vocabulary.json`: rejected — out-of-scope for a list command, and vocabulary drift is intentional (users should be able to add then update vocabulary without `list` complaining).

### Decision 3 — No flags in v1

The command takes no arguments. `ARGUMENTS` is parsed only to assert it is empty (or whitespace); a non-empty value yields a friendly "this command takes no arguments" error and exits zero (so the user can re-invoke without the typo).

**Rationale**:
- The ticket does not mention flags. The other commander commands carry flags only for fields they actually need.
- Adding `--format json` or `--name` now risks committing to a JSON shape we'll regret. Wait until a real caller appears.

**Alternatives considered**:
- Silent ignore of arguments: rejected — masks typos.
- Strict reject (exit non-zero): rejected — too harsh for a read-only command. Friendly note + zero exit is enough.

### Decision 4 — Read path stays inline; no contract extraction

The command file embeds the same registry-read snippet that `commander-add.md` already documents (lazy-create-aware, version check, JSON parse, `getByName` not needed). No shared library.

**Rationale**:
- The existing spec language for `commander-registry` explicitly anticipates this: "the same contract is re-implemented by every commander:* command via built-in tools". Two consumers is not enough to extract.
- A shared SKILL.md or reference file would couple the experiments plugin's commands together and make the contract harder to grep/inline-read.
- We can extract when `commander-update` arrives (third consumer) — at that point the duplication will be clear and the API will be stable.

### Decision 5 — Empty registry: helpful single line

Print exactly:

```
No projects registered. Use /experiments:commander-add to register one.
```

No trailing count line, no decorative banner. Exit zero.

**Rationale**:
- Discoverability: a user running `commander:list` for the first time may not know `commander:add` exists.
- One line keeps the command unobtrusive when scripted or embedded in a longer workflow.

## Risks / Trade-offs

- **`test -d` is a per-record shell spawn.** With a 50-project registry that's 50 Bash calls. → Mitigation: acceptable today (registries are tiny); if it ever becomes a problem we can batch into a single `find <p1> <p2> … -maxdepth 0 -type d 2>/dev/null` call. Not worth the complexity now.
- **Legacy-v1 drift can surprise users who've never read the schema.** → Mitigation: the suffix is short (`[legacy: missing repoType]`), and the absence of an explanation in v1 is acceptable because `commander-update` (separate ticket) will be the place that explains and offers to fix.
- **Insertion order may feel arbitrary** for users with many projects who expect alphabetical. → Mitigation: matches the existing `list()` contract and is what every `commander:*` consumer will see. Adding `--sort name` later is trivial.
- **No tests.** Same posture as `commander-add` (manual verification only). → Mitigation: the manual verification matrix in `tasks.md` covers the realistic edge cases (empty registry, mixed v1/v2 records, missing path, unsupported version).

## Migration Plan

- No registry-format changes; no migration needed.
- Plugin version bump (patch) follows the existing plugin-version-bump skill.
- Branch: `feature/MON-132-commander-list` (already checked out).
- Single PR. No staged rollout. Read-only command.

## Open Questions

_None._
