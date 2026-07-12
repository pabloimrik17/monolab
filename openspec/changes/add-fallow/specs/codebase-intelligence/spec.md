# codebase-intelligence — Delta Spec

## ADDED Requirements

### Requirement: fallow SHALL be installed pinned and free-only

The repo SHALL declare `fallow` as an exact-pinned root devDependency. Only free static-layer commands are permitted anywhere in scripts, hooks, CI, and docs: `fallow license`, `fallow coverage`, and continuous `--runtime-coverage` usage SHALL NOT appear.

#### Scenario: Free-only enforcement

- **WHEN** repo scripts, `.husky/`, `lint-staged.config.ts`, and `.github/workflows/` are grepped for `fallow license`, `fallow coverage`, `--runtime-coverage`
- **THEN** there are zero matches

### Requirement: Root config SHALL encode triage results

`.fallowrc.json` (JSONC, with `$schema`) SHALL exist at the workspace root declaring at minimum: qup-web entries (`app.config.ts`, `src/entry-client.tsx`, `src/entry-server.tsx`, `src/app.tsx`, `src/middleware.ts`, `src/routes/**/*.tsx` — NOT `src/server/**`), `**/*.test-d.ts` entries, agent-tooling `ignorePatterns` (`.opencode/**`, `.agents/**`, `.claude/**`, `.codex/**`, `.junie/**`, `claude-plugins/**`), tool-loaded `ignoreDependencies` (stryker plugins, `@swc-node/register`, `@swc/helpers`, `tslib`, `validate-branch-name`), deliberate dependency keeps as global `ignoreDependencies` entries with scope intent documented in JSONC comments (`pg` — used only in `*-data`; `@kobalte/core` — qup-web keep; fallow has no per-workspace ignore scoping), `publicPackages` (`@m0n0lab/qup-domain`, `@m0n0lab/solid-clean`, `@m0n0lab/react-clean`), `ignoreDecorators: ["injectable"]`, and `rules: { "require-suppression-reason": "warn" }`.

#### Scenario: Config resolves

- **WHEN** `pnpm exec fallow config` runs at repo root
- **THEN** it reports `.fallowrc.json` as the loaded config with the keys above resolved

### Requirement: Dead-code SHALL be zero and gated

After debt cleanup and suppressions, `pnpm run lint:fallow` (root script running fallow dead-code with `--fail-on-issues`) SHALL exit 0, and this SHALL be enforced in CI on push. Deferred debt SHALL use inline `// fallow-ignore-*` suppressions with a `-- <reason>` trailer, never a committed baseline file.

#### Scenario: Clean gate

- **WHEN** `pnpm run lint:fallow` runs at repo root
- **THEN** exit code is 0 with zero unsuppressed dead-code issues

#### Scenario: Suppression without reason is flagged

- **WHEN** a `// fallow-ignore-next-line` comment lacks a `-- <reason>` trailer
- **THEN** fallow reports `missing-suppression-reason` at warn severity

#### Scenario: Stale suppression is flagged

- **WHEN** a suppressed issue no longer occurs (e.g. an investlab enum member gains production usage)
- **THEN** fallow reports a `stale-suppressions` finding

### Requirement: PRs SHALL get a changed-code audit gate

`ci.yml` SHALL run the `fallow-rs/fallow` GitHub Action (SHA-pinned with `# vX.Y.Z` comment, per `ci-github-actions-pinning`) on pull requests with `command: audit` and default `gate: new-only`, posting a sticky PR comment. The gate SHALL fail only on findings introduced by the changeset.

#### Scenario: New finding fails PR

- **WHEN** a PR introduces a new unused export
- **THEN** the audit verdict is `fail` and the job exits non-zero

#### Scenario: Pre-existing finding does not block

- **WHEN** a PR touches a file containing a pre-existing suppressed/deferred finding without adding new issues
- **THEN** the audit verdict is `pass`

### Requirement: knip SHALL continue running unchanged

fallow adoption SHALL NOT remove or reconfigure knip (`knip.config.ts`, `lint:knip` scripts, lint-staged, CI steps, MCP server). Both tools coexist.

#### Scenario: knip untouched

- **WHEN** the change is implemented
- **THEN** `git diff` shows no modifications to `knip.config.ts` or `lint:knip` wiring, and `pnpm run lint:knip` still passes
