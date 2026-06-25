# Spike — can native `bun` commands help with catalog scan/apply?

**Bun**: 1.3.10. **Date**: 2026-06-16.
**Goal**: decide whether a `bun` CLI command can replace the manual `npm view` (detect) and in-place `Edit` (apply) steps for Bun catalogs.

## Fixture

Root `package.json` (Bun workspace) with `catalog.lodash = 4.17.0` and `catalogs.default.chalk = 4.1.0`; consumer `apps/web/package.json` referencing `"lodash": "catalog:"` and `"chalk": "catalog:default"`. `bun install` to create the lockfile.

## Findings

### `bun outdated --filter '*'` — catalog-aware detection

```
| Package | Current | Update | Latest | Workspace             |
| chalk   | 4.1.0   | 4.1.0  | 5.6.2  | catalog:default (web) |
| lodash  | 4.17.0  | 4.17.0 | 4.18.1 | catalog (web)         |
```

- Natively lists catalog deps and labels each with `catalog:` / `catalog:<name>` plus the referencing workspace.
- Exposes only Current / Update (latest within the declared range) / Latest. **No patch/minor/major band, no `minimumReleaseAge`.** With exact-pinned catalog entries, `Update == Current`.
- Verdict: useful as a catalog-membership signal, but cannot honor the flow's `level` caps or release-age threshold → does NOT replace the uniform `npm view` + level/cooldown candidate resolution.

### `bun pm pkg get catalog` / `catalogs` — clean read

Returns the catalog maps as JSON. Verdict: safe, native READ of the catalog source — preferred over hand-parsing `package.json`.

### `bun pm pkg set catalogs.<name>.<pkg>=<version>` — formatting-preserving write, with a footgun

- `bun pm pkg set catalogs.default.chalk=4.1.2` → updated in place, **preserved formatting/key order** (`"workspaces": ["apps/*"]` stayed inline), consumer refs untouched. 
- Scoped names work: `bun pm pkg set catalogs.default.@types/node=20.1.0` → `"@types/node": "20.1.0"`. 
- **Dotted package names are silently mangled** — the key path is dot-delimited:

  ```
  bun pm pkg set catalogs.default.socket.io=4.7.0
  → "socket": { "io": "4.7.0" }     ❌ should be "socket.io": "4.7.0"
  ```

  No documented escape for a literal dot in a key segment.

### `bun update` / `bun update --latest`

Updates within the declared range / to latest, rewrites the lockfile, and installs. No patch/minor/major granularity and no "edit source only, one install at end" separation. Verdict: not a fit for the level-capped, single-install apply contract.

## Decision

- **Detect:** keep the uniform `npm view` + level + `minimumReleaseAge` resolution (D2). `bun outdated` is informative only.
- **Read source:** use `bun pm pkg get catalog|catalogs` (clean, safe).
- **Write source:** targeted in-place `Edit` (D5, option B). `bun pm pkg set` is documented as an evaluated alternative but rejected as the write mechanism because of the silent dotted-name corruption — unacceptable in a flow whose original defect was a silent miss.
