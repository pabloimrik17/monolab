## Context

The `npm:update-*` / `commander:update-*` matrix ships `patch` and `minor`. The cross-project and single-project layers are fully factored: `commander-update-{patch,minor}` and their deep variants are thin wrappers over `commander-update-orchestrator`; the single-project apply mechanism lives once in `npm-update-apply` (override consult → ncu `package.json` bumps + `pnpm-workspace.yaml` catalog edits → one install → result fragment); the deep plan template is `level`-parameterized (`## <Level> bump set`) and carries the `## Changelogs` chronology section. The four `minor` commands landed as thin wrappers on top.

`major` is the first level where `level !== ` a valid `ncu --target` and where the update semantics genuinely differ (breaking changes). The minor cascade explicitly deferred this: *"`major`/`engines` — non-`homónima` semantics (breaking changes, peer/engines handling), separate tickets."* This change pays exactly that deferred cost — three small, targeted platform deltas — then lands the four `major` commands as wrappers. Plugin-only; no automated tests (manual verification, mirroring prior changes). Versions are release-please-driven; manifests are never hand-edited.

## Goals / Non-Goals

**Goals:**
- `major` works end to end at all four surfaces (shallow/deep × single/cross), reusing the minor platform.
- The major-readiness deltas (mapping, forced filter, breaking-change research) are minimal and inert for patch/minor; the one deliberate cross-level change is exact pinning (`--removeRange`), applied family-wide.
- Deep-major research is meaningfully deeper than deep-minor: breaking changes, migration steps, codemods, deprecations are first-class findings (MON-147/MON-202).
- The four `major` commands are thin, `level=major`/`target=major` wrappers.
- Branch/worktree **isolation** available (opt-in) to the family, preferring worktree (via worktrunk when present) and never committing/pushing/PR-ing.
- A breaking-change **PR partition** for deep-major: group by hard co-upgrade sets + soft risk/size heuristics into reviewable buckets, each mappable to its own worktree.

**Non-Goals:**
- `engines` row (MON-139/148/197/201). D1 documents the `engines` mapping for forward-compat but ships no engines command.
- Re-deriving or re-extracting the apply/orchestrator/workflow platform (minor already did).
- Auto-rollback, peer-dependency conflict resolution beyond the existing conflict-policy, tests/lint/build, **commits**, **PRs**, push, registry mutation.
- Creating PRs (`gh pr create`) or commits — `update-isolation` stops at the branch/worktree; the user commits + PRs.
- One worktree per (project, bucket) in cross-project mode (the N×M explosion) — v1 caps cross-project at one worktree per project (D9, Open Questions).

## Decisions

### D1 — `level → ncuTarget` mapping moves into `npm-update-apply`

Today `npm-update-apply` Step A1 runs `ncu … --target <target>` with `target` passed **verbatim**, and validates `target ∈ {patch,minor,major,engines}`. That is internally inconsistent for major: `major` passes validation but `ncu --target major` is not a valid ncu target (ncu has no `major`; `scan-npm-updates` already maps `major → latest` + post-filter). patch/minor never exercised this.

`npm-update-apply` resolves an internal `ncuTarget` from `target` using the **same table** scan uses, then passes `ncuTarget` to `ncu --target`:

| `target` (= level) | `ncuTarget` | extra ncu flag |
|---|---|---|
| `patch` | `patch` | — |
| `minor` | `minor` | — |
| `major` | `latest` | — |
| `engines` | `latest` | `--enginesNode` |

Callers keep passing `target: "major"` (the `level===target` convention every shipped wrapper and the orchestrator use). Validation list is unchanged. The mapping is an identity for patch/minor (their ncu target is unchanged); their *written versions* still change via the family-wide exact-pin (D-pin), which is the only cross-level behavior change.

*Why here, not in the wrappers:* keeps `level===target` symmetry across all callers (wrappers + orchestrator), and keeps the level→ncu-target semantics in one place, paired with the identical table in scan. One concept, two skills, same table.

*Alternative considered:* wrappers pass `target: "latest"` and relax the validation list to accept raw ncu target strings. Rejected — splits level semantics across caller + skill, breaks the `level===target` symmetry, and forces the orchestrator's two validation gates and summary headings to accept/translate raw ncu strings.

### D2 — `latest`-mapped targets always `--filter`

For patch/minor, scan's candidate set equals `ncu --target <level>`'s detectable set, so `npm-update-apply` may omit `--filter` (`includeFilter: false`) and let ncu's own detection define the set. For major, scan runs `ncu --target latest` then **post-filters** to packages whose major strictly advanced — a proper subset. Re-running `ncu --target latest` without `--filter` would bump every dep with *any* newer version (minor/patch-only deps scan excluded) up to latest.

Therefore: when `ncuTarget === latest` (major/engines), `npm-update-apply` ALWAYS passes `--filter "<names>"`; the caller-supplied `names` list is authoritative and the element's `includeFilter` is treated as `true` regardless of its value. Centralized in the skill so every caller (single-project wrappers + orchestrator per project) is correct by construction. The orchestrator additionally sets `includeFilter: true` explicitly when building per-project major specs (defense-in-depth + readable spec).

### D3 — Breaking-change research weighting for `level=major`

`parallel-research-workflow` phase-2 research is currently level-agnostic: subagents emit `### Workarounds resolved` + `### Improvements applicable` (with `(universal)` suffix in cross-project mode). MON-147/MON-202 require major to weight breaking changes / migration guides / codemods / deprecations.

For `level=major` only, the phase-2 subagent prompt gains a third mandatory category — **`### Breaking changes & migration`** — capturing required code/config changes, removed/renamed/changed APIs, available codemods, and deprecations to act on, with the `_no findings_` sentinel when none. Phase-4 `plan.md` synthesis adds a `## Breaking changes & migration` H2 (placed before `## Improvements`, since breaking changes gate the upgrade) with a `_no breaking changes_` sentinel when empty. Applies to both single-project and cross-project modes (cross-project: universal phrasing, no project-specific paths, same as the other categories). Level-gated → deep-patch/deep-minor output is byte-unchanged.

The deep-major commands' plan-mode apply round treats breaking-change items as **applicable edits** the same way improvements are (reconnaissance → plan-mode preview → user-gated apply), so required migration edits land through the same reviewed mechanism — never silently.

### D4 — Heightened-caution copy (additive)

Each major command carries a one-line breaking-changes caution at the prompt and in the summary (e.g. *"Major updates may include breaking changes — review the changelogs / the plan's `## Breaking changes & migration` section before applying."*). Everything else mirrors the minor copy with `minor→major` substitution: empty message `No major updates available.`, summary heading `## npm-update-major summary` / `## npm-update-deep-major summary` / `## commander-update-major summary` / `## commander-update-deep-major summary`, bump-set heading `## Major bump set` (already level-derived).

### D5 — Sequencing: this change builds on the minor cascade (MON-200)

The platform this change modifies ships in `add-minor-update-cascade`: `npm-update-apply`, the `level`-parameterized `commander-update-orchestrator` (delegates per-project apply to `npm-update-apply`), and the `parallel-research-workflow` plan template (`## <Level> bump set`, `## Changelogs`). That change is on `develop`, NOT on `main`. This branch (`feature/MON-202-commander-update-deep-major`) currently sits exactly at `main` HEAD with none of it present.

**RESOLVED:** the `feature/MON-202-commander-update-deep-major` worktree was rebased onto `develop` (bcc8376) — the minor platform and the synced base specs are now present, so the MODIFIED deltas resolve and `openspec validate --strict` passes against the real baseline. The spec deltas are authored against this post-minor state. (Task 0.1 done.)

### D6 — One change, four commands (mirror minor); no Phase A

`add-minor-update-cascade` spent a Phase A on platform extraction + a byte-equivalence gate. This change has no equivalent — the platform exists. It carries the three targeted deltas D1–D3, the four wrappers, plus the isolation + partition capabilities (D7–D10). New capabilities: `npm-update-major-command` (MON-138), `npm-update-deep-major-command` (MON-147), `commander-update-major-command` (MON-196), `commander-update-deep-major-command` (MON-202), `update-isolation`, `breaking-change-pr-grouping`.

### D7 — Branch/worktree isolation: a shared `update-isolation` skill (no commit/PR)

The family hard rule changes from *"no commits, branches, or PRs"* to *"no commits, no PRs, no push; branch/worktree creation allowed"*. A new `update-isolation` skill resolves and creates the isolated workspace **before** apply runs; `apply-npm-updates` is unchanged (still VCS-free — it just runs in the resolved `cwd`).

```
update-isolation  Input { projectPath, branchName, strategy }
  strategy = "auto" (default for an opted-in run):
     1. worktrunk usable (`command -v wt` && repo registrable)?  → wt worktree + branch
     2. else                                                     → git worktree add -b <branch> <siblingPath>
  strategy = "ask"      → AskUserQuestion: worktree(worktrunk) / worktree(plain) / direct-branch / none
  strategy = "branch"   → git switch -c <branch> in place
  strategy = "none"     → no VCS action; apply in the current tree (today's behavior, the global default)
  Returns { mode, branchName, workdir }   // workdir = cwd handed to apply
  Hard rules: creates branch/worktree only. SHALL NOT commit, push, or open a PR.
              Worktree modes leave the user's current branch checked out untouched.
```

*Why worktree-preferred:* it isolates the change without disturbing the user's current checkout — exactly the manual step the user kept doing. *Why opt-in with `none` default:* preserves byte-equivalence for everyone not asking for isolation, so the contract refinement is additive. *worktrunk interaction:* `wt` may run `post-start` hooks (e.g. install); when isolation created the workspace via worktrunk and a hook already installed, the apply step honors the existing `skipInstall` rule to avoid a redundant install.

### D8 — `partition-breaking-changes`: hard co-upgrade sets + soft risk heuristics

For deep-major, a new skill partitions the accepted breaking-change set into PR-sized buckets:

```
1. HARD co-upgrade sets (must share a bucket): peer/lockstep groups
   (react+react-dom+react-is+@types/react; @storybook/*; vue+@vue/*; eslint+plugins).
   Seeded from the override-registry families + a peerDependencies read.
2. RISK score per set: blast radius (import-site/dependent count — the research already greps),
   breaking-change weight (count+severity from changelog), centrality (framework/runtime/build-core:
   react/next/vite/typescript/eslint), codemod/migration-step count.
3. POLICY (tunable knobs): isolateHighRisk (HIGH set → solo bucket), batchLowRisk (leaf majors → one
   bucket), maxPackagesPerBucket, maxRiskPerBucket.
Output: ordered buckets { title, packages, riskTier, rationale, suggestedBranch, suggestedMergeOrder }
        + a COUNT-BY-POLICY table so the user picks granularity before anything is materialized.
```

The output is a `## PR plan` section in (or beside) `plan.md`. React major → its own bucket (HIGH centrality + blast radius + codemods), with its peer set, even though it is "one package" — the user's example. `partition-breaking-changes` is pure (no VCS, no network); conceptually adjacent to `group-packages-for-research` (which batches for research subagents) but a distinct concern (risk/PR grouping) — same "bounded partition" pattern, not the same skill.

### D9 — Wiring isolation + buckets into the commands (v1 phasing)

- **`npm-update-deep-major` (single-project)** — primary surface for per-bucket isolation. After the partition + an opt-in gate, for each bucket: `update-isolation(branch=deps/major-<bucketSlug>)` → apply that bucket's bumps + migration edits into its worktree. The summary lists each bucket → workdir + `Suggested next steps` (commit/push/`gh pr create`, NOT executed).
- **`npm-update-major` / `commander-update-major` (shallow)** — isolation is offered as a single target for the whole update (no partition; there are no breaking-change findings at shallow depth).
- **`commander-update-deep-major` (cross-project)** — v1 offers **one worktree per project** (the partition's `## PR plan` is still surfaced as advice per project). One worktree per (project, bucket) is **deferred (DECIDED — answer 2)** to avoid the N×M explosion; the count-by-policy table makes that cost visible up front.

### D10 — The isolation refinement is cross-cutting (but additive)

Branch/worktree isolation logically applies to the whole shipped family (patch/minor too), not just major. Because it is `none`-by-default and additive, MON-202 introduces `update-isolation` + updates the four major commands and the shared skills' hard-rule wording; **DECIDED — the already-shipped patch/minor command files also adopt the same opt-in gate** (task 3.3), folded into this change rather than peeled out. `apply-npm-updates`' own hard rules are unchanged (it never did VCS; isolation is a separate pre-step).

### D-pin — Exact version pinning, family-wide (`--removeRange`)

DECIDED (answers: "en general cualquier update pinea"; "todos los niveles de la cascada, todos los tipos de bump"; folded into MON-202). Every `apply-npm-updates` `ncu` invocation passes `--removeRange`, so **every bumped dependency is written as an exact version** (`"react": "19.0.2"`, no `^`/`~`) — at all levels (patch/minor/major/engines) and both shallow/deep. Catalog edits strip the prefix likewise. Because the mechanism lives in the shared apply skill, this is a **single lever** that pins the entire cascade exact; no per-command edits and no special-casing.

This **supersedes the earlier `manifestPins`/per-project-cap idea**, which was based on a contrived scenario (it assumed a project gets a *capped sub-latest* major bump; in reality, in a major run a project either takes the new major (latest) or is simply not bumped — it isn't "capped" to an intermediate version). With uniform exact pinning, cross-project version alignment is exact by construction (every bumping project writes the same exact latest), and there is no sub-latest cap to special-case. `manifestPins` is dropped.

Consequences (accepted): (1) this is a **behavior change to the already-shipped patch/minor/deep-patch/deep-minor commands** — their output is no longer `^`-preserving, so it is NOT byte-equivalent to pre-change; the Phase-4 check verifies the *intended* exact-pin change rather than equivalence. (2) Override-managed families (Storybook etc.) pin per their own upgrade tool, outside this rule. (3) Lockfiles still resolve as usual; package.json simply now declares exact.

## Risks / Trade-offs

- **Major-readiness deltas (D1/D2/D3) leak into patch/minor** → they don't: D1 is an identity map for patch/minor, D2 only fires for `latest` targets, D3 is level-gated. (The exact-pin change to patch/minor is separate and intentional — next bullet.)
- **Family-wide exact pinning changes shipped patch/minor output.** `--removeRange` makes every bump write an exact version, so the already-shipped patch/minor/deep-patch/deep-minor commands no longer preserve `^`/`~`. This is intentional (decided), not a regression — but it breaks the byte-equivalence the minor cascade relied on. Mitigated by: it is a single, uniform, well-understood lever in the shared skill; Phase 4 verifies the intended exact-pin output across levels; override-managed families are explicitly out of scope. (The earlier per-project-cap/`manifestPins` idea is dropped — see D-pin.)
- **Breaking-change research quality** depends on changelog completeness → reuses the existing `npm-changelog` cache + integrity gate; `_no breaking changes_` sentinel never fabricates. The plan-mode preview keeps a human in the loop for every migration edit.
- **`plan.md` grows** with a breaking-changes section on large major runs → section is additive, sits with the other reference material, sentinel when empty.
- **Sequencing slip** (implemented before minor reaches the branch) → Task 0 hard gate; deltas explicitly authored against the post-minor baseline.
- **Isolation cost** — per-bucket worktrees mean one install per worktree (and worktrunk hooks may add work). Mitigated: isolation is opt-in (`none` default), single-project per-bucket only in v1, install-skip honored when a worktrunk hook already installed. The count-by-policy table surfaces the worktree count before materializing.
- **worktrunk absent / unusable repo** → `update-isolation` falls back to plain `git worktree`, then to `ask` / `branch`; never hard-fails the update (degrades to `none` with a surfaced note).
- **Partition mis-groups** (puts a hard co-upgrade pair in separate buckets → broken install) → co-upgrade sets are a HARD constraint (peer/lockstep + family registry) computed before risk heuristics; risk only decides solo-vs-batched among already-cohesive sets.
- **Contract-refinement blast radius** (branches now created where none were before) → opt-in gate, `none` default, worktree leaves current checkout intact, and still no commit/push/PR — the riskiest VCS actions stay forbidden.

## Migration Plan

Markdown-only change (skill + command files under `claude-plugins/experiments/`). "Deploy" = land the files on a branch that already carries the minor cascade; rollback = `git revert`. release-please bumps the plugin version from the conventional commits — no manual version edits.

## Resolved (this round)

- **Sequencing** → DONE. Worktree rebased onto `develop`; platform + base specs present; `--strict` passes. (Q1)
- **Pinning** → EXACT, FAMILY-WIDE. Every bump writes an exact version via `--removeRange` in the shared apply skill, all levels/bump types; folded into MON-202. The earlier per-project-cap/`manifestPins` idea is dropped (contrived scenario). (Q3 + follow-ups)
- **Per-bucket × cross-project isolation** → DEFER. v1 = one worktree per project cross-project; per-bucket only single-project. (Q2)
- **Peel isolation into its own change?** → NO. Folded into MON-202; patch/minor command files adopt the opt-in gate here (task 3.3, D10). (Q4)
- **Breaking-changes section placement** → BEFORE `## Improvements` (breaking changes gate the upgrade, read first). Already in the spec.
- **Engines mapping in apply** → DOCUMENT NOW (`engines→latest+--enginesNode` in the table, no engines command shipped). Already in the spec.
- **Isolation gate UX** → PER-COMMAND gate defaulting to `none`; `auto` resolves worktrunk→worktree when isolation is chosen.
- **Pin prefix semantics** → RIGID EXACT, family-wide via `--removeRange` (e.g. `18.3.1`, no `^`/`~`), all levels and bump types; catalog edits strip the prefix too. No `manifestPins` / cap special-casing (dropped). (D-pin.)

## Open Questions (still open)

_None outstanding — all sign-off items resolved this round._
