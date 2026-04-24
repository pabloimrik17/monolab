## 1. Normalize Skill Scaffolding

- [x] 1.1 Create `claude-plugins/experiments/skills/commander-normalize/` directory
- [x] 1.2 Write `SKILL.md` with frontmatter (`name: commander-normalize`, description mentioning Commander + vocabulary + normalization) and prose describing inputs, outputs, and the six-step pipeline in order
- [x] 1.3 Write `references/vocabulary.json` with `canonical`, `synonyms`, `excludes` exactly as listed in `design.md` Decision 7
- [x] 1.4 Validate `vocabulary.json` against the invariants in the `commander-normalize-skill` spec (canonical lowercase and unique; no overlap with excludes; every synonym value present in canonical)

## 2. Pipeline Contract in SKILL.md

- [x] 2.1 Document step 1 synonym expansion with an example input/output pair
- [x] 2.2 Document step 2 vocabulary filter
- [x] 2.3 Document step 3 exclusion (never-emit policy)
- [x] 2.4 Document step 4 multi-monorepo aggregation with the `repoType == "multi-monorepo"` precondition
- [x] 2.5 Document step 5 promotion, including the case-insensitive word-boundary match against `description` and each `specialRules` entry
- [x] 2.6 Document step 6 dedup + alphabetical sort
- [x] 2.7 Document the `droppedTerms` return value and its excludes-suppression rule with a worked example
- [x] 2.8 (verify-fix) Clarify the multi-monorepo invocation shape in `SKILL.md`: single call, returns `{ keywords, subprojects: [{name, keywords}], droppedTerms }`; update Outputs table and Step 4 narrative; per-subproject `description`/`specialRules` supported in `subprojects[i]` for Step 5 promotion

## 3. Commander-Add Command Integration

- [x] 3.1 Add a new "Step 2.5 — Normalization" section to `claude-plugins/experiments/commands/commander-add.md` between the existing Step 2 (Haiku) and Step 3 (subproject selection)
- [x] 3.2 In Step 2.5, specify the skill invocation contract (inputs: raw keywords, description, specialRules, monorepoType; outputs: normalized keywords, droppedTerms) matching the `commander-normalize-skill` spec
- [x] 3.3 In Step 2.5, specify the per-subproject normalization loop for `monorepoType == "multi"` and the top-level union call
- [x] 3.4 Update Step 3 (subproject selection) to use the already-normalized per-subproject `keywords` when setting the selected subproject's fields
- [x] 3.5 Add the "Explicit --keywords argument bypasses normalization" rule to Step 1 (argument parsing)
- [x] 3.6 (verify-fix) Collapse the multi-monorepo flow in `commander-add.md` Step 2.5 to a single skill invocation consuming the returned `{ keywords, subprojects[i].keywords, droppedTerms }`; remove the old N+1 call pattern and the manual `droppedTerms` aggregation

## 4. repoType Persistence

- [x] 4.1 Add a "Derive repoType" sub-step in `commander-add.md` after Step 2.5, implementing the mapping in the experiments-plugin spec (`none` → `single-repo`, `single` → `monorepo`, `multi` → `multi-monorepo`)
- [x] 4.2 Add the Haiku-skipped branch: when Priority A supplies all fields, derive `repoType` by filesystem-marker inference or via `AskUserQuestion` prompt listing the three enumeration values
- [x] 4.3 Include `repoType` in the Step 6 confirmation display and in the "Edit" options list
- [x] 4.4 Update the "Record shape" block in `commander-add.md` to include `repoType` as required and mention schema v2

## 5. Registry Schema v2

- [x] 5.1 Update the schema template in `commander-add.md` (and any other authoritative reference) from `"version": 1` to `"version": 2`
- [x] 5.2 Update the "Add flow" contract in `commander-add.md` so the writer upgrades the file's `version` field to `2` on first v2 write while preserving existing records byte-for-byte
- [x] 5.3 Update the `"unsupported registry version"` error threshold wording to reference the current known version (`2`)
- [x] 5.4 Cross-check `openspec/specs/commander-registry/spec.md` after archive to ensure v2 + `repoType` requirements are correctly merged

## 6. Vocabulary Suggestion Flow

- [x] 6.1 Add a "Step 7 — Vocabulary suggestion" section to `commander-add.md`, executed only after a successful write (6b step 8)
- [x] 6.2 Specify the `AskUserQuestion` options (Yes / No / Skip session) and the session-level flag behavior
- [x] 6.3 Specify the `gh issue create` invocation: title `vocab: add <term>[, <term>...]`, body including terms, project name, UTC date
- [x] 6.4 Specify the silent-skip behavior when `gh` is absent from `PATH` (detect via `command -v gh`)
- [x] 6.5 Specify that the suggestion flow SHALL NOT run when `droppedTerms` is empty or when the user supplied `--keywords` explicitly

## 7. README + Plugin Metadata

- [x] 7.1 Add a "commander-normalize" entry under the skills list in `claude-plugins/experiments/README.md`
- [x] 7.2 Bump `claude-plugins/experiments/.claude-plugin/plugin.json` version per the repo's plugin-version-bump convention
- [x] 7.3 Bump the corresponding marketplace entry (if applicable per the plugin-version-bump spec)

## 8. Validation

- [x] 8.1 Run `openspec validate fix-commander-add-normalization --strict` and resolve any findings
- [x] 8.2 Run the plugin-validator agent against `claude-plugins/experiments/` to confirm the new skill is discoverable and the manifest is valid
- [x] 8.3 Dry-run `/experiments:commander-add` against a known multi-monorepo (e.g., this repo) and confirm: `repoType == "multi-monorepo"`, normalized keywords match the vocabulary, aggregation applied at top-level
- [x] 8.4 Dry-run against a single-repo project and confirm `repoType == "single-repo"`, no aggregation applied
- [x] 8.5 Confirm the vocabulary suggestion prompt appears when Haiku emits a term not in the vocab, and is silent when it does not
