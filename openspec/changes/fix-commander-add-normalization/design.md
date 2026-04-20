## Context

`/experiments:commander-add` writes to `~/.claude/commander/projects.json` via a three-tier detection flow (args → Haiku → prompt). Two defects observed across 7 real registrations (issue #191):

1. Haiku emits `monorepoType: none|single|multi`, used only to drive subproject selection, then discarded.
2. Keyword extraction has no vocabulary, no aggregation rule for multi-package monorepos, no promotion from `specialRules`/`description`, and no synonym normalization. Same tech shows up in different fields across runs.

Both symptoms share one root: **no post-detection normalization step.** Haiku is stochastic; the contract is deterministic. Without a deterministic stage in between, the contract is a polite suggestion.

## Goals / Non-Goals

**Goals:**

- Persist registry topology (`repoType`) so downstream commands need not re-scan.
- Keyword output determinism: same project → same `keywords[]` across runs.
- Reusable normalization primitive. Future `commander-update`/`commander-list` call the same skill.
- Evolve vocabulary without code changes in the frequent path (controlled sidecar file + GH-issue suggestion loop for gaps).

**Non-Goals:**

- Auto-migration of v1 records to v2. Drift detection is scoped to future `update`/`list` commands.
- Implementation of `commander-update`, `commander-list` (tracked elsewhere).
- Concurrency / lockfile (still v1-era assumption: single invocation).
- Cross-machine sync.
- Rewriting existing records en masse.

## Decisions

### 1. Schema bump to v2 (required `repoType`)

**Decision:** Increment `version` from `1` to `2`. Add `repoType: "single-repo" | "monorepo" | "multi-monorepo"` as a required field on every record persisted by v2-aware writers.

**Rationale:** The issue explicitly asks for required semantics. An optional field would produce two-shaped records with no forcing function — the original inconsistency problem. Version bump makes the contract honest: readers that don't know v2 abort (existing unknown-version rule), preventing silent corruption.

**Alternatives considered:**

- *Additive, optional field, stay at v1*: keeps reader-backwards-compat but weakens "required". Rejected — drift is invisible.
- *Separate file for v2 record*: overengineered; single-file model is the existing contract.

### 2. No automatic v1→v2 migration

**Decision:** `commander-add` writes v2. Existing v1 records remain on disk unchanged. Future `commander-update`/`commander-list` detect missing `repoType` and surface a drift warning.

**Rationale:** Matches user-stated preference (issue discussion). Migration inference (e.g., `monorepoRoot` present → `multi-monorepo`) is fallible: a "single" monorepo has no `monorepoRoot` and is indistinguishable from `single-repo` without re-scan. A human-in-the-loop fix via `update` is more honest than auto-inference.

**Trade-off:** Until `update`/`list` ships, the registry lives in a mixed state. Acceptable: reads still work; only the new `repoType` queries miss on legacy records.

### 3. Normalization as a separate skill, not inline logic

**Decision:** New skill `claude-plugins/experiments/skills/commander-normalize/` with a `references/vocabulary.json` sidecar. `commander-add` invokes the skill between Haiku detect (Step 2) and subproject selection (Step 3) — this is the "Step 2.5" phase.

**Rationale:**

- Reuse: `commander-update`/`commander-list` will normalize reads to flag drift; they call the same skill.
- Progressive disclosure: the skill's `SKILL.md` stays short and trigger-effective; the vocabulary JSON is loaded only when the pipeline runs.
- Evolution: changing the vocab = editing one JSON file.

**Alternatives considered:**

- *Inline in `commander-add.md`*: duplicates later across `update`/`list`. Rejected.
- *Python/JS script artifact*: Claude Code skills don't have a compiled runtime. Rejected.

### 4. Pipeline order (fixed)

```
raw Haiku output
  │
  ▼
1. synonym expansion           (pnpm-workspace → [pnpm, monorepo])
  │
  ▼
2. vocabulary filter           (keep ∩ VOCAB)
  │
  ▼
3. ubiquitous-tool exclusion   (drop eslint/prettier/husky/lint-staged)
  │
  ▼
4. multi-monorepo aggregation  (top.keywords = ∪ subprojects[i].keywords)
     applied only if repoType == "multi-monorepo"
  │
  ▼
5. promotion                   (vocab terms in description|specialRules → keywords)
  │
  ▼
6. dedup + alphabetical sort   (deterministic order)
  │
  ▼
normalized keywords
```

**Rationale:**

- Synonyms first so downstream steps see canonical names.
- Filter before aggregation so non-vocab junk doesn't enter the union.
- Exclusion after filter because some excluded terms (`eslint`) are in the vocab otherwise.
- Promotion after aggregation so it can recover terms mentioned only in prose.
- Dedup + sort last, for stable output.

### 5. Ubiquitous-tool policy: never-emit

**Decision:** `eslint`, `prettier`, `husky`, `lint-staged`, and similar universal tooling never appear in `keywords[]`. Maintained in `vocabulary.json#excludes`.

**Rationale:** Keywords differentiate. A tag present in ~100% of records differentiates nothing, and its inconsistent emission was one of the four observed defects. `package.json` remains the source of truth for "does this project use eslint".

### 6. Vocabulary evolution loop via `AskUserQuestion` + `gh`

**Decision:** After a successful write, if the pipeline dropped any Haiku-emitted term not in the vocab and not in the excludes, `commander-add` surfaces a single `AskUserQuestion` offering to open a GitHub issue via `gh issue create` with the terms, source project, and date.

**Rationale:**

- Non-blocking: write succeeds first, question is post-hoc.
- Low friction: `gh` CLI is already present in the repo's dev environment; no auth token config.
- Auditable: the issue body names the project and run context.
- Bounded: a "Don't ask again this session" option prevents nagging during batch registrations.

### 7. Starter vocabulary

Shipped inline with this change at `skills/commander-normalize/references/vocabulary.json`:

```json
{
  "canonical": [
    "typescript", "javascript", "python", "rust", "go", "kotlin", "swift",
    "react", "next", "solid", "solid-start", "vue", "svelte", "nestjs",
    "express", "fastify", "remix", "expo", "react-native", "tauri", "electron",
    "node", "bun", "deno",
    "pnpm", "npm", "yarn",
    "monorepo", "nx", "turbo", "lerna", "rush",
    "vitest", "jest", "playwright", "cypress",
    "inversify", "mobx", "zustand", "redux",
    "prisma", "drizzle", "sqlalchemy", "postgres", "sqlite", "mongodb",
    "tailwindcss", "styled-components", "emotion", "css-modules",
    "zod", "yup", "joi",
    "i18next", "react-intl",
    "docker", "terraform", "kubernetes",
    "clean-architecture", "ddd", "hexagonal"
  ],
  "synonyms": {
    "pnpm-workspace": ["pnpm", "monorepo"],
    "yarn-workspaces": ["yarn", "monorepo"],
    "nx-workspace": ["nx", "monorepo"],
    "turborepo": ["turbo", "monorepo"],
    "tailwind": ["tailwindcss"],
    "reactjs": ["react"],
    "nextjs": ["next"],
    "solidjs": ["solid"],
    "vuejs": ["vue"],
    "nest": ["nestjs"],
    "styled": ["styled-components"]
  },
  "excludes": [
    "eslint", "prettier", "husky", "lint-staged",
    "commitlint", "lefthook", "editorconfig"
  ]
}
```

## Risks / Trade-offs

- **Risk:** Existing v1 registry becomes "drift" overnight → Mitigation: `commander-add` is the only writer in this change; reads of v1 still work until v2-only readers exist.
- **Risk:** Vocabulary churn creates friction → Mitigation: the evolution loop is post-write and skippable. Adding a term is a single-line JSON edit.
- **Risk:** `repoType` inference at write time is off (Haiku misreads topology) → Mitigation: existing confirmation step (Step 3) already shows derived fields; user can edit before save.
- **Risk:** `gh` CLI not installed → Mitigation: detect absence, swallow the suggestion silently (don't fail the write).
- **Risk:** Haiku emits canonical-form keywords that the filter mistakenly drops (false positive) → Mitigation: dropped-term set is exactly what the evolution loop surfaces; false positives become issues fast.
- **Trade-off:** Alphabetical sort loses any signal from insertion order (e.g., "primary language first"). Acceptable: deterministic > ergonomic.

## Migration Plan

1. Ship v2 writer in `commander-add`. No code touches v1 records on disk.
2. Existing registry at `~/.claude/commander/projects.json` remains `"version": 1` until the user registers a new project (first v2 write). At that point the file is rewritten as `"version": 2`, legacy records unchanged (they simply lack `repoType`).
3. Future `commander-update`/`commander-list` (separate change) own drift detection: on read, flag any v2-file record without `repoType` and suggest `commander-update <name>`.

**Rollback:** Revert the plugin version bump + files. v2 registry files on disk are forward-incompatible with the reverted code (would abort with "unsupported registry version"), but no data is lost — user would need to re-apply the change or manually downgrade the file's `version` field.

## Open Questions

- None blocking. Future refinement: consider lowercasing GH-issue title with a structured template (`vocab: add <term>`) once we see the first N proposals.
