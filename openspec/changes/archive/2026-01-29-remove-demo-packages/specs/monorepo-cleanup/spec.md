# Monorepo Cleanup Specification

## Overview

This specification defines requirements for removing proof-of-concept packages from the monorepo to reduce maintenance overhead and focus on production-ready libraries.

## REMOVED Requirements

### Requirement: Remove is-even Package

The `@m0n0lab/is-even` package must be completely removed from the monorepo including all references, configurations, and dependencies.

#### Scenario: Package directory is removed

```
GIVEN the monorepo contains packages/is-even/ directory
WHEN the cleanup process is executed
THEN the packages/is-even/ directory no longer exists
AND no build artifacts remain
AND no node_modules remain
```

#### Scenario: Configuration files are cleaned

```
GIVEN configuration files reference is-even package
WHEN configuration cleanup is performed
THEN .release-please-manifest.json does not contain packages/is-even entry
AND release-please-config.json does not contain packages/is-even configuration
AND codecov.yaml does not contain is-even coverage checks
AND codecov.yaml does not contain is-even flags
```

#### Scenario: Dependencies are removed from demo app

```
GIVEN the demo application depends on @m0n0lab/is-even
WHEN dependencies are cleaned up
THEN apps/demo/package.json does not list @m0n0lab/is-even in dependencies
AND apps/demo/src/App.tsx does not import from @m0n0lab/is-even
AND pnpm-lock.yaml does not contain @m0n0lab/is-even references
```

### Requirement: Remove is-odd Package

The `@m0n0lab/is-odd` package must be completely removed from the monorepo including all references, configurations, and dependencies.

#### Scenario: Package directory is removed

```
GIVEN the monorepo contains packages/is-odd/ directory
WHEN the cleanup process is executed
THEN the packages/is-odd/ directory no longer exists
AND no build artifacts remain
AND no node_modules remain
```

#### Scenario: Configuration files are cleaned

```
GIVEN configuration files reference is-odd package
WHEN configuration cleanup is performed
THEN .release-please-manifest.json does not contain packages/is-odd entry
AND release-please-config.json does not contain packages/is-odd configuration
AND codecov.yaml does not contain is-odd coverage checks
AND codecov.yaml does not contain is-odd flags
```

#### Scenario: Dependencies are removed from demo app

```
GIVEN the demo application depends on @m0n0lab/is-odd
WHEN dependencies are cleaned up
THEN apps/demo/package.json does not list @m0n0lab/is-odd in dependencies
AND apps/demo/src/App.tsx does not import from @m0n0lab/is-odd
AND pnpm-lock.yaml does not contain @m0n0lab/is-odd references
```

#### Scenario: Workspace dependency is removed

```
GIVEN packages/is-even depends on packages/is-odd
WHEN both packages are removed
THEN no workspace protocol dependencies remain for these packages
AND TypeScript project references are cleaned up
```

## MODIFIED Requirements

### Requirement: Update Project Documentation

Project documentation must accurately reflect the removal of demo packages and focus on production libraries.

#### Scenario: Package listings are updated

```
GIVEN openspec/project.md lists is-even and is-odd as utility packages
WHEN documentation is updated
THEN openspec/project.md does not list is-even or is-odd in package examples
AND README.md reflects only production-ready packages
AND purpose statements focus on React ecosystem and shared configurations
```

#### Scenario: Tech stack references are cleaned

```
GIVEN project documentation mentions is-even and is-odd in various sections
WHEN references are cleaned up
THEN Codecov configuration section does not mention is-even or is-odd
AND package descriptions focus on react-hooks, react-clean, ts-types, ts-configs
```

### Requirement: Demo Application Functionality

The demo application must continue to function correctly after removing is-even and is-odd dependencies.

#### Scenario: Alternative logic replaces package usage

```
GIVEN apps/demo/src/App.tsx uses isEven() and isOdd() functions
WHEN package dependencies are removed
THEN inline number parity checking logic is implemented
OR alternative demonstration code is provided
AND the demo application builds successfully with "nx build demo"
AND the demo application runs without errors with "nx dev demo"
```

#### Scenario: Build configuration remains valid

```
GIVEN the demo app has TypeScript project references
WHEN is-even and is-odd are removed
THEN apps/demo/tsconfig.json compiles without errors
AND apps/demo/tsconfig.app.json is valid
AND no missing dependency errors occur
```

## MODIFIED Requirements

### Requirement: Monorepo Build and Test

All remaining packages in the monorepo MUST build and test successfully after removal.

#### Scenario: Full monorepo build succeeds

```
GIVEN is-even and is-odd packages are removed
WHEN "nx run-many -t build" is executed
THEN all remaining projects build successfully
AND no TypeScript compilation errors occur
AND no missing dependency errors occur
```

#### Scenario: All tests pass

```
GIVEN is-even and is-odd test coverage is removed
WHEN "nx run-many -t test:unit" is executed
THEN all remaining project tests pass
AND coverage reports are generated for remaining packages
AND Codecov only tracks react-hooks, react-clean, ts-configs, ts-types
```

#### Scenario: Linting passes

```
GIVEN package references are removed from codebase
WHEN linting is executed
THEN "nx run-many -t lint:eslint" passes with no errors
AND "nx run-many -t lint:prettier" passes with no errors
AND no unused references are detected
```

## Validation

### Manual Testing Checklist

- [ ] Run `rg "is-even"` and verify only acceptable references (git history, this proposal)
- [ ] Run `rg "is-odd"` and verify only acceptable references (git history, this proposal)
- [ ] Verify `ls packages/` does not show is-even or is-odd
- [ ] Run `nx graph` and verify clean dependency graph
- [ ] Run demo app locally and verify functionality
- [ ] Push to feature branch and verify CI passes

### Automated Testing

All automated tests will run as part of the CI pipeline:
- Build validation
- Unit tests
- Linting checks
- Type checking

## Success Criteria

The removal is successful when:

1. Both package directories are completely removed
2. All configuration files are updated and valid
3. Demo application works without errors
4. Full monorepo builds successfully
5. All tests pass
6. Linting passes
7. CI pipeline is green
8. No unexpected references remain in codebase
