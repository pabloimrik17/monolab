## ADDED Requirements

### Requirement: Skill location and VCS-safe contract

The `experiments` plugin SHALL include a skill at `claude-plugins/experiments/skills/apply-engine-bumps/SKILL.md` with frontmatter declaring a non-empty `description`. Given the inventory from `detect-toolchain-surfaces` and a resolved per-engine target, the skill rewrites the project's `runtime` version loci to the target and returns a structured result fragment. The skill SHALL run in the working directory handed to it (branch/worktree isolation, if any, is a separate `update-isolation` pre-step); it SHALL NOT create commits, push, open PRs, run tests/lint/build, or run `ncu`. It is the engines-level analog of `apply-npm-updates` (`npm-update-apply`).

#### Scenario: Skill file exists with frontmatter

- **WHEN** examining `claude-plugins/experiments/skills/`
- **THEN** the directory `apply-engine-bumps/` with `SKILL.md` SHALL exist with a non-empty `description`

#### Scenario: No commit, push, or PR

- **WHEN** the skill applies bumps to completion
- **THEN** it has run no `git commit`, no `git push`, and no `gh pr` / PR-creation command

### Requirement: Deterministic target resolution with confirmation

The skill SHALL resolve a target version per engine: Node → the latest LTS (the max `version` with `lts !== false` from `https://nodejs.org/dist/index.json`); pnpm/npm/yarn/bun → the registry `latest` dist-tag; Deno → the latest release tag. It SHALL surface the resolved targets and obtain user confirmation before writing any file. On a fetch failure or offline, the skill SHALL skip that engine with a surfaced note OR accept a user-supplied target; it SHALL NEVER fabricate or guess a version.

#### Scenario: Node resolves to latest LTS

- **WHEN** resolving the Node target
- **THEN** the skill picks the maximum `version` whose `lts` field is not `false` from the Node dist index

#### Scenario: Confirm before any write

- **WHEN** targets are resolved
- **THEN** the skill shows the per-engine targets and writes nothing until the user confirms

#### Scenario: Offline never fabricates

- **WHEN** the target source is unreachable and no user target is supplied
- **THEN** the skill skips that engine with a surfaced note and writes no version for it

### Requirement: Exact pinning and alignment of runtime surfaces

For each engine, the skill SHALL rewrite every `runtime` locus to the **same exact** resolved version (no ranges), aligning all runtime surfaces — consistent with the family-wide exact-pin policy. Edits SHALL be surgical: only the version token changes. For a `packageManager` value (`name@X`) the skill SHALL preserve the `name@` prefix and replace the version; any corepack integrity suffix (`+sha…`) SHALL be dropped by default (corepack re-resolves), and that drop SHALL be reported.

#### Scenario: All runtime Node surfaces aligned and pinned exact

- **WHEN** the Node target is `26.0.0` and the repo pins Node in `.nvmrc`, root `engines.node`, and CI
- **THEN** all three are rewritten to exactly `26.0.0` (no `^`/`~`)

#### Scenario: packageManager prefix preserved, hash dropped

- **WHEN** `packageManager` is `pnpm@10.27.0+sha512.abc` and the pnpm target is `11.0.0`
- **THEN** it becomes `pnpm@11.0.0`, and the dropped integrity hash is reported

### Requirement: Support ranges and unknown surfaces left untouched

The skill SHALL NOT modify any locus classified `support`, and SHALL NOT modify `unknownSurfaces`. A locus classified `ambiguous` SHALL be modified only when the caller has resolved it to `runtime`; absent resolution it is left untouched.

#### Scenario: Publishable support range not modified

- **WHEN** a publishable lib's `engines.node: ">=22"` is in the inventory as `support`
- **THEN** the skill leaves it unchanged

#### Scenario: Ambiguous left untouched without resolution

- **WHEN** an `ambiguous` locus has no caller resolution
- **THEN** the skill does not rewrite it

### Requirement: CI action SHA-pin safety

When rewriting GitHub Actions workflows, the skill SHALL change only the version **input** (e.g. `node-version`, `version`, `deno-version`, `bun-version`); it SHALL NOT alter the action reference `uses: <action>@<sha>` nor its trailing version comment.

#### Scenario: Only the version input is rewritten

- **WHEN** a workflow has `uses: actions/setup-node@<sha> # v4.4.0` with `node-version: 24.12.0`
- **THEN** only `node-version` is changed to the target; the `@<sha>` and the `# v4.4.0` comment are untouched

### Requirement: Structured result fragment

The skill SHALL return a structured fragment of the shape `{ resolvedTargets: {engine: version}, applied: [{ file, engine, locus, from, to }], skipped: [{ file, reason }], droppedHashes: [...], failure?: { step, file?, detail } }`. It SHALL stream the edits it makes but SHALL NOT print a consumer-facing summary or abort copy — the caller owns the summary and the abort message.

#### Scenario: Result reports applied and skipped surfaces

- **WHEN** the skill finishes a run that bumped Node and pnpm and skipped two support loci
- **THEN** the fragment lists each applied locus (`from`/`to`) and each skipped locus with a reason, and contains no consumer summary text
