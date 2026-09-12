<!-- Tag per task: [wave · teammate · model · scheduling]. Waves: 0 setup → A and B run in parallel (disjoint files, contracts fixed in design.md) → C after A+B → D → E. `par` = runs concurrently with the other teammates of its wave; `seq` = strictly after the previous wave. `main` = this orchestrator session; it owns every human gate and never edits a teammate's files. Every teammate is torn down as soon as it delivers; reports ≤ 400 lines, issues first. -->

## 1. Orchestrator setup (main session)

_Sequential. The main session runs this itself; it holds paths and digests only for the rest of the change._

- [ ] 1.1 [0 · main · fable · seq] Verify every skill and agent named in `design.md` D12 is installed (`skill-creator`, `plugin-dev:skill-development`, `plugin-dev:command-development`, `plugin-dev:plugin-structure`, `superpowers:writing-skills`, `mattpocock-skills:writing-for-agents`, `elements-of-style:writing-clearly-and-concisely`, `experiments:writing-comments`, agents `plugin-dev:skill-reviewer` and `plugin-dev:plugin-validator`) and report any that is missing before dispatching a teammate
- [ ] 1.2 [0 · main · fable · seq] Create `claude-plugins/experiments/skills/persist-run-knowledge/reference/`, `skills/recall-run-knowledge/reference/`, `scripts/fixtures/knowledge/` and verify the directories exist
- [ ] 1.3 [0 · main · fable · seq] Cut two trimmed fixture run dirs from `~/.claude/experiments/plans/commander-deep-minor-minor-1784387463` (cross-project, two groups, both changesets) and `~/.claude/experiments/plans/dryrun-alpha-minor-*` (single-project, legacy headings) into `scripts/fixtures/knowledge/`, stripping `changelogs/` and `logs/`; verify each fixture contains `_meta.json`, `dossier.md`, `groups/*/research.md`, `groups/*/_meta.json`
- [ ] 1.4 [0 · main · fable · seq] Brief every wave A/B teammate with: `proposal.md`, `design.md`, the spec files it implements, the fixture paths, and the reporting rule (≤ 400 lines, issues first, evidence after); verify each brief names the exact files the teammate owns and no other

## 2. Scripts (wave A · teammate `scripts` · model sonnet · runs in parallel with §3–§7)

_Loads `experiments:writing-comments` before writing any `.mjs`. TDD: test first, then implementation. Zero dependencies, Node ≥ 22._

- [ ] 2.1 [A · scripts · sonnet · par] Write `scripts/lib/knowledge.mjs` + `knowledge.test.mjs`: `resolveKnowledgeRoot`, package slug, frontmatter parse/serialize (scalars and string lists only), `research.md` section parser (both heading contracts), slot/marker helpers, range algebra over `lib/semver.mjs`; verify tests cover the relative-path error `Error: knowledge_root must be absolute or ~-prefixed.` and `~` expansion
- [ ] 2.2 [A · scripts · sonnet · par] Write `scripts/copy-run-knowledge.mjs` + tests: `--outcome` stamping `recordedAt` and writing `<runDir>/outcome.json`, vault bootstrap (`index.json`, `.obsidian/app.json`, `Runs.base`, `Packages.base`), allowlisted copy, run-note and hub skeletons with empty slots, `<!-- distill -->` for legacy research, `--synthetic`, reconstructed `outcome.json` for legacy runs, idempotent replace-by-marker; verify against both fixtures and that re-running on the same fixture leaves one section per range
- [ ] 2.3 [A · scripts · sonnet · par] Write `scripts/check-knowledge-note.mjs` + tests: frontmatter keys/types, slot filled, line caps (8 run / 5 hub), no code blocks in slots, no edits outside slots via pre-image hash, no "plan" in headings; verify one failing fixture per rule and exit code 1 with a JSON violations list
- [ ] 2.4 [A · scripts · sonnet · par] Write `scripts/build-knowledge-index.mjs` + tests: rebuild from frontmatter + markers + `groups/*/_meta.json` into the `runs[]` / `packages[].ranges[]` field set fixed in `specs/run-knowledge-store/spec.md` (including `groupId`, `bucketKey`, `createdAt`, `status`), `status: draft` and `synthetic` carried through, `supersededBy` computed and written into the older marker; verify the index for the two fixtures matches a golden file
- [ ] 2.5 [A · scripts · sonnet · par] Write `scripts/match-knowledge.mjs` + tests: the four classes exactly as `design.md` D6, one same-name hit per package with preference exact > overlap > prior then newest `createdAt`, `delta` for overlap, `synthetic`/`draft` excluded, `related` via `bucketKey`, output shape verbatim; verify the scenarios in `specs/recall-run-knowledge-skill/spec.md` each map to a test
- [ ] 2.6 [A · scripts · sonnet · par] Extend `scripts/check-dossier.mjs` + test: accept an optional `## Prior runs` H2 after `## Skipped or unavailable` and before the bump set in both modes; verify a dossier with and without the section passes and one with it misplaced fails
- [ ] 2.7 [A · scripts · sonnet · par] Add the four new rows plus the `check-dossier.mjs` note to `scripts/README.md`; verify every `scripts/*.mjs` (non-test) has a row
- [ ] 2.8 [A · scripts · sonnet · par] Run `pnpm --filter @m0n0lab/plugin-experiments run test:unit` and verify it is green; no `attw` applies (no package exports change)

## 3. Persist skill (wave A · teammate `skill-persist` · model opus · parallel)

- [ ] 3.1 [A · skill-persist · opus · par] Scaffold `skills/persist-run-knowledge/` with `skill-creator`; write `SKILL.md` frontmatter `name: persist-run-knowledge` with a description targeting "after apply, before the cleanup prompt"; verify frontmatter parses and the description contains no procedure
- [ ] 3.2 [A · skill-persist · opus · par] Write `reference/note-templates.md` with the run-note and hub templates verbatim from `design.md` D3 (frontmatter, markers, slots, caps); verify every key and marker matches `specs/run-knowledge-store/spec.md`
- [ ] 3.3 [A · skill-persist · opus · par] Write the `SKILL.md` procedure: inputs `{ runDir, outcome, synthetic? }` (the skill stamps `recordedAt` and writes `<runDir>/outcome.json`; the orchestrator never does), persist criteria (applied/partial only), the five D5 steps naming the scripts, the single subagent brief (slots only, caps, final line `<runId>: filled <n>/<n> slots`), the two-round repair loop, `status: draft` degradation, the digest lines; verify against every scenario in `specs/persist-run-knowledge-skill/spec.md`
- [ ] 3.4 [A · skill-persist · opus · par] Apply `mattpocock-skills:writing-for-agents` and `elements-of-style:writing-clearly-and-concisely`; verify `SKILL.md` defers to `reference/` and the scripts instead of restating them

## 4. Recall skill (wave A · teammate `skill-recall` · model opus · parallel)

- [ ] 4.1 [A · skill-recall · opus · par] Scaffold `skills/recall-run-knowledge/` with `skill-creator`; `SKILL.md` frontmatter `name: recall-run-knowledge`, description targeting "after grouping, before the workflow dispatch"; verify frontmatter parses
- [ ] 4.2 [A · skill-recall · opus · par] Write `reference/match-classes.md` (the D6 table, exclusions, preference, `delta`) and `reference/prompt-block.md` (the D7 block with the four directive lines verbatim) — the workflow and both orchestrators reference these files; verify wording matches `specs/parallel-research-workflow/spec.md`
- [ ] 4.3 [A · skill-recall · opus · par] Write the `SKILL.md` procedure: root resolution, no-op when the base is absent with `Knowledge: no base at <root>`, the matcher call, `priorKnowledge` hand-off, the digest line, read-only rule; verify against every scenario in `specs/recall-run-knowledge-skill/spec.md`
- [ ] 4.4 [A · skill-recall · opus · par] Apply `writing-for-agents` and `writing-clearly-and-concisely`; verify no note body is ever read by the main path

## 5. Workflow wiring (wave B · teammate `wire-workflow` · model opus · parallel with §2–§4)

- [ ] 5.1 [B · wire-workflow · opus · par] Edit `skills/parallel-research-workflow/SKILL.md`: add the optional `priorKnowledge` input to the input contract with the absent ⇒ unchanged rule; verify the input table and validation list match the MODIFIED `Workflow input contract` requirement
- [ ] 5.2 [B · wire-workflow · opus · par] Add the `## Prior knowledge (not verified for this project)` block to both prompt templates by reference to `recall-run-knowledge/reference/prompt-block.md`, with the exact-hit rule "fetch the changelog, copy `### Universal`, `source: prior-run <runId>`"; verify both templates and the hard-wall fallback still enforce non-termination
- [ ] 5.3 [B · wire-workflow · opus · par] Change the single-project phase-2 `research.md` contract to the four H3 pairs with `_no findings_` sentinels; verify the integrity phase and the synthesizer instructions reference the new headings
- [ ] 5.4 [B · wire-workflow · opus · par] Add the optional `## Prior runs` section to the phase-4 synthesizer brief and to the cross-project dossier template, in position, omitted when there is no hit; verify `check-dossier.mjs` (§2.6) accepts what the brief produces
- [ ] 5.5 [B · wire-workflow · opus · par] Update the cleanup section: persistence happens before the `delete-plan` / `keep-plan` prompt and the workflow still writes only under `plans/` + `changelogs/`; verify the hard rules list is unchanged except for that sentence

## 6. Single-project orchestrator wiring (wave B · teammate `wire-single` · model opus · parallel)

- [ ] 6.1 [B · wire-single · opus · par] Edit `skills/npm-update-deep-orchestrator/SKILL.md`: add Step 3.5 (invoke `recall-run-knowledge` on the groups, pass `priorKnowledge` into Step 4); verify the no-base path invokes the workflow exactly as today
- [ ] 6.2 [B · wire-single · opus · par] Write `_meta.json.phase = "executing"` at Step 6 start and `"done"` when apply completes on every `apply-*` path; verify `cancel` and both `abort` paths never write a phase
- [ ] 6.3 [B · wire-single · opus · par] Add Step 7.5: assemble the outcome object from the `apply-npm-updates` / `apply-engine-bumps` fragments per `design.md` D4 (no `recordedAt`, no file write), invoke `persist-run-knowledge` with `{ runDir, outcome }`, capture the digest; skip with `Knowledge: not persisted (<reason>)` on `cancel`/`abort`/`failed`; verify `Applicable (0)` persists
- [ ] 6.4 [B · wire-single · opus · par] Add the `Knowledge:` line after `Install:` in Step 7 and the knowledge-root carve-out to the hard rules; verify the per-level delta table needs no change (the steps are level-independent)

## 7. Cross-project orchestrator wiring (wave B · teammate `wire-cross` · model opus · parallel)

- [ ] 7.1 [B · wire-cross · opus · par] Edit `skills/commander-update-orchestrator/SKILL.md`: add 6.5.3b (recall on the grouped deduplicated set, `mode: cross-project`) and pass `priorKnowledge` in 6.5.4; verify shallow mode is untouched
- [ ] 7.2 [B · wire-cross · opus · par] Write `phase: "executing"` at Step 10a start and `"done"` after the last 10b round; verify the shallow path writes neither
- [ ] 7.3 [B · wire-cross · opus · par] Add Step 10b.5 before 10c: assemble one outcome object with a `projects[]` entry per project (mechanism, verbatim fragment, changeset status/path/counts), one `persist-run-knowledge` invocation with `{ runDir, outcome }` for the run, skip conditions; verify an all-projects-failed 10a is not persisted and `apply-bumps-only` persists with changeset `not-run`
- [ ] 7.4 [B · wire-cross · opus · par] Add the always-present `Knowledge:` line to Step 11 (deep) and the carve-out to the hard rules; verify registry byte-identity wording is unchanged

## 8. Commands and registration (wave C · teammate `commands-and-readmes` · model sonnet · after §2–§7)

- [ ] 8.1 [C · commands-and-readmes · sonnet · seq after A+B] Write `commands/knowledge-persist.md` with `plugin-dev:command-development`: `$ARGUMENTS` (`[<run-dir>…] [--synthetic]`), default selection via `AskUserQuestion`, delegation to `persist-run-knowledge`, stalled-run refusal; verify against every scenario in `specs/knowledge-persist-command/spec.md`
- [ ] 8.2 [C · commands-and-readmes · sonnet · seq after A+B] Write `commands/knowledge-recall.md`: `<pkg> [<from> <to>]`, usage line, hits by class with paths, ranges table without versions, one-line unknown/absent messages; verify against `specs/knowledge-recall-command/spec.md`
- [ ] 8.3 [C · commands-and-readmes · sonnet · seq after A+B] Add `userConfig.knowledge_root` to `claude-plugins/experiments/.claude-plugin/plugin.json` (type string, title, description, default `""`) with `plugin-dev:plugin-structure`; verify the manifest parses and no version field changed
- [ ] 8.4 [C · commands-and-readmes · sonnet · seq after A+B] Add README rows for both skills and both commands; verify every directory under `skills/` and every file under `commands/` has an entry
- [ ] 8.5 [C · commands-and-readmes · sonnet · seq after A+B] Verify `git diff` shows no manual version edits to `plugin.json`, `package.json`, or the repo-root `/.claude-plugin/marketplace.json`

## 9. Seam audit, seed, dogfood (wave D · main session · sequential)

- [ ] 9.1 [D · main · fable · seq] Seam audit: grep every path, heading, marker, directive keyword and digest string across the two skills, their `reference/`, the workflow, both orchestrators, the commands and the scripts; verify each is spelled identically everywhere (list the greps used and their hit counts)
- [ ] 9.2 [D · main · fable · seq] Seed: run `/experiments:knowledge-persist` over the two real cross-project runs, then over the four `dryrun-alpha` runs with `--synthetic`; verify `index.json` lists 6 runs, the real ones `status: ok`, the synthetic ones tagged, and the stalled major run absent
- [ ] 9.3 [D · main · fable · seq] Review the two real run notes and their hubs by hand once; verify no slot is empty, no line sits outside a slot, and `check-knowledge-note.mjs` passes on every note
- [ ] 9.4 [D · main · fable · seq] Dogfood recall: run `/experiments:knowledge-recall @commitlint/cli 21.1.0 21.2.1` (expect `exact`), `@commitlint/cli 21.1.0 21.3.0` (expect `overlap`), `@commitlint/cli 21.2.1 21.4.0` (expect `prior`); verify the classes and that no synthetic hit appears
- [ ] 9.5 [D · main · fable · seq] Dogfood a real deep run (`/experiments:npm-update-deep-patch` or `-minor` on monolab or dotfiles) end to end; verify the `Knowledge:` digest appears after grouping, exact-hit sections in `research.md` carry `source: prior-run <runId>`, the dossier has `## Prior runs` only when hits exist, `_meta.json.phase` reaches `done`, the run is persisted before the cleanup prompt, and `~/.claude/commander/projects.json` is byte-identical (`shasum`)
- [ ] 9.6 [D · main · fable · seq] Open the vault folder in Obsidian once; verify wikilinks resolve, properties render, and both `.base` views list runs and packages

## 10. Verification and audit (wave E · teammate `verify` + one `fix-*` per disjoint file · model opus · sequential loop)

- [ ] 10.1 [E · verify + one fix-per-file · opus · seq loop] One teammate runs `/opsx:verify add-run-knowledge-base` across all three dimensions (report ≤ 400 lines, issues first); the main dispatches one fixer per disjoint file and re-runs until no CRITICAL or WARNING remains; verify the final report and that each round's fixers touched only their files
- [ ] 10.2 [E · plugin-dev:skill-reviewer agent · seq] Run the `plugin-dev:skill-reviewer` agent over both `SKILL.md`; resolve or explicitly reject every finding in-session; verify the shipped text carries the accepted findings
- [ ] 10.3 [E · plugin-dev:plugin-validator agent · seq] Run the `plugin-dev:plugin-validator` agent; verify no structural or manifest errors
- [ ] 10.4 [E · main · fable · seq] Run `skill-creator` evals on both descriptions against an intended and a control scenario; verify each triggers on the intended one and stays silent on the control
- [ ] 10.5 [E · main · fable · seq] Run `pnpm --filter @m0n0lab/plugin-experiments run test:unit` and `openspec validate add-run-knowledge-base --strict`; verify both pass
- [ ] 10.6 [E · main · fable · seq] Run `/experiments:purge-comments` over the branch; verify scripts and tests carry no narrative comment noise

Notes: no source package, build target or export changes — no `nx run` target and no `attw --pack` validation applies; plugin tests run through the plugin's own `test:unit` script. Every teammate is torn down as soon as it delivers.
