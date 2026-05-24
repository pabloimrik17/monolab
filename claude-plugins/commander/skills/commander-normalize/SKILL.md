---
name: commander-normalize
description: Use when a Commander command (commander-add, future commander-update / commander-list) needs to turn raw detected keywords into the final persisted keywords[]. Applies controlled vocabulary + synonym expansion + exclusion + multi-monorepo aggregation + promotion + deterministic sort, and reports dropped terms so the caller can surface vocabulary gaps.
---

# commander-normalize

Turn raw, stochastic keyword output from auto-detection (Haiku) into a deterministic, controlled-vocabulary list suitable for persistence in the Commander registry. Also report raw terms dropped as vocabulary gaps so the caller can offer a "suggest this term" flow.

## When to use

- `commander-add` Step 2.5, between Haiku detection (Step 2) and subproject selection (Step 3).
- Future `commander-update` and `commander-list` when they need to flag drift against the current vocabulary.
- Any time a caller has raw keyword candidates + optional `description` + optional `specialRules` and needs the canonical persisted list.

## Inputs

| Field          | Type       | Required | Notes                                                                                                                                                                                                                                                  |
| -------------- | ---------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `keywords`     | `string[]` | yes      | Raw candidate terms as emitted by Haiku (lowercase, kebab-case expected; tolerate either).                                                                                                                                                             |
| `description`  | `string`   | no       | 10–15-word project summary, used by step 5 (promotion).                                                                                                                                                                                                |
| `specialRules` | `string[]` | no       | Free-form rules, used by step 5 (promotion).                                                                                                                                                                                                           |
| `repoType`     | `string`   | no       | One of `"single-repo"`, `"monorepo"`, `"multi-monorepo"`. Controls step 4 (aggregation).                                                                                                                                                               |
| `subprojects`  | `object[]` | no       | Only required when `repoType == "multi-monorepo"`. Each entry is `{ name, keywords, description?, specialRules? }`; promotion (step 5) runs per-subproject on the entry's own `description`/`specialRules` when present, else on the top-level fields. |

## Outputs

| Field          | Type       | Notes                                                                                                                                                                                                                          |
| -------------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `keywords`     | `string[]` | Normalized, deduplicated, alphabetically sorted. Every entry is in `vocabulary.json#canonical`. For `repoType == "multi-monorepo"` this is the top-level union; otherwise the normalized whole-tree list.                      |
| `subprojects`  | `object[]` | Present ONLY when `repoType == "multi-monorepo"`. One entry per input subproject as `{ name, keywords }`, where `keywords` is that subproject's normalized (non-aggregated) list. Order matches the input `subprojects` order. |
| `droppedTerms` | `string[]` | Raw terms dropped by step 2 (vocabulary filter) across all inputs (top-level + every subproject), deduplicated, that are NOT in `vocabulary.json#excludes`. See the "Dropped-term reporting" section.                          |

## Vocabulary sidecar

Load `references/vocabulary.json` at invocation time. It defines three closed sets:

- `canonical` (`string[]`) — the only terms permitted in the output.
- `synonyms` (`object<string, string[]>`) — non-canonical input term → list of canonical replacements.
- `excludes` (`string[]`) — terms that SHALL never appear in the output, even if Haiku emits them.

Invariants (validated whenever `vocabulary.json` is edited):

- Every `canonical` entry is lowercase, unique, and NOT in `excludes`.
- Every value in every `synonyms` list is in `canonical`.
- No `synonyms` key appears in `canonical`.

## Pipeline

Six steps, applied in this order. Do not reorder — each step assumes the previous one has run.

### Step 1 — Synonym expansion

For each raw input term, if it is a key in `synonyms`, replace it with the canonical list it maps to. Non-synonym terms pass through unchanged.

Example:

- Input: `["pnpm-workspace", "react", "nextjs"]`
- After step 1: `["pnpm", "monorepo", "react", "next"]`

### Step 2 — Vocabulary filter

Intersect the working set with `canonical`. Any term not in `canonical` is dropped. Record each dropped raw term for step 7.

Example:

- Input: `["react", "typescript", "foobar"]`
- After step 2: `["react", "typescript"]`
- Dropped (raw): `["foobar"]`

### Step 3 — Exclusion (never-emit)

Remove any term present in `excludes`. This is a hard drop — even if a term somehow appeared in both `canonical` and `excludes`, the exclusion wins. Dropped terms here are NOT vocabulary gaps; do not record them for step 7.

Example:

- Input: `["react", "eslint", "prettier"]`
- After step 3: `["react"]`

### Step 4 — Multi-monorepo aggregation

**Precondition:** `repoType == "multi-monorepo"`. Skip otherwise.

**Single invocation, dual output.** The caller passes `keywords` (top-level raw, may be `[]`) plus `subprojects: [{ name, keywords, description?, specialRules? }]` in ONE call. The skill applies steps 1–3 to each subproject's raw keywords independently — producing that subproject's normalized list — and then computes the top-level `keywords` as the set-union of those already-normalized lists. Both the per-subproject normalized lists (returned as `subprojects[i].keywords`) and the top-level union (returned as `keywords`) are emitted from the same call. Callers SHALL NOT issue per-subproject invocations; `droppedTerms` is deduplicated authoritatively at the skill boundary.

Callers persist each subproject's own normalized list on individual records; the top-level union is informational (surfaced to the user at confirmation, not persisted on subproject records).

Example:

- Input `subprojects`: `[{name:"app-a", keywords:["reactjs","typescript","foobar"]}, {name:"app-b", keywords:["vuejs","typescript"]}]`.
- After steps 1–3 per subproject: `app-a → ["react","typescript"]`, `app-b → ["vue","typescript"]`.
- Returned: `{ keywords: ["react","typescript","vue"], subprojects: [{name:"app-a",keywords:["react","typescript"]}, {name:"app-b",keywords:["vue","typescript"]}], droppedTerms: ["foobar"] }`.

### Step 5 — Promotion

For each canonical term, check `description` (case-insensitive, word-boundary match) and each `specialRules` entry (same match rules). If the term matches either, add it to the working set.

Word-boundary match: regex-equivalent `\b<term>\b` with `i` flag; hyphens within a canonical term are treated as literal characters (so `clean-architecture` matches in `"Clean-Architecture based"` but not in `"cleanarchitecture"`).

Example:

- Working set (post step 4): `[]`
- `description`: `"Inversify-based clean architecture with typescript."`
- After step 5: `["clean-architecture", "inversify", "typescript"]` (before dedup/sort)

> Note: `clean architecture` in prose matches canonical `clean-architecture` because the prose form has a word-boundary between the two words; if you prefer stricter matching, change the regex to require the exact hyphenated form.

### Step 6 — Dedup + sort

Deduplicate the working set and sort alphabetically ascending. This is the output.

Example:

- Input: `["typescript", "react", "react", "typescript", "next"]`
- Output: `["next", "react", "typescript"]`

## Dropped-term reporting (`droppedTerms`)

Collect, during step 2 only, the raw terms that were dropped because they were not in `canonical`. From that set, subtract any term that is also in `excludes` — those are intentional drops, not vocabulary gaps.

Worked example:

- Raw input: `["eslint", "weirdlib", "react"]`
- Step 2 drops: `["eslint", "weirdlib"]` (neither is canonical)
- Step 3 wouldn't have kept `eslint` anyway, but more importantly `eslint` is in `excludes`.
- `droppedTerms`: `["weirdlib"]` — `eslint` is suppressed as intentional.

Callers use `droppedTerms` to offer a "suggest this term" flow (see `commander-add` Step 7). If `droppedTerms` is empty, the caller SHALL skip that flow.

## Determinism

Same inputs → same outputs, byte-identical, across runs. The only sources of non-determinism in this pipeline are Haiku's input variability and the vocabulary JSON; once those are fixed, the output is a pure function.
