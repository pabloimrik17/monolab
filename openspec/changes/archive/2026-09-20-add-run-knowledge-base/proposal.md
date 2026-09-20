## Why

Every applied deep-update run (`/experiments:npm-update-deep-*`, `/experiments:commander-update-deep-*`) produces research that is expensive to obtain — per-package changelog analysis, universal findings, per-project applicability calls, the changeset actually applied — and then throws it away: the run dir is offered for deletion at flow end and the 10-day stale cleanup removes whatever survives. The next run on any project re-researches the same `pkg (from → to)` from scratch. Seven runs already exist on this machine (six terminated, one stalled at `synthesis`); none of their conclusions is reachable from a new run.

This change implements the agreement recorded on [MON-149](https://linear.app/monolab/issue/MON-149/persistencia-de-planes-aplicados-como-base-de-conocimiento) (grill of 2026-09-12): persist applied runs into an append-only, Obsidian-compatible knowledge base and consult it at the start of every new deep run.

## What Changes

- **New knowledge store** at `~/.claude/experiments/knowledge/` (sibling of `plans/`, same user-scoped zone as commander), overridable via `userConfig.knowledge_root` in the experiments `plugin.json`. Layout: `index.json` (rebuildable cache, never the source of truth), `runs/<runId>.md` (immutable run note) + `runs/<runId>/…` (raw copy of the run artefacts), `packages/<pkg>.md` (accumulative per-package hub), a minimal `.obsidian/` plus `*.base` views. Full Obsidian vault semantics (frontmatter properties, wikilinks, tags, callouts) with **zero runtime dependency** on the Obsidian app, CLI or any MCP. No file or field name contains the word "plan" beyond the carved-out legacy `planDirName`.
- **What gets persisted** (applied runs only): `dossier.md`, `groups/*/research.md`, `changesets/**/changeset.md`, `_meta.json`, and a new `outcome.json` — the structured result of `apply-npm-updates` / `apply-engine-bumps` (generic bumps, overrides, install, failure) that today lives only in memory and in the raw log. Changelogs are **linked** to the existing `~/.claude/changelogs/` cache, not copied. Excluded: the plan-mode plan, `chronology.md`, logs. `Applicable (0)` runs are persisted; cancelled runs are not.
- **New skill `persist-run-knowledge`.** Invoked by both orchestrators **after the apply step and before the `delete-plan` / `keep-plan` prompt**. Mechanical copy plus `outcome.json` by script; per-package short summary written by a **subagent** from a strict template and validated by script (main-window context diet holds). Also the seeding path for pre-existing runs via the manual command below.
- **New skill `recall-run-knowledge`.** Invoked by both orchestrators **after grouping and before the workflow dispatch** (it needs the groups' `bucketKey`; see design D6). `match-knowledge.mjs` classifies every scanned `pkg (from → to)` against the base: `exact` (same pkg, same range) → the research subagent copies the hub's universal findings into `research.md` under `source: prior-run <runId>` instead of researching the package (its changelog is still fetched, so the dossier's chronology coverage holds); `overlap` → prior conclusions passed as context, fresh research restricted to the range delta; `prior` (`prior.to ≤ current.from`) → contributes per-project applicability only, never findings; `related` (same `bucketKey` from `group-packages-for-research`) → context only. No match → fresh research, unchanged. Staleness is decided **by version only, never by time**. Notes tagged `synthetic` are excluded from real recall.
- **Prior knowledge reaches the run through the workflow, not around it.** `parallel-research-workflow` gains an optional `priorKnowledge` input; the subagent prompt templates (single- and cross-project) gain a "prior knowledge — not verified for this project" block with one directive per hit (copy for `exact`, delta-only for `overlap`, applicability-only for `prior`, context for `related`); `dossier.md` gains a `## Prior runs` section when any hit exists.
- **`research.md` single-project contract split** (amends the MON-144 contract): `### Workarounds resolved (universal)` / `### … (this project)` and the same pair for improvements, so universal findings are separable from project-specific applications at persist time. Legacy runs without the split are distilled a posteriori during seeding.
- **Orchestrators actually write `phase: "executing"` / `"done"`** in `_meta.json` (declared "consumer responsibility" today, written by nobody). Persistence keys off these values.
- **Two human commands**: `/experiments:knowledge-recall <pkg>` (reuses `match-knowledge.mjs`, prints hits by class) and `/experiments:knowledge-persist [<run-dir>…]` (persists kept or legacy run dirs; the seeding tool for the six existing terminated runs, with the four `dryrun-alpha` runs tagged `synthetic`).
- **Lifecycle**: append-only; no automatic deletion; `supersededBy` is an informational frontmatter field; pruning is manual. The 10-day stale cleanup of `plans/` is untouched — persistence happens before it can matter.
- **Scripts** (zero-dep Node ≥ 22, Vitest-tested, adjacent `*.test.mjs`): `copy-run-knowledge.mjs`, `check-knowledge-note.mjs`, `build-knowledge-index.mjs`, `match-knowledge.mjs`, shared `lib/knowledge.mjs`; `check-dossier.mjs` learns the optional `## Prior runs` section. `scripts/README.md` table gains their rows.
- **Plugin README** gains rows for the two skills and the two commands. No manual version edits — release-please owns `plugin.json`, `package.json`, `marketplace.json`.

Not **BREAKING** for users: the shallow commands and the `cancel` path are byte-for-byte unchanged; persistence writes only on the apply branch and only under the knowledge root.

## Capabilities

### New Capabilities

- `run-knowledge-store`: the vault contract — location and `knowledge_root` override, directory layout, run-note and package-hub frontmatter, wikilink and tag conventions, `outcome.json` shape, `synthetic` tagging, `index.json` as a script-rebuilt cache, append-only lifecycle, and the no-"plan"-naming rule.
- `persist-run-knowledge-skill`: trigger point (after apply, before the cleanup prompt), inputs (run dir + apply result fragments), what is copied vs linked vs excluded, the subagent-written per-package summary and its script validation, idempotency on re-persist, and the legacy-run distillation fallback.
- `recall-run-knowledge-skill`: trigger point (after grouping, before the workflow dispatch), the four match classes and their exact semantics, what each class injects (copy directive, delta-only research, applicability-only, context paths), `synthetic` and `draft` exclusion, version-only staleness, the no-op when the base is absent, and the `priorKnowledge` hand-off to the workflow.
- `knowledge-recall-command`: the `/experiments:knowledge-recall <pkg>` slash command — argument handling, output by match class, delegation to `match-knowledge.mjs`.
- `knowledge-persist-command`: the `/experiments:knowledge-persist [<run-dir>…]` slash command — default selection (terminated, not yet persisted), explicit paths, the `--synthetic` flag, delegation to `persist-run-knowledge`.

### Modified Capabilities

- `parallel-research-workflow`: workflow input contract gains optional `priorKnowledge`; subagent dispatch prompt template and cross-project prompt template gain the prior-knowledge block with per-package directives (`exact` copies, `overlap` researches the delta only, `prior` reads applicability only, `related` is context); Phase 2 `research.md` single-project contract gains the universal / this-project split; Phase 4 dossier gains an optional `## Prior runs` section that `check-dossier.mjs` accepts in position; the cleanup requirement states persistence precedes the `delete-plan` / `keep-plan` prompt; hard rules keep the workflow itself write-limited to `plans/` + `changelogs/` (the persist skill, not the workflow, writes to the knowledge root).
- `npm-update-deep-patch-command` (single-project deep family anchor): workflow orchestration gains the recall step after grouping and before the workflow dispatch, and the persist step after apply and before cleanup; the command writes `phase: "executing"` / `"done"`; the final summary gains a `Knowledge:` line; hard rules carve out the knowledge root on the apply branch only (`Cancel touches no files` stays valid as written).
- `commander-update-orchestrator-skill`: deep-mode Step 6.5 gains the recall step on the grouped deduplicated set, before the workflow invocation; a new step between 10b and 10c persists the run (one run note, per-project `outcome.json` entries and changesets); `phase: "executing"` / `"done"` written for real; Step 11 summary gains the `Knowledge:` line; registry byte-identity and "cancel touches no files" preserved.
- `experiments-plugin`: `userConfig.knowledge_root` declared in the manifest; registration of the two skills and two commands (README rows, auto-discovery); the artifact glossary extends the no-"plan" naming rule to the knowledge root; the main-window context diet covers recall digests and persist summaries.

## Impact

- **Files**: two new skill directories, two command files, five scripts with tests plus one edit to `check-dossier.mjs`, one `scripts/README.md` table edit, one plugin README edit, `userConfig` block in `.claude-plugin/plugin.json`; edits to `skills/parallel-research-workflow/SKILL.md`, `skills/npm-update-deep-orchestrator/SKILL.md`, `skills/commander-update-orchestrator/SKILL.md` — all under `claude-plugins/experiments/`. No source packages, no build targets, no CI configuration.
- **User filesystem**: a new directory `~/.claude/experiments/knowledge/`, written only on the apply branch of a deep run or by explicit `/experiments:knowledge-persist`. `~/.claude/commander/projects.json` stays byte-identical. Multi-machine sync of the vault (git vs Obsidian Sync) is the user's decision and out of scope.
- **Behavioural blast radius**: recall can shrink the fresh-research set (fewer subagents, faster runs) and injects prior text into subagent prompts and the dossier — always labelled as unverified for the current project. A wrong `exact` match would skip fresh research for that package; the class definition is therefore strict (same name, same `from`, same `to`).
- **Related tickets**: MON-140 (parent), MON-142 (research detail level), MON-143 (run-dir lifecycle: temporary vs persisted now distinguished), MON-144 (subagent output contract: split amended here), MON-151 (cross-project workflow optimisation).

## Implementation approach

The main session is the **orchestrator**: it owns the OpenSpec artefacts, the human gates and the seams between teammates, and holds only paths and digests. Every deliverable that is agent-facing prose is written and audited with the installed skill-authoring toolchain, not freehand.

### Authoring toolchain (mandatory, verified available before task 1)

| Skill / agent                                     | Use here                                                                                                    |
| ------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| `skill-creator`                                   | Scaffold both skills; description optimisation; in-session evals (intended + control scenario per skill).   |
| `plugin-dev:skill-development`                    | `SKILL.md` vs `reference/` progressive disclosure (note templates, match-class table live in `reference/`). |
| `plugin-dev:command-development`                  | The two `commands/*.md` files: frontmatter, `$ARGUMENTS`, delegation-only bodies.                           |
| `plugin-dev:plugin-structure`                     | `userConfig` block, auto-discovery, `${CLAUDE_PLUGIN_ROOT}` script paths.                                   |
| `superpowers:writing-skills`                      | Create/edit discipline and pre-deployment verification of both skills.                                      |
| `mattpocock-skills:writing-for-agents`            | Prose meant to be executed by an agent (skills, prompt blocks, note templates).                             |
| `elements-of-style:writing-clearly-and-concisely` | Concision pass on every skill, template and README row.                                                     |
| `experiments:writing-comments`                    | Loaded by every teammate that writes `.mjs` — prevents narrative comment noise in scripts and tests.        |
| `plugin-dev:skill-reviewer` (agent)               | Review of each finished `SKILL.md`; every finding resolved or explicitly rejected in-session.               |
| `plugin-dev:plugin-validator` (agent)             | Structure + manifest validation after all files land.                                                       |

Not used: `experiments:skill-terraformer` and `experiments:skills-update-check` (they install skills.sh skills; unrelated to authoring).

### Teammate allocation

The main session is the orchestrator. Who implements each task, on which model, and whether it runs in parallel or strictly after the previous wave is tagged **per task** in `tasks.md` (`[wave · teammate · model · scheduling]`); the contracts teammates depend on are fixed in `design.md` before any wave starts.

## Out of scope

- Exploratory recall (free-form question, model in the loop) and any skill over the Obsidian CLI — evaluated in the spike, separate ticket with evidence.
- Running graphify over the vault, CLI-vs-`rg` comparison — spike deliverables, not implementation.
- Multi-machine vault sync.
- Any automatic pruning or time-based expiry of knowledge.

## Unresolved questions

None blocking. The four questions raised in the first draft are resolved in `design.md`: sibling deep specs are covered by the `npm-update-deep-patch-command` anchor plus the shared-contract statement in `experiments-plugin` (D9); cross-project `research.md` keeps `(universal)` only, applicability lives in `changeset.md` (D8); `synthetic` is an explicit flag only (D10); `Applicable (0)` runs produce both a run note and hub sections (D4).
