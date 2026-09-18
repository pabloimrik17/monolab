## @commitlint/cli (21.1.0 → 21.2.1)

### Workarounds resolved (universal)

- `extends` against pure-ESM shareable configs/presets that transitively rely on ESM-only `conventional-changelog` v7/v9/v10 previously failed to resolve. Projects that pinned older CJS preset versions, avoided ESM-only presets, or forked/inlined a config to sidestep the resolution failure can drop those workarounds — `resolve-extends` now loads pure-ESM presets natively.

### Improvements applicable (universal)

- `resolve-extends` can now resolve pure-ESM presets (built on `conventional-changelog` v7/v9/v10), so a commitlint config may `extends` modern ESM-only shareable configs directly.
- 21.2.1 is a version-bump-only release for this package (no functional change); it exists only for monorepo version alignment.

Hint: relevant to any repo whose commitlint config uses `extends` to pull in a shareable/preset config, especially ESM-only (`"type": "module"`) presets or ones based on recent conventional-changelog majors.

## @commitlint/config-conventional (21.1.0 → 21.2.0)

### Workarounds resolved (universal)

_no findings_

### Improvements applicable (universal)

_no findings_

Hint: this range is a monorepo version-alignment bump; the published changelog carries only the shared repo-wide release note (the `resolve-extends` ESM-preset feature, which lands in the resolver, not in the conventional ruleset). No config-conventional-specific rule additions or changes in this range.

## @commitlint/types (21.1.0 → 21.2.0)

### Workarounds resolved (universal)

_no findings_

### Improvements applicable (universal)

_no findings_

Hint: this range is a monorepo version-alignment bump; the published changelog carries only the shared repo-wide release note. No new or changed type exports in this range.
