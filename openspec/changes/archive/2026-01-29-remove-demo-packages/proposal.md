# Remove Demo Packages (is-even and is-odd)

**Status:** Draft
**Created:** 2025-11-15
**Author:** AI Assistant
**Change ID:** remove-demo-packages

## Overview

Remove the `@m0n0lab/is-even` and `@m0n0lab/is-odd` packages from the monorepo. These were proof-of-concept packages used to test the monorepo setup, publishing workflows, and tooling infrastructure. They have served their purpose and are no longer needed.

## Motivation

### Why This Change?

1. **Completed Purpose**: Both packages were created as proof-of-concept utilities to validate:
   - Monorepo package publishing workflows
   - JSR/npm publishing pipelines
   - Testing infrastructure (Vitest, mutation testing with Stryker)
   - CI/CD integration with Nx Cloud and Codecov
   - Release management with release-please

2. **Maintenance Overhead**: These simple packages add unnecessary maintenance burden:
   - Dependencies to update
   - Tests to maintain
   - Coverage tracking in Codecov
   - Release management overhead
   - Documentation maintenance

3. **Focus on Core Libraries**: The monorepo should focus on meaningful, production-ready libraries like:
   - `@m0n0lab/react-hooks` - Custom React lifecycle hooks
   - `@m0n0lab/react-clean` - MVVM pattern library
   - `@m0n0lab/ts-types` - TypeScript utility types
   - `@m0n0lab/ts-configs` - Shared TypeScript configurations

4. **Demo App Simplification**: The demo SolidJS application currently uses these packages as examples, but this dependency can be removed and replaced with simpler inline logic or other demonstration code.

### Impact Analysis

**Packages Affected:**
- `packages/is-even/` - Full directory removal
- `packages/is-odd/` - Full directory removal
- `apps/demo/` - Remove dependency and usage

**Configuration Files Affected:**
- `.release-please-manifest.json` - Remove package entries
- `release-please-config.json` - Remove package configurations
- `codecov.yaml` - Remove coverage flags and status checks
- `openspec/project.md` - Update package references
- `pnpm-lock.yaml` - Will be regenerated
- `tsconfig.json` - Remove project references
- `.github/workflows/*` - Remove any specific references

**Documentation Affected:**
- `README.md` - Update package listings
- Various OpenSpec archived proposals referencing these packages
- Package-specific CHANGELOG.md files (will be removed with packages)

## Goals

1. **Complete Removal**: Remove all traces of is-even and is-odd packages from the monorepo
2. **Clean Configuration**: Update all configuration files to remove references
3. **Demo App Update**: Update the demo application to work without these dependencies
4. **Documentation Update**: Ensure all documentation reflects the removal
5. **CI/CD Validation**: Ensure CI/CD pipelines continue to work correctly after removal

## Non-Goals

- Deprecating published versions on npm/JSR (packages remain available for existing users)
- Creating a migration guide (no external users to migrate)
- Preserving package history in a separate repository

## Success Criteria

- ✅ Package directories completely removed
- ✅ All configuration files updated
- ✅ Demo application builds and runs without errors
- ✅ CI pipeline passes successfully
- ✅ No dead references in codebase (validated with grep/rg)
- ✅ Documentation accurately reflects current package list
- ✅ Codecov configuration no longer tracks removed packages

## Dependencies

None - this is a cleanup change with no external dependencies.

## Timeline

Estimated effort: 1-2 hours
- No staged rollout needed
- Can be completed in a single PR

## Risks and Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Broken CI pipeline | Low | Medium | Validate all CI workflows after removal |
| Missing references in documentation | Medium | Low | Comprehensive grep search before completion |
| Demo app breaks | Low | Medium | Test demo app locally before committing |
| TypeScript compilation errors | Low | Medium | Run full build after changes |

## Open Questions

None - straightforward removal with clear scope.

## Related Changes

This change relates to the original package setup proposals but doesn't depend on or block any other changes currently in progress:
- `add-mutation-testing` (in progress) - References is-even/is-odd in tasks
- `rename-types-to-ts-types` (in progress) - Independent change
