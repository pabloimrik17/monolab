## Why

The npm/commander dependency-update matrix now ships `patch`, `minor`, **and `major`** (MON-202 merged moments ago, #230). The final row — `engines` — is the **odd one out**. Across the matrix `patch`/`minor`/`major` are ncu levels (a `--target` over `dependencies`); **`engines` is not an ncu dependency update at all**. The scaffolded `engines` enum currently routes to `scan-npm-updates → ncu --target latest --enginesNode` (and `major` even left a forward-compat `engines→latest+--enginesNode` entry in `npm-update-apply`), a *dependency-compatibility filter* the scan skill itself notes "most repos return empty" for — a placeholder, never the intended behavior.

Per MON-201/MON-148/MON-139, `engines` means **bumping the dev/runtime toolchain**: Node, the package manager (pnpm/npm/yarn/bun), Deno, and Bun-as-runtime — raising *every* place those versions are pinned to one aligned, pinned target. ncu cannot do this and `apply-npm-updates` does not apply.

The good news: the `minor` and `major` cascades already paid for most of the surrounding platform, so engines **reuses** rather than rebuilds:

- **`update-isolation`** (major) — branch/worktree creation (worktrunk → worktree → branch/ask), opt-in, VCS-safe (no commit/PR). Engines opts into it like the major commands.
- **Family-wide exact pinning (`--removeRange`)** (major) — every bump writes exact versions; engines pinning runtime surfaces exact is consistent with this, not a special case.
- **Level-gated `## Breaking changes & migration` research** (major) — engines deep is breaking-heavy (Node majors), so it reuses that plan section, fed from *engine* release notes.

So engines' genuinely-new surface shrinks to **four things**: detect runtime version-pin surfaces, rewrite/align/pin them, resolve the latest-LTS target, and source *engine* (not npm) release notes — plugged into the already-factored cross-project orchestrator. This completes the four-level matrix.

## What Changes

**Semantics (BREAKING — internal contract):** the `engines` level is redefined from "ncu `--enginesNode` dependency filter" to "runtime/toolchain version bump + alignment + pin". No shipped command used the old meaning (the engines row never landed), so there is **no user-facing break**; the change is to the level contract baked into `scan-npm-updates`, `npm-update-apply`, the orchestrator, and `parallel-research-workflow`.

**Phase A — engine platform (new machinery, additive — existing levels untouched):**

- **NEW skill `detect-toolchain-surfaces`** (spec `engine-surface-scanning`) — scan a repo for *every* place a runtime/PM version is declared and **classify** each as a *runtime pin* (to bump) vs a *publishable-lib support range* (to leave). Surfaces (comprehensive): `package.json` (`engines`, `packageManager`, `devEngines`, `volta`), `.nvmrc`/`.node-version`, `.tool-versions`/mise/asdf, Docker (`FROM …`, `ARG …_VERSION`), CI (GitHub Actions `setup-node`/`pnpm/action-setup`/`setup-deno`/`setup-bun`, GitLab CI, CircleCI). Detects current per-engine version + intra-repo misalignment. Returns a structured result. Modeled as a table of *surface matchers*.
- **NEW skill `apply-engine-bumps`** (spec `engine-update-apply`) — resolve target per engine (Node → latest LTS from `nodejs.org/dist/index.json`; pnpm/Deno/Bun → latest; **confirm** with the user), align every runtime surface to the same **pinned exact** version (consistent with the family-wide exact-pin), rewrite each surface in place; leave lib support-ranges untouched, **prompt on ambiguity**. Streams edits; returns a structured result fragment. Distinct from `apply-npm-updates` (no ncu; edits non-`package.json` files).
- **MODIFY `parallel-research-workflow` + `npm-changelog`** — for `engines`, re-point the changelog source to **engine release notes** (Node, pnpm, Deno, Bun) and reuse the existing `## Breaking changes & migration` plan section (added by major) to surface breaking changes / deprecations / migration, deduplicated once per engine/version (not per project).
- **MODIFY `commander-update-orchestrator`** — when `level=engines`, branch the scan step to `detect-toolchain-surfaces` and the apply step to `apply-engine-bumps`, and align cross-project on the **engine version** (max-wins) rather than per-package. The list → align → sequential apply stop-on-fail → summary skeleton is reused unchanged.
- **RECONCILE the placeholder** — `scan-npm-updates` no longer claims `engines` (it stays a dependency scanner for patch/minor/major); `npm-update-apply` **removes** its dead `engines→latest+--enginesNode` map entry (engines never routes through ncu/apply now); the orchestrator keeps `engines` as a valid `level` but routes it through the engine path.
- **REUSE `update-isolation`** — engines commands opt into the existing branch/worktree skill; no new isolation code.

**Phase B — engines column (four thin commands on the engine platform):**

- **NEW** `/experiments:npm-update-engines` (MON-139) — shallow single-project.
- **NEW** `/experiments:npm-update-deep-engines` (MON-148) — deep single-project.
- **NEW** `/experiments:commander-update-engines` (MON-197) — shallow cross-project; `orchestrator(level=engines, mode=shallow)`.
- **NEW** `/experiments:commander-update-deep-engines` (MON-201, this branch) — deep cross-project; `orchestrator(level=engines, mode=deep)`.

**Out of scope / hard rules:** alignment + "always pin" apply **only** to runtime surfaces — publishable-lib `engines.node` support ranges are a consumer contract and are never touched (distinguish "Node a package *supports*" from "Node the toolchain *runs*"). `partition-breaking-changes` (major's PR-bucketing) is **N/A** here: an engine bump is a single coordinated co-upgrade (Node + PM together), not many independent packages — one bucket. Commands MAY create a branch/worktree via `update-isolation` but **never commit, open PRs, run tests/lint/build, or mutate the registry**. Manual verification only.

## Capabilities

### New Capabilities

- `engine-surface-scanning`: detect + classify every runtime/PM version-pin surface in a repo (the engine analog of `npm-update-scanning`).
- `engine-update-apply`: resolve target, align, pin, and rewrite runtime surfaces (the engine analog of `npm-update-apply`).
- `npm-update-engines-command`: `/experiments:npm-update-engines` (MON-139).
- `npm-update-deep-engines-command`: `/experiments:npm-update-deep-engines` (MON-148).
- `commander-update-engines-command`: `/experiments:commander-update-engines` (MON-197).
- `commander-update-deep-engines-command`: `/experiments:commander-update-deep-engines` (MON-201).

### Modified Capabilities

- `commander-update-orchestrator-skill`: `level=engines` branches scan→`engine-surface-scanning` and apply→`engine-update-apply`; cross-project alignment is on engine version. Existing levels' observable behavior preserved.
- `parallel-research-workflow`: the `engines` level sources engine release notes (Node/pnpm/Deno/Bun) and reuses the `## Breaking changes & migration` section for the deep plan-mode round; other levels unchanged.
- `npm-update-scanning`: `engines` removed from the dependency-scan level enum (reconcile the placeholder; the dep scan stays patch/minor/major).
- `npm-update-apply`: removes the dead `engines→latest+--enginesNode` level→ncuTarget entry (engines no longer routes through ncu/apply). patch/minor/major behavior preserved.
- `npm-changelog-retrieval`: add engine release-note retrieval (Node/pnpm/Deno/Bun sources) alongside npm-registry changelogs.
- `experiments-plugin`: registers the four new commands and two new skills.

## Impact

- **Code** (`claude-plugins/experiments/`):
  - NEW `skills/detect-toolchain-surfaces/SKILL.md`, `skills/apply-engine-bumps/SKILL.md`.
  - NEW commands: `npm-update-engines.md`, `npm-update-deep-engines.md`, `commander-update-engines.md`, `commander-update-deep-engines.md`.
  - MODIFIED skills: `commander-update-orchestrator/SKILL.md` (engines branch), `parallel-research-workflow/SKILL.md` (engine source + reuse breaking-change section), `scan-npm-updates/SKILL.md` (drop engines level), `apply-npm-updates/SKILL.md` (remove dead engines map entry), `npm-changelog/SKILL.md` (engine sourcing).
  - REUSED unchanged: `update-isolation/SKILL.md` (opt-in branch/worktree).
  - MODIFIED `README.md` (new commands).
- **Sequencing**: builds on the `minor` (MON-200) and `major` (MON-202) cascades; this branch's base was advanced onto `develop` after the major merge (23bc105) so the MODIFIED deltas validate against the real baseline.
- **Main complexity / regression surface**: the comprehensive surface-matcher table (many file formats) and the runtime-vs-support classifier (`private` + `publishConfig`/`exports` + location, with an ambiguity prompt). Mitigation: matcher table is data-driven and individually testable; classifier defaults conservative (on doubt → leave + prompt). Existing patch/minor/major levels must stay byte-identical through the orchestrator's `engines` branch + the removed map entry (both inert — no shipped command used the engines path) — verified by re-running one existing level.
- **Network**: target resolution (`nodejs.org/dist/index.json`) and deep engine release notes. Degrades gracefully offline (skip improvements; bump to a user-supplied/cached target).
- **Data**: reuses the `npm-changelog` cache pattern; no new persisted data files.
- **No** published-package impact (plugin-only; no automated tests in this plugin). Plugin version handled by release-please — not hand-edited.
- **Linear**: closes MON-139, MON-148, MON-197, MON-201 (engines row); completes the engines portion of parents MON-133/140/153/154 — the last open row of the matrix. Confirms `engines` as the level name (open question in MON-201).
