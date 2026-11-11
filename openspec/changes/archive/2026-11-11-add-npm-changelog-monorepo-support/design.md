## Context

The archived `2026-04-12-npm-changelog-skill` change, in decision **D8 Monorepo handling**, made an empirical generalization based on a 4-monorepo sample (Angular, Babel, React, Vue): *"All major monorepos keep a single root CHANGELOG (never per-package)."* That generalization drove the rule *"always fetch from repo root, never from a monorepo subdirectory."*

A 136-fetch batch across 38 npm packages surfaced a counter-sample of 9 packages failing with `failReason: "no_changelog_source"`. Reproducible verification against those 9 (see **Evidence** below) reveals two distinct monorepo families the original design did not distinguish:

- **Aggregator-family** (Angular, Babel, React, Vue): root `CHANGELOG.md` contains entries grouped by module. The original rule fits this family.
- **Per-package family** (TanStack Query, Vitejs, Microsoft TSDoc): no root `CHANGELOG.md`, or a root one that does not list the published package's versions. Changelog lives at `{repository.directory}/CHANGELOG.md`. Releases tagged as `@scope/pkg@{ver}` (Changesets/Lerna convention), not `v{ver}`.

The original rule is not wrong — it is incomplete. It needs to branch on family. Detection is already possible: the `repository.directory` field from `npm view {pkg} repository --json` is already captured into `_meta.json.monorepoDirectory`, but never read.

## Goals / Non-Goals

**Goals:**
- Resolve changelogs for per-package-family monorepos that advertise `repository.directory` in their npm metadata and host their changelog at the subdirectory.
- Resolve changelogs for monorepos using scoped release-tag formats (`@scope/pkg@{ver}` and variants).
- Preserve existing behavior for single-repo packages and aggregator-family monorepos.
- Close the feedback loop on `_meta.json.tagFormat`: write it *and* read it.

**Non-Goals:**
- Detecting monorepos via heuristics when `repository.directory` is absent (e.g., `@ant-design/icons` publishes from a monorepo but does not expose `directory` — see **Evidence**). Out of scope for this iteration.
- Supporting non-GitHub hosts.
- Diagnosing orthogonal Strategy B regressions surfaced during verification (e.g., `vite-tsconfig-paths` has a populated `v5.1.4` release body yet appeared in the failure batch — separate issue).
- Per-package filtering of aggregator-family CHANGELOG sections. Original D8 non-goal preserved.

## Decisions

### D1: Reformulate original D8 rather than contradict it

**Choice:** The spec for `npm-changelog-retrieval` MODIFIES the Strategy A requirement. The new rule is *"for monorepos (i.e., `repository.directory` present), try the subdirectory chain first; fall back to the repo root chain; for single repos, root only."* Aggregator-family monorepos (which have a root `CHANGELOG.md`) continue to resolve via the root fallback — their behavior is unchanged in practice, only the order of probes differs.

**Why:** The original rule was based on a partial sample. We are not rejecting its intent; we are extending its scope. Framing this as a reformulation (not a reversal) preserves the logic of the archived design and keeps the rationale discoverable.

**Alternative considered:** Branch by monorepo family (root vs subdir). Rejected — the skill has no way to classify the family without a probe, so "try subdir first with root fallback" is operationally equivalent and simpler.

### D2: Strategy A+ uses subdir-then-root cascade, per-version

**Choice:** When `isMonorepo` and `monorepoDirectory` are set:
1. Probe the filename chain (`CHANGELOG.md` → `CHANGELOG` → `History.md` → `CHANGES.md`) at `{MONOREPO_DIR}/` first.
2. For versions not parsed from the subdir file (or if the subdir file is absent), fall through to the root chain.
3. Union the filenames that returned 200 into `_meta.json.changelogFiles`, keyed to their full path when subdir.

**Why cascade, not strict subdir-only:** A subdirectory CHANGELOG in a per-package monorepo may omit very old versions that were consolidated into the root CHANGELOG during a repo reorganization. Strategy B is more expensive (N requests vs 1 fetch). Trying the already-available root fallback is cheap and strictly increases coverage.

**Alternative considered:** Strict subdir-only on detection. Rejected — unnecessary regression for packages that legitimately have both a subdir file for recent history and a root file for archived history.

### D3: Strategy B+ scoped-tag chain for monorepos

**Choice:** For monorepo packages where `v{ver}` and `{ver}` both 404, try additional tag formats in order:
1. `{PKG}@{ver}` — full package name including scope (e.g., `@tanstack/query-core@5.90.20`). Verified working against TanStack Query: `gh api /repos/TanStack/query/releases/tags/@tanstack/query-core@5.90.20` returns a 176-byte body. **First probe because Changesets (the most common scoped-monorepo release tool) emits this format.**
2. `{PKG-basename}@{ver}` — scope stripped (e.g., `query-core@5.90.20`). Covers Lerna-style per-package tags without scope prefix. For unscoped packages, identical to `{PKG}@{ver}` — skip to avoid a redundant probe.
3. `{PKG}-v{ver}` — hyphenated variant used by some Changesets configurations.
4. `{PKG-basename}-v{ver}` — scope-stripped hyphenated variant. Skip for unscoped packages.

**Why this order:** Empirical — Changesets is the dominant release tool for scoped npm monorepos in 2024–2026. The hyphenated variants are long-tail fallbacks observed in a few older Lerna repos.

**Alternative considered:** Probe all four unconditionally. Rejected — doubles worst-case request count for all-version batches. The cached `tagFormat` short-circuit (D4) mitigates this after the first success.

### D4: Short-circuit via cached `tagFormat` with silent fallthrough

**Choice:** Strategy B reads `_meta.json.tagFormat` on entry. If set, probe that format first. On miss, silently fall through the full probe chain (`v{ver}` → `{ver}` → [if monorepo] scoped variants). Update `tagFormat` only if a *different* format succeeds.

**Templated form:** Persist `tagFormat` as a self-describing template string:
- `"v{version}"` — v-prefixed
- `"{version}"` — bare
- `"{package}@{version}"` — scoped
- `"{packageBasename}@{version}"` — scope-stripped
- `"{package}-v{version}"`, `"{packageBasename}-v{version}"` — hyphenated

**Why fallthrough (not invalidate):** A stale `tagFormat` means at most one wasted 100ms request per invocation — cheaper than invalidating and re-probing every format from scratch. In the steady state (most versions share a format within a package's lifetime), the cached hint is a near-free optimization.

**Why update only on different format:** Avoids `_meta.json` churn. Writing the same value back on every hit is wasted I/O.

**Alternative considered:** Invalidate `tagFormat` on miss. Rejected — generates churn on edge cases (e.g., one odd version), and the skill already treats cache misses as cheap. No user-visible benefit.

### D5: `repository.directory` is the monorepo contract

**Choice:** The subdir probing logic fires only when `_meta.json.isMonorepo=true` AND `_meta.json.monorepoDirectory` is non-null. Those fields are populated from `npm view {pkg} repository.directory`. If the field is absent, the package is treated as single-repo regardless of whether the underlying GitHub repository is physically a monorepo.

**Why explicit:** The alternative is heuristic detection (e.g., GitHub API listing of `packages/` at repo root, fuzzy-match against package name). That is a substantially larger scope, introduces API-cost and false-positive risk, and is not necessary for the target cohort. The fixable failures all advertise `directory` correctly.

**Known limitation:** Packages that are physically in a monorepo but omit `directory` from their published `package.json` (verified case: `@ant-design/icons` — published from `ant-design/ant-design-icons` at `packages/icons-react/` but ships no `repository.directory` in npm metadata) will continue to fail. This is correct behavior under the contract. A future iteration may add heuristic detection.

### D6: Subdir raw-source cache key includes path

**Choice:** When Strategy A+ stores a successfully fetched subdir file, the `_source/` filename encodes the path: e.g., `_source/packages__query-core__CHANGELOG.md` (path separators replaced with `__`). `.sha256` sidecar follows the same key.

**Why:** A monorepo could conceivably have a `CHANGELOG.md` both at root and at `{dir}/`. Treating them as the same cache entry would corrupt TTL and verification. Encoding the path in the key avoids collision while keeping all raw sources under `_source/`.

## Evidence

Verified 2026-04-20 against the 9 failure-batch packages:

| Package | `repository.directory` | Subdir CHANGELOG.md | Scoped release tag (sample) | Resolved by this change |
|---|---|---|---|---|
| `@tanstack/query-core` | `packages/query-core` | 200 OK | `@tanstack/query-core@5.90.20` → body 176 bytes | ✅ |
| `@tanstack/eslint-plugin-query` | `packages/eslint-plugin-query` | 200 OK | (same tagging convention) | ✅ |
| `@vitejs/plugin-react-swc` | `packages/plugin-react-swc` | 200 OK | — | ✅ |
| `eslint-plugin-tsdoc` | `eslint-plugin` | 200 OK | — | ✅ |
| `@types/node` | (DefinitelyTyped) | — | — | ❌ Out of scope (structural) |
| `@types/react` | (DefinitelyTyped) | — | — | ❌ Out of scope (structural) |
| `i18next-resources-for-ts` | *absent* | N/A (single-repo) | No releases with body | ❌ Out of scope (no changelog source anywhere) |
| `vite-tsconfig-paths` | *absent* | N/A (single-repo) | `v5.1.4` → body 97 bytes | ⚠️ Should already resolve via current Strategy B; needs orthogonal investigation |
| `@ant-design/icons` | *absent* | — (no per-package file) | No `@ant-design/icons@6.1.1` release | ❌ Out of scope (monorepo without `directory` + no source) |

Commands used for reproduction:
```bash
npm view {PKG} repository --json
curl -sI "https://raw.githubusercontent.com/{OWNER}/{REPO}/{BRANCH}/{MONOREPO_DIR}/CHANGELOG.md"
gh api "/repos/{OWNER}/{REPO}/releases/tags/{TAG_FORMAT}"
```

## Risks / Trade-offs

- **[Subdir file may be a partial changelog]** → Cascade fallback to root (D2) covers the gap. If root also lacks the version, Strategy B takes over as today.
- **[Stale `tagFormat` after repo tagging-convention change]** → Fallthrough on miss (D4) adds at most one 100ms wasted request per invocation. No invalidation needed.
- **[False positive: monorepo advertises `directory` but changelog is at root]** → Cascade fallback (D2) still finds it at the root chain. One wasted 404 probe at the subdir path.
- **[Monorepos without `directory` field]** → Documented as a known limitation (D5). `@ant-design/icons` is the verified example. Future heuristic detection is a separate iteration.
- **[Unscoped packages probing scope-stripped variants]** → Avoided by gating the probe on scope presence (D3).
- **[Orthogonal Strategy B bug surfaced during verification]** → `vite-tsconfig-paths@5.1.4` has a populated release body that the current skill should already retrieve but did not in the failure batch. This design does not address that case; a separate issue should track it.
