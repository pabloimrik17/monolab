## Context

The deep-update family layers "research" on top of the shallow npm-update commands: scan → group → fetch every changelog in parallel → cross-reference against the codebase → synthesize one integrated document → user-gated apply. Today the whole pipeline is prose an LLM executes in the main conversation. An analysis pass (6 parallel readers over the command/skill files, then 3 independent redesign lenses) confirmed the three reported failures are structural:

- The only precondition checked before apply is "the plan document exists on disk" — not that changelogs were fetched or that the document contains its changelog section. So P1 (skipped changelogs) passes every gate.
- The spec mandates verbatim `ncu`/install streaming and in-main synthesis/reconnaissance, so P2 (full context at apply) is mandated behavior, not bad luck.
- Three different things are all called "plan" (the artifact `plan.md`, the `planning` phase, and Claude Code's native plan mode), and one passage tells the agent to write a file while in read-only plan mode (P3).

The three redesign lenses (greenfield Claude-Code-native, compliance-first minimalism, artifact-first) converged independently on the same architecture; their only material additions were "a layer below the boxes" — make the deterministic work actually deterministic (scripts), not prose an agent may skip.

Constraints: single launch end-to-end with no manual context-hygiene intervention; `AskUserQuestion`/approval gates are welcome (the user wants to stay in the decision loop); quarterly cadence so wall-clock speed is irrelevant; correctness first. Preserve: no autonomous commits/pushes/PRs; changelog research via the `npm-changelog` cache; a single global deduplicated research document.

## Goals / Non-Goals

**Goals**
- Make changelog research non-skippable by construction (script, not prose).
- Keep the main window context-clean through the apply phase (delegation + on-disk artifacts + digests).
- Remove the plan-mode naming collision with a strict three-artifact glossary.
- Preserve every human decision gate while removing mechanical context-hygiene intervention.
- Collapse the 8-file copy-drift surface into one parameterized contract.

**Non-Goals**
- Cross-project homogenization of shared configs (eslint/prettier/vitest parity across projects). Parked for a later change / a possible `commander:harmonize`.
- Changing the shallow `npm-update-*` commands, the override registry, or the `npm-changelog` cache contract.
- Optimizing wall-clock time.

## Decisions

Role taxonomy (the organizing principle): **subagents** do heavy parallel work with no dialogue (changelog research, checks); **teammates** do authorship that iterates with the user or orchestrator (dossier, per-project apply); the **main** does coordination + gates only; **scripts** do everything deterministic. The main never loads changelog bodies, research files, or the dossier — only paths and digests ≤ ~30 lines.

**D1 — Three-artifact glossary (kills P3).** `dossier.md` = the global, deduplicated research document (formerly `plan.md`). `changeset.md` = a per-project concrete edit plan (file paths, before/after, old/new string). Claude Code **plan mode** = the harness feature only. No artifact is named `plan.md`; the internal phase is `synthesis`, never `planning`. *Alternative rejected:* keep `plan.md` and disambiguate in prose — prose disambiguation is exactly what failed.

**D2 — Changelog fetch becomes an executable script (kills P1 at the source).** Research subagents invoke a `fetch-changelog` executable (same cache contract as `npm-changelog`) instead of following a prose fetch procedure. A script either runs or errors; it cannot be "skipped under pressure." *Alternative rejected:* detect the skip only at a later dossier check — detection is weaker than prevention, and we do both (see D4).

**D3 — Chronology assembled by script, not by an agent.** The `## Changelogs` section is built by a script from the on-disk cache and merely linked/embedded by the dossier. No agent re-types changelog bodies. This removes both the P1 skip incentive and the single largest P2 context sink. *Alternative rejected:* have the synthesis teammate write the chronology — reintroduces the re-typing cost and the skip incentive.

**D4 — Dossier authored by a teammate, validated by a two-layer check.** A named synthesizer teammate writes `dossier.md`, then a check runs: layer 1 deterministic (a script asserts every bump-set package has a chronology block, headings present, sentinels where empty), layer 2 a fresh-eyes subagent (fidelity to changelogs, real globs, coherent priorities). Violations go back to the still-alive synthesizer via `SendMessage` (repair loop capped at 3 rounds; residual escalates into the user gate). The user only ever sees a validated dossier. *Alternative rejected:* single-pass synthesis with no check — the status quo that lets P1 through.

**D5 — Per-project apply gate: single teammate, turn-boundary pause, orchestrator-owned human gate.** A single teammate does reconnaissance and writes `changeset.md` as its turn-1 task, then its turn ends (recon + apply share one context, honoring "don't pay context twice"). The orchestrator runs a deterministic pre-gate check (source files untouched — hash/`git diff`); if the teammate edited early, abort. The human gate is authoritative and owned by the orchestrator:
- **Primary approach — orchestrator plan mode as a review/iteration UI.** The orchestrator enters plan mode, reads the teammate's `changeset.md`, and presents it via `ExitPlanMode` for the user to review/iterate. **Approval does not implement in the main** — the orchestrator leaves plan mode and sends `proceed` to the still-alive teammate, which applies with its reconnaissance context intact. A reject-with-feedback is relayed as `revise: <feedback>` to the teammate, which updates `changeset.md`; the orchestrator re-presents.
- **Fallback approach — `AskUserQuestion`.** If the orchestrator's own `ExitPlanMode` proves unreliable under the session permission mode (see Risks), fall back to `AskUserQuestion` showing the changeset digest, then the same `proceed`/`revise` relay.

Sequential across projects; stop-on-fail is a user decision at a per-project failure gate. *Alternatives rejected:* (a) teammate-native `mode:"plan"` approval as the human gate — the lead approves autonomously and it auto-resolves in `auto` mode, so it never reaches the human (see spike below); (b) read-only recon teammate + separate apply teammate — hard-enforces no-early-edit but pays context twice; the user chose the single-teammate + deterministic pre-gate check instead.

**D6 — Research fan-out orchestration.** Prefer the Workflow tool (journaled, schema-forced outputs, resume from cache) for scan → fetch → research → chronology → check, with the journal as the single resume-truth. Because a background workflow cannot prompt the user mid-flight, all gates consolidate at the post-workflow boundary. If the Workflow tool is unavailable/immature in a given runtime, fall back to batched subagent dispatch. *Alternative rejected:* keep a second resume mechanism (`_meta.json.phase`) alongside the journal — split-brain state.

**D7 — Command-family consolidation.** The 8 deep command files become thin parameterized entry points + one per-level delta table (patch/minor/major/engines), so a fix is applied once, not four times. This structurally eliminates the drift that put the `## Changelogs` defense in the wrong file.

**D8 — Repeal verbatim streaming (kills the mandated part of P2).** `ncu`/install output is redirected to on-disk logs; the main receives a digest and only a tail-40 on failure. The existing "stream verbatim" clauses in the commander commands and `apply-npm-updates` are explicitly repealed.

## Risks / Trade-offs

- **Orchestrator plan-mode gate may auto-approve in `auto` mode** → The teammate-plan-mode spike auto-approved because the session runs `defaultMode: "auto"`; whether the orchestrator's own `ExitPlanMode` also auto-approves is unverified. Mitigation: `AskUserQuestion` is the proven-blocking fallback (D5); the proposal specs the gate abstractly so either UI slots in, and the interface is refined in a follow-up.
- **Scripts are a new tested surface** → A buggy semver/fetch script fails more silently than a wrong LLM answer a human would eyeball. Mitigation: validate scripts against the existing changelog cache before cutover; ship tests; keep a `needs_llm` escape hatch for odd changelog formats.
- **Teammate completion messages are unreliable** → In spikes, teammates went idle without a clean final report. Mitigation: the orchestrator never trusts a teammate's "done" — it verifies artifacts on disk (post-apply check is mandatory). Reinforces the artifact-first stance.
- **Killing teammates needs `TaskStop`** → Structured `shutdown_request` was not honored reliably by idle agents. Mitigation: orchestrator uses `TaskStop` for teardown.
- **Big-bang migration across 8 commands + 3 skills + new scripts** invites the very drift we are removing. Mitigation: ship as one change with a freeze on the old files; consolidate before adding.
- **Scripts doing network run under the user's permission/sandbox regime** → prompts/denials mid-run could stall the single-launch guarantee. Mitigation: ship an allowlist with the plugin.

## Spikes (run live in the target runtime, 2026-07-11)

- **Workflow-tool resume:** re-running a completed workflow with a modified tail replayed the unchanged 9-agent prefix from cache (0 tool calls, ~5.5s vs ~6.4min) and ran only the new step live. Journal resume is viable; background workflows have no mid-flight user prompt, so gates go at the boundary.
- **Teammate apply gate:** end-to-end rehearsal with real agents passed — turn-1 recon + `changeset` written with the source untouched (verified by hash), deterministic pre-gate check, `AskUserQuestion` blocked for the user under `auto` mode (proven), `SendMessage proceed` resumed the same teammate which applied exactly the approved edit with context intact. Teammate-native plan-mode approval was confirmed (docs + transcript) to be a lead/parent gate decided autonomously — never a human gate — which is why the human gate is orchestrator-owned.

## Migration Plan

1. Add plugin scripts (fetch-changelog, chronology, checks, semver, pre-gate) with tests; validate against the existing cache.
2. Rework `parallel-research-workflow` (fetch→script, synthesis→teammate+check, phase rename) behind the new artifact names.
3. Rework the per-project apply loop in `commander-update-orchestrator` and the single-project apply path; repeal verbatim streaming in `apply-npm-updates`.
4. Consolidate the 8 command files into parameterized entries + level table; freeze/remove the old files in the same change.
5. Validate with a dry run per level; refine the gate interface (plan mode vs AskUserQuestion) in a follow-up window.

Rollback: the change is additive-then-swap; reverting the command/skill files restores prior behavior (scripts are inert if unreferenced).

## Open Questions

- Does the orchestrator's own `ExitPlanMode` block for the human under `defaultMode: "auto"`, or auto-approve like the teammate path? (Determines primary vs fallback gate; validate in the follow-up interface window.)
- Workflow tool vs batched subagents as the shipped default for the fan-out — pending a maturity check in each runtime where the family runs.
- Exact `fetch-changelog` escape-hatch semantics for changelog formats the script cannot parse (fall back to an LLM subagent for just that package?).
