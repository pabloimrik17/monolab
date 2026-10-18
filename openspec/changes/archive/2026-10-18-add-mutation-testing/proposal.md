# Add Mutation Testing

## Why

Code coverage metrics validate which code lines are executed during tests but don't validate if tests actually catch bugs. Tests can achieve 100% coverage while missing edge cases, incorrect assertions, or not verifying behavior properly. Mutation testing introduces deliberate code mutations (bugs) and verifies that tests fail when they should, providing a quality metric that complements coverage.

## What Changes

- Add Stryker mutation testing framework integrated with Vitest
- Configure shared base configuration with per-package overrides
- Integrate mutation testing into Nx target system
- Add incremental caching in CI to optimize execution time
- Configure mutation score thresholds per package type (utilities vs React packages)
- Run mutation testing only on main/develop branches (not PRs) to maintain fast feedback cycles
- Exclude generated reports from linters and version control

## Impact

- **Affected specs**: New `mutation-testing` capability
- **Affected code**:
  - Root: `stryker.config.base.ts`, `nx.json`, `.gitignore`, `.prettierignore`, `eslint.config.ts`
  - Each package: `stryker.config.ts`, `package.json` (scripts)
  - CI: `.github/workflows/ci.yml` (cache + execution steps)
  - Documentation: Root and per-package README files
- **Dependencies**: @stryker-mutator/core, @stryker-mutator/vitest-runner, @stryker-mutator/typescript-checker
- **Performance**: Mutation testing runs only on push to main/develop, uses incremental mode with cache to minimize execution time
