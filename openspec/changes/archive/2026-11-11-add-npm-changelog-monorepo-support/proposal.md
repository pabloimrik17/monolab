## Why

The `experiments:npm-changelog` command captures monorepo metadata (`repository.directory`) into `_meta.json.monorepoDirectory` but never reads it. Monorepo packages whose changelog lives at `{MONOREPO_DIR}/CHANGELOG.md` or whose releases are tagged with a scoped format (`@scope/pkg@{ver}`, Lerna-style) exhaust all three retrieval strategies and terminate with `failReason: "no_changelog_source"` despite the changelog existing in a predictable location.

Empirical trigger: a 136-fetch batch across 38 packages returned 42 `no_changelog_source` failures concentrated in 9 packages. Verification against those 9 (see `design.md` — **Evidence**) confirms 4 are genuinely fixable by the new logic; the rest have distinct structural causes out of scope.

This also invalidates an assumption that underpinned the original `npm-changelog-skill` design (archived `2026-04-12-npm-changelog-skill/design.md`, **D8 Monorepo handling**): *"All major monorepos keep a single root CHANGELOG (never per-package)."* That generalization was based on a 4-monorepo sample (Angular, Babel, React, Vue) — all aggregator-family. New evidence surfaces a per-package family (TanStack, Vitejs, Microsoft TSDoc) where the root CHANGELOG is absent or does not cover the published package.

## What Changes

- **Strategy A becomes monorepo-aware.** When `_meta.json.isMonorepo=true` and `monorepoDirectory` is set, probe `{MONOREPO_DIR}/{filename}` for the standard filename chain (`CHANGELOG.md` → `CHANGELOG` → `History.md` → `CHANGES.md`) **before** falling back to the repo root. Subdirectory raw-source cache keys include the full path to avoid colliding with a potential root CHANGELOG of the same filename.
- **Strategy B learns scoped tag formats.** For monorepo packages where `v{ver}` and `{ver}` both 404, probe additional tag formats in order: `{PKG}@{ver}`, `{PKG-basename}@{ver}`, `{PKG}-v{ver}`, `{PKG-basename}-v{ver}`. First hit wins and is persisted to `_meta.json.tagFormat`.
- **Strategy B reads cached `tagFormat`.** The field is already written after a successful probe but never read back. Strategy B now tries the cached format first; on miss, silently falls through the standard probe chain and only updates `tagFormat` if a different format hits.
- **`_meta.json.tagFormat` uses templated form** (e.g., `"{package}@{version}"`, `"{packageBasename}@{version}"`, `"v{version}"`, `"{version}"`) so it is self-describing and reusable across versions.
- **Strategy A fallback semantics for monorepos.** If the subdirectory chain yields no file or the file does not cover some requested versions, fall back to the root chain for the remaining versions before proceeding to Strategy B.

Non-changes (preserved by design):
- Single-repo packages (no `repository.directory`) continue to fetch from root only. No behavior change.
- Packages without any discoverable changelog source (DefinitelyTyped `@types/*`, repos with no CHANGELOG and empty release bodies) still terminate with `no_changelog_source`. That is the correct terminal state.

## Capabilities

### Modified Capabilities

- `npm-changelog-retrieval`: Strategy A requirement changes from "always fetch from repo root" to a monorepo-aware subdir-first-with-root-fallback rule. Strategy B requirement extends the tag-format probe chain with scoped formats for monorepos and adds a cached-format short-circuit.

## Impact

- `claude-plugins/experiments/commands/npm-changelog.md` — Steps 5 and 6 rewritten; Step 3 `_meta.json` schema note for `tagFormat` templated values.
- `openspec/specs/npm-changelog-retrieval/spec.md` — MODIFIED requirements for Strategy A and Strategy B.
- No change to: caching layout, SHA256 verification flow, version enumeration, Strategy C (unpkg), output summary, or rate limiting.
- No code (skill is a markdown instruction file). No dependency, lockfile, or build changes.
- Plugin version bump required (experiments plugin) when this proposal's implementation ships — handled by the implementation change, not this proposal.
