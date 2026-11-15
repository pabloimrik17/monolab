# Proposal: add-fallow

## Why

MON-204: adopt [fallow](https://fallow.tools) (MIT, Rust-native, npm `fallow`) for codebase intelligence the repo currently lacks: duplication, complexity/health, circular deps, architecture boundaries — plus a changed-code PR quality gate. Free static layer only (verified: no account/seat/size limits; paid = runtime coverage cloud, never used). Evaluation run on the repo already paid off: 2 production bugs found (split into `fix-qup-web-wiring`) and ~25 real debt items triaged (every finding manually verified against code).

## What Changes

- Add pinned devDep `fallow` + root `.fallowrc.json` (JSONC) encoding triage results: qup-web SolidStart entries (mirroring knip, minus `src/server/**` so dead server fns stay detectable), `*.test-d.ts` entries, agent-tooling ignores, tool-loaded `ignoreDependencies`, `publicPackages`, `ignoreDecorators: ["injectable"]`, `require-suppression-reason: warn`.
- Fix real debt: 7 dependency-hygiene items (phantom deps → owning workspaces, remove `vite-tsconfig-paths`, add `@stryker-mutator/api`), delete dead code (`logout()` server fn, 5 dead qup-domain methods, green-beard scaffold file), 3 dedup refactors (`errorJson` helper in qup-api ×13 sites, `VmStatus` + `OrderCard` components in qup-web).
- Suppress deferred debt (investlab WIP taxonomy/repository) with inline `// fallow-ignore-*` comments carrying `-- reason` (staleness-tracked by fallow).
- Wire `lint:fallow` root script (dead-code gate, zero-issues) + CI: PR step `fallow-rs/fallow` action (SHA-pinned `# v3.x`) running `audit --gate new-only` with sticky PR comment; push step runs `lint:fallow`.
- knip stays unchanged (coexistence).
- Optional: install `fallow-rs/fallow-skills` Claude Code plugin; report 4 verified bugs upstream.

## Capabilities

### New Capabilities

- `codebase-intelligence`: fallow static analysis — pinned free-only tooling, root config, zero-dead-code invariant, reasoned suppressions, PR audit gate, knip coexistence.

### Modified Capabilities

(none — new CI step conforms to existing `ci-github-actions-pinning` requirements)

## Impact

- Root: `package.json`, `pnpm-workspace.yaml` (catalog), `.fallowrc.json` (new), `.gitignore` (`.fallow/`), `.github/workflows/ci.yml` (sharedGlobal: one-time full cache invalidation).
- Workspaces: `apps/{demo,green-beard,investlab,qup-api,qup-web,wealth-react}`, `packages/{qup-domain,react-clean,react-hooks,investlab-*}` (dep moves, deletions, refactors, suppressions).
- Behavior-neutral refactors in qup-api/qup-web (dedup); no public API changes.
- pnpm `minimumReleaseAge: 1440` + fallow's ~2 releases/day → pin a version ≥24h old at implementation time.
