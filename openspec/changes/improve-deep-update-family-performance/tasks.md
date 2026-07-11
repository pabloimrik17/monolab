## 1. Glossary and naming (P3)

- [ ] 1.1 Rename the global research artifact `plan.md` → `dossier.md` across `parallel-research-workflow` and all consumers
- [ ] 1.2 Introduce `changeset.md` as the per-project apply artifact name; ensure no artifact is named `plan.md`
- [ ] 1.3 Rename the internal `planning` phase → `synthesis`; update phase vocabulary and any `_meta.json` phase values
- [ ] 1.4 Sweep command/skill prose so "plan"/"planning" refers only to Claude Code plan mode

## 2. Deterministic scripts (P1 + P2 source fixes)

- [ ] 2.1 Add a `fetch-changelog` executable that preserves the `npm-changelog` cache contract and returns structured per-package errors; add tests validated against the existing cache
- [ ] 2.2 Add a chronology-assembler script that builds the `## Changelogs` section from the cache with per-package sentinels; add tests
- [ ] 2.3 Add a dossier compliance-check script (layer 1): assert every bump-set package has a chronology block, required headings present, sentinels where empty; exit non-zero on violation
- [ ] 2.4 Add deterministic helper scripts: semver max-wins/aggregation, subset-selection validation, and the pre-gate source-untouched check
- [ ] 2.5 Ship a plugin permission allowlist for the scripts' network/tooling calls

## 3. Research workflow rework (P1 + P2)

- [ ] 3.1 Replace the prose changelog-fetch step with the `fetch-changelog` script invocation in the research subagent contract
- [ ] 3.2 Make chronology a script-assembled, dossier-linked section (remove agent re-typing of changelog bodies)
- [ ] 3.3 Move dossier synthesis to a named synthesizer teammate; wire the two-layer check (script + fresh-eyes subagent) with a repair loop capped at 3 rounds, residual escalated to the user gate
- [ ] 3.4 Decide fan-out orchestration (Workflow tool vs batched subagents); if Workflow, make the journal the single resume source of truth and remove the `_meta.json` phase machine
- [ ] 3.5 Consolidate all user gates to the post-fan-out boundary (no mid-fan-out prompts)

## 4. Main-window context diet (P2)

- [ ] 4.1 Repeal the verbatim `ncu`/install streaming clauses in `apply-npm-updates` and the commander commands
- [ ] 4.2 Redirect `ncu`/install output to on-disk logs; surface a digest plus a bounded tail-on-failure only
- [ ] 4.3 Enforce the orchestrator diet: main holds only paths + status digests (≤ ~30 lines); no changelog/research/dossier bodies enter main

## 5. Per-project apply gate

- [ ] 5.1 Implement the single apply teammate: turn-1 recon + write `changeset.md`, pause at turn boundary, no source edit
- [ ] 5.2 Add the orchestrator pre-gate check (source untouched via hash/`git diff`); abort the project on early edit
- [ ] 5.3 Implement the primary gate: orchestrator plan mode as review/iteration UI; approval delegates to the teammate (no in-main implementation); reject-with-feedback relays `revise` to the teammate
- [ ] 5.4 Implement the `AskUserQuestion` fallback gate (digest-based) for when orchestrator plan-mode approval is unreliable under the active permission mode
- [ ] 5.5 On approval, resume the same teammate via `SendMessage proceed`; verify the applied result on disk (never trust the completion message)
- [ ] 5.6 Implement sequential cross-project apply with a stop/continue user decision on per-project failure
- [ ] 5.7 Use `TaskStop` for teammate teardown (structured `shutdown_request` is unreliable for idle agents)

## 6. Command-family consolidation (P1 drift class)

- [ ] 6.1 Collapse the 8 deep command files into thin parameterized entry points + one per-level delta table (patch/minor/major/engines)
- [ ] 6.2 Express shared behavior (incl. the `## Changelogs` requirement) once so it cannot drift between levels
- [ ] 6.3 Freeze/remove the superseded command prose in the same change to avoid transition drift

## 7. Validation and dry runs

- [ ] 7.1 Dry-run each level (patch/minor/major/engines) single-project; confirm changelogs fetched, chronology present, main stays context-clean
- [ ] 7.2 Dry-run the cross-project `commander-update-deep-patch` path end-to-end (dossier → per-project gate → apply → verify-on-disk)
- [ ] 7.3 Resolve the open question on orchestrator `ExitPlanMode` behavior under `auto` mode; lock primary vs fallback gate
- [ ] 7.4 Run `openspec validate --strict` and reconcile the `experiments-plugin` spec deltas at archive time
