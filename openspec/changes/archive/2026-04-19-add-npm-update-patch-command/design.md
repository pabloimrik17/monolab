## Context

The `experiments` plugin (`claude-plugins/experiments`) hosts beta skills and commands for the monolab marketplace. Today it has `/experiments:npm-changelog` (changelog fetch + cache) as the reference for the "Claude-readable command + bash invocation + local cache" pattern. The monolab monorepo uses pnpm workspaces with **active catalogs** (7 packages in `pnpm-workspace.yaml`) and a declared **`minimumReleaseAge: 1440`**. Those two facts condition the tool choice: any scanner that does not understand `catalog:` corrupts resolution by moving versions to the consumer `package.json`.

The `/experiments:npm-update-patch` command must work equally in a single-repo without catalogs, with npm/yarn/bun/deno. It is project-agnostic: bump + install only, without assuming a test runner, CI, or commit style.

## Goals / Non-Goals

**Goals:**

- A `scan-npm-updates` skill reusable by 4 commands (`patch|minor|major|engines`), even though this change only exposes `patch`.
- Automatic detection of package manager (npm/pnpm/yarn/bun/deno) and repo type (single vs workspace).
- Respect for `catalog:` (if present) and `minimumReleaseAge` (if declared in the PM).
- **Waterfall** filter semantics: `patch` reports the highest available patch even if a major sits above.
- Structured output that the skill can pass to the command to present to the user.
- Tool decision documented with evidence.

**Non-Goals:**

- Run tests, lint, build, or any post-install verification. The invoking dev/agent decides.
- Create commits or PRs. It applies to the working tree and finishes.
- Breaking-change or codemod management (relevant to `major`, out of scope for this change).
- Resolve deep transitive updates (`--deep`) — that is MON-145 and onward.
- Cross-project orchestration (MON-152/153).
- Expose the skill as a TS module consumable by other code; it is a SKILL.md invoked by Claude.

## Decisions

### Decision 1: Scanning tool = `npm-check-updates` (ncu), pin `21.0.2`

**Story.** The initial design draft chose `taze` for its waterfall + assumed JSON output. The spike task (1.1–1.8) invalidated two premises:

1. **Taze has no JSON output** as of today (v19.11.0). Confirmed by `taze --help`, source (`dist/cli.mjs`), and upstream issue `antfu-collective/taze#201` open since 2025-08-27 without merge. Parsing ANSI-colored output with variable columns is fragile to maintain.
2. **Ncu reads `minimumReleaseAge` from `pnpm-workspace.yaml` natively** (v21.x), emits the banner `Using minimumReleaseAge from pnpm-workspace.yaml: 1 day` and applies the filter. The post-processing the design anticipated for the pnpm case disappears.

Additionally: on the single-repo fixture (`chalk@5.4.0`, `lodash@4.17.20`) ncu reported both patches; taze reported "up-to-date" (exact cause unconfirmed, but reproducible evidence against taze for single-repo).

**Decision: `ncu` with pin `npm-check-updates@21.0.2`.** Reasons in order of weight:

1. `--jsonUpgraded` gives stable `{ name: targetVersion }` output → satisfies the skill↔command contract without a fragile parser.
2. Native reading of `pnpm-workspace.yaml#minimumReleaseAge` → one fewer branch in the skill for the origin repo's main PM.
3. `--cooldown <period>` available for npm/yarn/bun/deno.
4. `-ws` / `--root` cover workspaces; iterating via `--packageFile` is also acceptable if `-ws` has quirks.

**Accepted trade-offs.**

- **Waterfall is lost**: `--target patch` is a "cap" (ignores packages that only offer minor/major). In practice this is acceptable for `npm-update-patch`: the dev expects "patches within the current band". Documented in the skill.
- **Neither ncu nor taze dereferences pnpm's `catalog:`**. Wash: the skill must post-process in both cases.
- **Non-JSON banner on stdout**: `Using minimumReleaseAge...` is emitted before the JSON. The skill must strip any non-JSON line before `JSON.parse`.

**Taze remains a deferred option** if upstream implements `--json` (issue #201). The research doc justifies the pivot.

The full validation record lives in `research/taze-vs-ncu.md` inside the change (research note, archived with the change).

### Decision 2: The skill is an invocable SKILL.md, not a TS script

**Alternatives considered.**

- (A) `scripts/scan-npm-updates.ts` importable by several commands.
- (B) `skills/scan-npm-updates/SKILL.md` read by Claude when invoked.

**Chosen: B.** Rationale:

- Consistent with the plugin pattern (`npm-changelog`, `plugin-version-bump`, `hookify`).
- The logic is not pure-deterministic: it requires reasoning about the tool output, detecting the PM when ambiguous, adapting user messages. That is Claude's work, not a script's.
- Cheaper evolution: editing markdown > editing + publishing internal TS.
- The sibling commands (`npm-update-minor`, `major`, `engines`) will be able to invoke the same skill by changing one prompt parameter without duplicating logic.

**Trade-off:** there is no static verification of the "contract" between skill and command. Mitigation: the spec defines the contract in Requirements with scenarios.

### Decision 3: Skill ↔ command contract

The `scan-npm-updates` skill receives a `level` (`patch|minor|major|engines`) and returns the structure:

```
{
  packageManager: "pnpm|npm|yarn|bun|deno",
  repoType: "single|workspace",
  updates: [
    {
      name: string,
      currentVersion: string,
      targetVersion: string,
      location: "root" | "workspace:<pkg>" | "catalog:<name>",
      sourceFile: string,        // package.json path or pnpm-workspace.yaml
      skippedByReleaseAge?: boolean
    }
  ],
  warnings: string[]             // tool stderr, parse warnings, etc.
}
```

The `npm-update-patch` command:
1. Invokes the skill with `level=patch`.
2. If `updates.length === 0` → message "no patch updates available" + exit.
3. Renders a table (name, current → target, location).
4. `AskUserQuestion` with options: `apply-all | pick-subset | cancel`.
5. If `pick-subset` → second prompt asking for names to exclude (comma-separated or one per line; empty = all).
6. Applies: bump in the corresponding `sourceFile` + a single `<pm> install` at the end.
7. Shows a summary: what was applied, what was skipped, suggested next step (tests / commit) **as a message**, without executing it.

### Decision 4: Tool invocation via package manager dlx

No npm dependency is added to the workspace. The skill runs `pnpm dlx npm-check-updates@<pinned>` (or the equivalent: `npx` for npm, `yarn dlx` for yarn, `bunx` for bun, `deno run --allow-read --allow-write --allow-net --allow-env --allow-run npm:npm-check-updates@<pinned>` for deno). Version pin inside SKILL.md for reproducibility; updating the pin manually is a known maintenance task.

**Discarded alternative**: add `npm-check-updates` as a devDep of the monolab workspace. Rejected because the skill must work in any repo, not just this one.

### Decision 5: Catalogs as first-class

When a package is declared as `"vitest": "catalog:"` in a `package.json` and the entry exists in `pnpm-workspace.yaml` under `catalog:`, the skill reports the update with `location: "catalog:default"` and `sourceFile: "pnpm-workspace.yaml"`. The bump is applied by editing `pnpm-workspace.yaml`, **not** the consumer `package.json`.

Neither ncu nor taze resolves `catalog:` automatically (confirmed in the spike). Therefore the skill must:

1. Read `pnpm-workspace.yaml#catalog` directly.
2. Build a temporary "pseudo-manifest" with the catalog entries as normal versions (or query `npm view <pkg> versions --json` for each entry).
3. Filter candidates by the requested `level`, applying the resolved `minimumReleaseAge`.
4. Report each upgrade with `location: "catalog:default"` and `sourceFile: "pnpm-workspace.yaml"`.

Named catalogs (`catalog:test`) are out of scope for this iteration (warning + list).

### Decision 6: Selection UX

Flow:

```
┌─ 3 patch updates available ────────────────┐
│  vitest           4.0.18 → 4.0.24          │
│  jsdom            25.0.1 → 25.0.3          │
│  @testing-library 16.3.2 → 16.3.4          │
└────────────────────────────────────────────┘

> AskUserQuestion: "Apply updates?"
  [apply-all]      → applies all 3
  [pick-subset]    → second prompt
  [cancel]         → exit
```

If `pick-subset`: "Names to exclude (comma-separated, empty = all)". Validates that the names exist; if not, re-prompts.

**Discarded alternative**: one `AskUserQuestion` per package. Tedious with >5 deps, and adds nothing in the patches case (almost always "yes to everything").

## Risks / Trade-offs

- **Risk**: ncu changes the shape of `--jsonUpgraded` in a future release and breaks the skill's parsing.
  **Mitigation**: version pin in SKILL.md; shape validation before use (if it differs, warning + abort with update instructions).

- **Risk**: a dep with an available patch has a known regression; the user applies it "to everything" without knowing.
  **Mitigation**: this change does not actively mitigate (non-goal). Suggestion to the user in the final message: "consider reviewing changelogs with `/experiments:npm-changelog`". Natural handoff between commands.

- **Risk**: `catalog:` with multiple named catalogs (pnpm 9.5+) not covered by default.
  **Mitigation**: the first delivery only supports the default `catalog:`. Named catalogs (`catalog:test`, etc.) → warning "ignored, not yet supported" and list the skipped ones. Future change.

- **Risk**: the skill depends on `pnpm dlx`/`npx`/`yarn dlx`/`bunx` being available on PATH.
  **Mitigation**: explicit verification at the start of the skill; clear message if missing.

- **Trade-off**: without automated post-install tests, a bump that breaks the build goes unnoticed until the user's next run.
  **Accepted**: project-agnostic is a hard goal. The user knows what to run; the command does not presume.

- **Trade-off**: `ncu --target patch` is a "cap" (omits packages whose highest available is minor/major). Acceptable for `npm-update-patch`: the dev expects patches within the current band. If a package offers no patch in its band, it is not reported (consistent with "no patch available").

- **Trade-off**: ncu emits a `Using minimumReleaseAge...` banner on stdout before the JSON. Mitigation: the skill strips any non-JSON line before `JSON.parse`; validates that the resulting object has the expected keys.

## Migration Plan

Not applicable: it is a feature add, with no migration of existing users or persisted state. The `experiments` plugin version bump follows the standard pattern (`plugin.json` + `package.json` + `marketplace.json`).

## Open Questions

- Should the skill emit a dry-run artifact (JSON in `~/.claude/`) for debugging, similar to how `npm-changelog` caches? Useful if the user wants replay; cost: additional complexity. **Proposal**: not in this delivery; add in a follow-up if demand appears.
- How does it interact with the repo's `renovate.json` when present? Today renovate manages automated updates in monolab. **Proposal**: document that the command is complementary (manual/interactive flow), not an alternative; no special integration.
