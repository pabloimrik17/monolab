## Why

The `scan-npm-updates` skill silently misses real bumps in workspaces where `deno.json` and `package.json` coexist (typical in JSR + npm dual-publish). In monolab, as of 2026-04-24, at least `@types/react 18.3.27 → 18.3.28` and `tsdown 0.15.9 → 0.15.12` are missed in `packages/react-clean` and `packages/react-hooks`. Security patches could be dropped without notice.

A spike (2026-04-24, `--loglevel silly`) established the root cause: ncu 21.0.2 with `--packageFile <sub>/package.json` auto-detects `packageManager: 'deno'` from the neighboring `deno.json`, which collapses the `--dep` default to `['imports']` (Deno's import map) and ignores `dependencies`/`devDependencies`. A prior hypothesis (`--deep` vs per-manifest, recorded in `openspec/changes/refine-npm-update-patch-apply/research/followup-scan-deep-finding.md`) is ruled out: `--deep` works only by accident of cwd (`pnpm-lock.yaml` wins when starting from the root).

## What Changes

- Pass an explicit `-p <resolvedPackageManager>` in every ncu invocation of the skill (per-manifest and single-repo). The PM is already resolved by precondition 2 of `SKILL.md`; the skill must propagate it to the CLI instead of relying on auto-detection.
- Document in `SKILL.md` why `-p` is mandatory, referencing the coexisting JSR/Deno scenario as an example.

Explicitly out of scope (later, separable changes):

- Migrating manifest enumeration to `--deep`. `--deep` is a literal alias of `--packageFile '**/package.json'` (confirmed in `ncu --help`); it does not respect npm/yarn/bun `package.json#workspaces` nor `deno.json#workspace`, so it introduces overscan of manifests outside the declared workspace.
- Spawn reduction (22 → 1) and parser shape changes.
- Wall-clock benchmark.

Unchanged: output contract (`ScanResult`), manifest enumeration, catalog post-process (pnpm), `minimumReleaseAge` lookup, consumers (`/experiments:npm-update-patch` and sibling commands).

## Capabilities

### New Capabilities

- `npm-update-scanning`: contract of the `scan-npm-updates` skill (package manager and repo type detection, runner resolution, ncu invocation with mandatory `-p`, level→target mapping, per-manifest enumeration, defensive parsing of ncu stdout, `minimumReleaseAge` lookup, pnpm catalog post-processing, `ScanResult` assembly, JSON output, error paths). The skill was not versioned in `openspec/specs/`; this change seeds the complete spec to anchor the fix and serve as a base for future changes (including the possible `--deep` optimization).

### Modified Capabilities

None.

## Impact

- **Code**: `claude-plugins/experiments/skills/scan-npm-updates/SKILL.md`, "Tool invocation" section (prepend `-p <pm>` to the ncu command and add a note on why).
- **Consumers**: `/experiments:npm-update-patch` and any command that invokes the skill — no contract change; they simply stop missing bumps in repos where `deno.json` coexists with `package.json`.
- **Dependencies**: ncu pinned remains `npm-check-updates@21.0.2`; same runner per PM; same version of the `-p` flag.
- **Historical record**: `openspec/changes/refine-npm-update-patch-apply/research/followup-scan-deep-finding.md` was already updated (2026-04-24) with the spike finding and the pointer to this change; it is not part of this proposal's delta.
- **Risk**: minimal. Verified live: `pnpm dlx npm-check-updates@21.0.2 -p pnpm --packageFile packages/react-clean/package.json --target patch --jsonUpgraded` returns `{"@types/react":"18.3.28","tsdown":"0.15.12"}`. `-p <pm>` with the PM already resolved by the skill reproduces the correct behavior with no detectable side effects.
