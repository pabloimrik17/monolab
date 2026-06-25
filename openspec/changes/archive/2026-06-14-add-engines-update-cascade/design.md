## Context

The `npm:update-*` / `commander:update-*` matrix ships `patch`, `minor`, and `major`. The cross-project and single-project layers are fully factored: `commander-update-{patch,minor,major}` and their deep variants are thin wrappers over `commander-update-orchestrator`; the single-project dependency-apply mechanism lives once in `npm-update-apply` (override consult → ncu bumps + catalog edits → one install → result fragment); the deep plan template is `level`-parameterized (`## <Level> bump set`, `## Changelogs`, and — from major — `## Breaking changes & migration`); branch/worktree isolation is a shared opt-in `update-isolation` skill; every bump pins exact (`--removeRange`, family-wide).

`engines` is the **fourth and last** row, and the only one that is **not an ncu dependency update**. The scaffolded `engines` enum routes to `scan-npm-updates → ncu --target latest --enginesNode` — a *dependency-compatibility filter* the scan skill notes "most repos return empty" for. Per MON-201/MON-148/MON-139, `engines` means **bumping the dev/runtime toolchain** (Node, the package manager, Deno, Bun-as-runtime) and **aligning + pinning** every place those versions are declared. ncu cannot do this and `npm-update-apply` does not apply. This change gives `engines` real semantics: a new **detect → resolve → apply** pair plugged into the existing orchestrator, while reusing the major-era platform (isolation, exact-pin, breaking-change research). Plugin-only; no automated tests (manual verification, mirroring prior changes). Versions are release-please-driven; manifests are never hand-edited.

## Goals / Non-Goals

**Goals:**
- `engines` works end to end at all four surfaces (shallow/deep × single/cross), reusing the existing orchestrator skeleton, `update-isolation`, the exact-pin lever, and the `## Breaking changes & migration` plan section.
- Detect **every** place a runtime/PM version is pinned across an arbitrary registry repo (comprehensive surface coverage), and rewrite them in lockstep to one aligned, exact-pinned target.
- Cleanly separate the two meanings of `engines.node`: the **runtime** the project develops/runs with (bump + pin) vs the **support range** a publishable library declares for its consumers (leave untouched).
- Resolve the target deterministically (Node → latest LTS; pnpm/Deno/Bun → latest) and confirm before applying.
- Deep-engines research weights **runtime breaking changes / migration** (Node majors, PM majors), sourced from engine release notes, deduplicated once per engine/version.

**Non-Goals:**
- Re-deriving the orchestrator / research / isolation / exact-pin platform (minor + major already did).
- Touching publishable-library `engines.node` **support ranges** as part of a runtime bump (separate concern; only via the explicit ambiguity prompt).
- `partition-breaking-changes` PR-bucketing — an engine bump is one coordinated co-upgrade (Node + PM together), not many independent packages (N/A here).
- Auto-rollback; resolving runtime incompatibilities for you; tests/lint/build; **commits**, **PRs**, push; registry mutation.
- Migrating CI providers or Docker base-image families (only the version locus is rewritten, never the image/runtime choice).

## Decisions

### D1 — Two new skills (`detect-toolchain-surfaces` + `apply-engine-bumps`), not extensions of scan/apply

`engines` semantics are disjoint from the dependency levels: the *input* is "where is each runtime/PM version pinned" (multi-file, multi-format) not "what npm deps have a newer version", and the *output* rewrites `.nvmrc` / CI YAML / Dockerfiles, not `package.json` deps via ncu. Overloading `scan-npm-updates` / `npm-update-apply` (whose contracts are ncu-shaped: `ScanResult.updates[]`, `manifestBumps[]`, `ncu --target`) would fork every branch with `if level===engines`. Instead, two new skills mirror the existing pair one-for-one:

| dependency levels | engines |
|---|---|
| `npm-update-scanning` (`scan-npm-updates`) | `engine-surface-scanning` (`detect-toolchain-surfaces`) |
| `npm-update-apply` (`apply-npm-updates`) | `engine-update-apply` (`apply-engine-bumps`) |

The orchestrator and the four commands select the pair by `level`. `apply-npm-updates` stays untouched.

*Alternative considered:* a single `engines` mode inside scan/apply. Rejected — it couples two unrelated data models and litters the shared deps skills with engine-only branches.

### D2 — Comprehensive detection as a data-driven *surface-matcher table*

`detect-toolchain-surfaces` enumerates matchers; each matcher knows how to **read** the current version and **rewrite** it for one (engine, file-kind) locus. v1 matcher set:

| Surface | Engines | Read / rewrite locus |
|---|---|---|
| `package.json` `engines.{node,pnpm,npm,yarn,bun,deno}` | all | JSON value |
| `package.json` `packageManager` | pnpm/npm/yarn/bun | `name@X` (preserve `+sha…` corepack hash by re-deriving or dropping per pin policy) |
| `package.json` `devEngines.runtime`/`packageManager` | all | object/array `version` |
| `package.json` `volta.{node,pnpm,yarn}` | node/pnpm/yarn | JSON value |
| `.nvmrc`, `.node-version` | node | whole-file version |
| `.tool-versions` (asdf), `mise.toml`/`.mise.toml` | node/pnpm/deno/bun | `<tool> <version>` line / `[tools]` entry |
| `Dockerfile*` | node/deno/bun | `FROM <img>:<ver>` tag + `ARG *_VERSION=` defaults |
| GitHub Actions (`.github/workflows/*.yml`) | all | `actions/setup-node` `node-version:`, `pnpm/action-setup` `version:`, `denoland/setup-deno` `deno-version:`, `oven-sh/setup-bun` `bun-version:` |
| GitLab CI (`.gitlab-ci.yml`) | all | job `image:` tag, `variables: NODE_VERSION` |
| CircleCI (`.circleci/config.yml`) | all | `docker: image:` tag, orb `node-version` params |

Rewrites are **surgical**: only the version token changes. Critically, in pinned GitHub Actions (`uses: actions/setup-node@<sha> # v4.4.0`) the matcher rewrites the **`with.node-version` input**, never the action's `@<sha>` pin or its version comment. Unknown surfaces are reported, never guessed-edited. The table is the single extension point — adding a CI provider is one row + one matcher, individually verifiable.

### D3 — Runtime-vs-support classifier (`private` + publishability + location, with ambiguity prompt)

`engines.node` is overloaded: in an **app / private workspace / repo root** it declares the runtime; in a **publishable library** it declares the Node range consumers may use — a contract that must NOT be pinned. Classification per `package.json`:

- **Runtime (bump + pin exact)** when `private: true`, OR the manifest has no `publishConfig`/`exports`/`main` dist surface, OR it is the workspace root. Plus **all non-`package.json` runtime files** (`.nvmrc`, CI, Docker, tool-version files) are unconditionally runtime.
- **Support range (leave untouched)** when the manifest is publishable (not `private`, has `publishConfig`/`exports`/library `main`) AND its `engines.node` is a **range** (`>=`, `^`, `~`, `||`).
- **Ambiguous** (e.g. a publishable manifest pinning an exact `engines.node`, or a private manifest with a range) → `AskUserQuestion` per project, defaulting conservative (**leave**). The prompt names the distinction explicitly ("runtime you develop with" vs "Node a package supports").

This is why monolab's libs (`engines.node: ">=22"`) and apps (`24.12.0`) are **not** a misalignment to fix — different axes.

### D4 — Deterministic target resolution; confirm before apply

- **Node → latest LTS**: fetch `https://nodejs.org/dist/index.json`, take the max `version` whose `lts !== false`. Pin the full `x.y.z`.
- **pnpm / npm / yarn / bun → latest**: the registry `latest` dist-tag (`npm view <pm> version`) or release API.
- **Deno → latest**: the latest GitHub release tag.

The resolved target per engine is shown and **confirmed** (single gate) before any write. Offline / fetch failure → degrade: skip the engine (note surfaced) or accept a user-supplied target; never fabricate a version. Cross-project: resolve once, reuse for all projects (see D5).

### D5 — Pin exact + align; cross-project alignment is on the engine version

Within a repo, every runtime surface is rewritten to the **same exact** version per engine (no ranges) — consistent with the family-wide `--removeRange` exact-pin decision, here applied to runtime loci. Cross-project, the orchestrator aligns on the **engine version** (the resolved target is the single max for everyone) instead of per-package max-wins; a project already above the target (rare) keeps its higher version unless the user opts to converge. Intra-repo misalignment found at detect time is surfaced and converged to the target (the user's "align whether or not they were aligned before", scoped to runtime surfaces).

### D6 — Orchestrator `level=engines` branch (reuse the skeleton)

`commander-update-orchestrator` keeps `engines` as a valid `level`/`target` and, when `level=engines`, swaps two steps only: **scan** → `detect-toolchain-surfaces` per project (instead of `scan-npm-updates`), and **apply** → `apply-engine-bumps` per project (instead of `npm-update-apply`). List → resolve/align → render plan → sequential apply stop-on-fail → aggregated summary is reused unchanged. `scan-npm-updates` drops `engines` from its level enum (it stays a dependency scanner for patch/minor/major); the orchestrator routes `engines` to the engine path.

### D7 — Deep-engines research re-pointed to engine release notes; reuse `## Breaking changes & migration`

For `level=engines`, `parallel-research-workflow` sources **engine release notes** — Node (`github.com/nodejs/node` releases / `nodejs.org/en/blog`), pnpm/npm/yarn (GitHub releases / changelog), Deno, Bun — instead of npm-registry package changelogs, and `npm-changelog` gains engine release-note retrieval. Research is deduplicated **once per engine/version** (cross-project), not per project. Findings feed the existing `## Breaking changes & migration` plan section (added by major) so deep-engines surfaces removed flags, runtime API removals, required config migrations, and PM lockfile-format changes through the same reviewed plan-mode apply round. Improvements/workarounds categories stay as-is.

### D8 — Reuse `update-isolation`; no `partition-breaking-changes`

The engines commands opt into the existing `update-isolation` skill (worktrunk → worktree → branch/ask, `none` default off the opt-in) exactly like the major commands; no new isolation code. `partition-breaking-changes` does **not** apply: an engines update is a single coordinated co-upgrade (Node + its PM, moved together), so there is one bucket — the PR-partition is meaningless here. Isolation, when chosen, wraps the whole engine bump as one workspace.

### D9 — Sequencing on major (additive deltas; one cleanup task composes with major)

This change builds on the minor (MON-200) **and** major (MON-202) cascades. Major merged to `develop` (#230) so its code (`update-isolation`, `--removeRange`, the breaking-change section) is present in this worktree, but **major is an active, unarchived change — its spec deltas are not yet synced into `openspec/specs/`** (the baseline there is patch+minor). To avoid conflating major's lifecycle into this branch, engines' MODIFIED deltas are authored **additively** against the synced patch+minor baseline:

- engines-specific behavior is expressed as **ADDED** requirements (orchestrator engines branch; workflow engine-sourcing) — independent of major's MODIFIED requirements on the same specs, so both compose at archive time.
- `scan-npm-updates` `engines`-removal MODIFIES a requirement (the level enum) that **is** in the baseline — clean.
- The one cross-dependency — removing major's forward-compat `engines→latest+--enginesNode` row from `apply-npm-updates`'s level→ncuTarget table — has **no observable behavior** (no command ever invoked apply with `engines`). It is handled as an **implementation cleanup task** (edit `apply-npm-updates/SKILL.md` to drop the dead engines branch once major is in the tree), NOT a spec delta against an unsynced baseline. `openspec validate --strict` therefore resolves against the real baseline.

If the team prefers, major can be archived first (syncing its specs) and this delta set re-pointed — but the additive authoring above is correct either way.

### D10 — Four commands as thin wrappers on the engine platform

Mirror major's D6: one change, four commands.

- `/experiments:npm-update-engines` (MON-139) — shallow single-project: `detect-toolchain-surfaces` → resolve/confirm → `apply-engine-bumps`.
- `/experiments:npm-update-deep-engines` (MON-148) — deep single-project: detect → group/research(engine notes) → plan(`## Breaking changes & migration`) → `apply-engine-bumps` + plan-mode migration edits.
- `/experiments:commander-update-engines` (MON-197) — shallow cross-project: `orchestrator(level=engines, mode=shallow)`.
- `/experiments:commander-update-deep-engines` (MON-201) — deep cross-project: `orchestrator(level=engines, mode=deep)`.

Caution copy mirrors major's D4 with `major→engines` and runtime phrasing ("Runtime/toolchain upgrades may include breaking changes — review the plan's `## Breaking changes & migration` before applying."); summary headings `## npm-update-engines summary` etc.; empty message `No engine updates available.` (target already current everywhere).

## Risks / Trade-offs

- **Detection fragility across formats** (the broadest risk; user chose comprehensive). Mitigated: data-driven matcher table, each matcher independently testable; surgical version-only rewrites; unknown/odd surfaces reported not guessed; YAML/Docker edits never touch action SHA pins or image names.
- **Mis-pinning a publishable lib's support range.** Mitigated: conservative classifier (publishable + range ⇒ leave), explicit per-project ambiguity prompt naming the supports-vs-runs distinction.
- **Network dependence** (LTS index, release notes). Mitigated: degrade gracefully (skip engine / accept user target; deep research falls back to `_no changelog available_`); never fabricate versions.
- **Bun/Deno dual role** (bun is runtime *and* PM; both can be the `packageManager`). Handled: detect each role separately (runtime version vs `packageManager` token) and align both to the same resolved bun/deno version.
- **corepack `packageManager` hash** (`pnpm@10.27.0+sha512…`). The pin rewrites the version; the integrity hash is dropped or re-derived per a single documented policy (drop by default — corepack re-resolves), surfaced in the summary.
- **Cross-project divergence** (a project pinned above the resolved target). Surfaced; default leave-higher unless the user converges.
- **Sequencing vs major** (specs unsynced). Mitigated by D9 (additive deltas + cleanup task); deltas validate against the real baseline.
- **Orchestrator regression for patch/minor/major** from adding the engines branch. Mitigated: the branch is gated on `level=engines`; existing levels' steps are untouched — verified by re-running one existing level.

## Migration Plan

Markdown-only change (skill + command files under `claude-plugins/experiments/`). "Deploy" = land the files on a branch that already carries the minor + major cascades (this branch's base was advanced onto `develop`+major, `23bc105`); rollback = `git revert`. release-please bumps the plugin version from the conventional commits — no manual version edits. The `apply-npm-updates` dead-engines-branch cleanup (D9) lands in the same change.

## Open Questions

_None outstanding._ Resolved this round: engines semantics (toolchain bump, not ncu filter); engines covered = Node + PM(pnpm/npm/yarn/bun) + Deno + Bun-runtime; comprehensive detection; runtime-vs-support via `private`+publishability+prompt; target = Node-LTS / others-latest with confirm; full four-command column; deep research re-pointed to engine release notes; reuse `update-isolation`; `partition-breaking-changes` N/A; sequencing vs major handled additively (D9).
