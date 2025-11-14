# Rename `types` Package to `ts-types`

**Linear Issue:** [MON-52](https://linear.app/monolab/issue/MON-52)

## Why

The current package name `@m0n0lab/types` lacks semantic clarity about what types of types it contains. Renaming to `@m0n0lab/ts-types` explicitly indicates that this package provides TypeScript type definitions, improving discoverability and reducing ambiguity for consumers.

This change is being made now because:
- The package is in pre-release (v0.1.0), minimizing external impact
- No internal consumers exist in the monorepo
- The package is not yet included in CI coverage/bundle analysis workflows
- Early adoption is minimal, making this the ideal time for the rename

## What Changes

- **BREAKING**: Rename NPM package from `@m0n0lab/types` to `@m0n0lab/ts-types`
- **BREAKING**: Rename JSR package from `@m0n0lab/types` to `@m0n0lab/ts-types`
- **BREAKING**: Rename Nx project from `@monolab/types` to `@monolab/ts-types`
- Rename directory from `packages/types/` to `packages/ts-types/` (preserving git history)
- Update Release Please configuration for the new package path and name
- Update Codecov configuration with new flag name `ts-types` and path
- Add `ts-types` to CI workflows for coverage, test results, and bundle analysis
- Update OpenSpec documentation referencing the old package name
- Deprecate `@m0n0lab/types` on NPM and JSR with migration instructions

## Impact

**Affected specs:**
- `types-package` - Complete rename of package identity and references

**Affected code:**
- `packages/types/` → `packages/ts-types/` (12 files)
- `release-please-config.json` - Release configuration
- `codecov.yaml` - Coverage flags and paths
- `.github/workflows/ci.yml` - CI coverage, test uploads, and bundle analysis
- `openspec/changes/add-types-package/` - Historical documentation

**Migration for external users:**
```bash
# Update package.json
- "@m0n0lab/types": "^0.1.0"
+ "@m0n0lab/ts-types": "^0.1.0"

# Update imports (no code changes needed, just package name)
```

**Risks:**
- Existing users of `@m0n0lab/types@0.1.0` will need to update (minimal impact due to pre-release status)
- NPM package deprecation notice will inform users of the rename

**Benefits:**
- Improved semantic clarity and searchability
- Consistent with TypeScript ecosystem conventions (e.g., `@types/*` scope)
- Better alignment for future expansion (e.g., `js-types`, `schema-types`)
