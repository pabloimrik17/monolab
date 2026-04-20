## 1. Command file — Strategy A+ (subdir probing)

- [x] 1.1 In `claude-plugins/experiments/commands/npm-changelog.md`, rewrite the Step 5 guidance: keep single-repo behavior (root only), add monorepo branch (subdir chain first, then root fallback, then Strategy B)
- [x] 1.2 Specify the exact probe order for monorepos: `{MONOREPO_DIR}/CHANGELOG.md` → `{MONOREPO_DIR}/CHANGELOG` → `{MONOREPO_DIR}/History.md` → `{MONOREPO_DIR}/CHANGES.md`, then fall through to root chain for unresolved versions
- [x] 1.3 Document the cascade semantics: versions successfully parsed from the subdirectory file are marked resolved; versions absent from the subdir file fall through to the root chain before Strategy B
- [x] 1.4 Update the raw-source cache key rule: subdirectory files stored at `_source/{path-encoded-filename}` where `/` is replaced by `__` (e.g., `_source/packages__query-core__CHANGELOG.md`). Matching `.sha256` sidecar uses the same key.
- [x] 1.5 Update the 24h TTL check to use the path-encoded key for subdirectory files
- [x] 1.6 Remove the blanket statement *"Always fetch from repo root, never from a monorepo subdirectory"* and replace with the branched rule
- [x] 1.7 Update `_meta.json.changelogFiles` union rule: for subdirectory-fetched files, store the path-qualified filename (e.g., `packages/query-core/CHANGELOG.md`) not just the bare name

## 2. Command file — Strategy B+ (scoped tag formats + cached tagFormat)

- [x] 2.1 Update Step 6 entry point: read `_meta.json.tagFormat` first; if set, resolve the template against `{package}`, `{packageBasename}`, `{version}` and probe that URL before the standard chain
- [x] 2.2 On cached-format miss (HTTP 404), fall through silently to the standard probe chain; do not invalidate `_meta.json.tagFormat`
- [x] 2.3 Document the standard probe chain: `v{ver}` → `{ver}` → (if `isMonorepo`) `{PKG}@{ver}` → (if scoped) `{PKG-basename}@{ver}` → `{PKG}-v{ver}` → (if scoped) `{PKG-basename}-v{ver}`
- [x] 2.4 Specify `{PKG-basename}` derivation: for scoped `@scope/name`, basename is `name`; for unscoped, scope-stripped variants are skipped entirely
- [x] 2.5 On first success, persist the templated form to `_meta.json.tagFormat`. Valid templates: `"v{version}"`, `"{version}"`, `"{package}@{version}"`, `"{packageBasename}@{version}"`, `"{package}-v{version}"`, `"{packageBasename}-v{version}"`
- [x] 2.6 Skip the `_meta.json` write when the successful format equals the already-cached `tagFormat` value
- [x] 2.7 Confirm each tag-format probe counts as one request against the 30-per-batch / 100ms rate limit and that the probe loop for a single version can consume multiple budget slots

## 3. Command file — metadata & parsing touch-ups

- [x] 3.1 Step 3 `_meta.json` schema note: add the templated `tagFormat` examples next to the existing field placeholder
- [x] 3.2 Step 5 Parse section: confirm that section extraction logic (pattern detection, heading boundaries) is unchanged and operates identically on subdir vs root files
- [x] 3.3 Verify Strategy C (unpkg) guidance needs no change — it is already package-URL-based and implicitly monorepo-aware

## 4. Spec sync

- [ ] 4.1 After implementation merges, run `openspec sync` (or `/opsx:sync add-npm-changelog-monorepo-support`) to apply the MODIFIED Strategy A and Strategy B requirements into `openspec/specs/npm-changelog-retrieval/spec.md`
- [ ] 4.2 Validate via `openspec spec validate npm-changelog-retrieval`

## 5. Plugin version bump

- [x] 5.1 Bump `claude-plugins/experiments/.claude-plugin/plugin.json` version (minor bump — new capability, no breaking change)
- [x] 5.2 Bump `claude-plugins/experiments/package.json` to match
- [x] 5.3 Bump the `experiments` entry in `.claude-plugin/marketplace.json` to match
- [x] 5.4 Verify all three files report the same new version

## 6. Manual verification — positive cases

- [ ] 6.1 Clear local cache for the 4 target packages: `rm -rf ~/.claude/changelogs/@tanstack__query-core ~/.claude/changelogs/@tanstack__eslint-plugin-query ~/.claude/changelogs/@vitejs__plugin-react-swc ~/.claude/changelogs/eslint-plugin-tsdoc`
- [x] 6.2 Run `/experiments:npm-changelog @tanstack/query-core 5.90.0..5.90.20`; verify `changelogSource: "raw_changelog"` with subdir path in `changelogFiles`, OR `github_releases` with `tagFormat: "{package}@{version}"` — either is acceptable per cascade order
- [x] 6.3 Run `/experiments:npm-changelog @tanstack/eslint-plugin-query latest`; verify success
- [x] 6.4 Run `/experiments:npm-changelog @vitejs/plugin-react-swc latest`; verify success
- [x] 6.5 Run `/experiments:npm-changelog eslint-plugin-tsdoc latest`; verify success
- [x] 6.6 Re-run the same commands back-to-back; verify the all-cached fast path fires (0 network requests)

## 7. Manual verification — preserved behavior

- [x] 7.1 Run `/experiments:npm-changelog react 19.0.0`; verify root CHANGELOG still resolves (single-repo path unchanged)
- [x] 7.2 Run `/experiments:npm-changelog @angular/core latest`; verify aggregator-family monorepo resolves via subdir-then-root fallback (expected: subdir 404 → root 200)
- [x] 7.3 Run `/experiments:npm-changelog nx latest`; verify Strategy B resolves via `{version}` (no-prefix) tag format; confirm `_meta.json.tagFormat` is set to `"{version}"`

## 8. Manual verification — correct terminal failures

- [x] 8.1 Run `/experiments:npm-changelog @types/node latest`; verify `failReason: "no_changelog_source"` persists (DefinitelyTyped is structurally out of scope)
- [x] 8.2 Run `/experiments:npm-changelog @ant-design/icons 6.1.1`; verify still fails (no `repository.directory` in npm metadata — D5 contract)
- [x] 8.3 Confirm `i18next-resources-for-ts` also still fails with `no_changelog_source` (single-repo, no CHANGELOG, releases without body)

## 9. Documentation

- [x] 9.1 Update `claude-plugins/experiments/README.md` if it enumerates command capabilities — note monorepo support for `npm-changelog`
- [x] 9.2 Cross-reference: add a pointer in the command file's preamble to `openspec/specs/npm-changelog-retrieval/spec.md` Strategy A and Strategy B requirements
