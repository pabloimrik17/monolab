## Why

The monorepo needs a new `http-client` package that provides abstracted HTTP client functionality for both web and Node.js environments. This package will serve as a foundation for future error-handling wrapper implementations using neverthrow (ResultAsync) and effect-ts, allowing consumers to swap underlying HTTP libraries (axios, ky) without changing application code.

## What Changes

- Add new `@m0n0lab/http-client` package to `packages/` directory
- Set up complete package infrastructure following monorepo standards:
  - TypeScript configuration with composite builds
  - Vitest testing setup with coverage and JUnit reporting
  - ESLint, Prettier, Knip, and Markdownlint configuration
  - Nx project configuration for build orchestration
  - JSR publishing configuration via deno.json
  - Codecov integration with package-specific flags
- Integrate package into CI/CD pipeline:
  - Build, lint, and test tasks in GitHub Actions
  - Coverage reporting to Codecov
  - Bundle size tracking
  - Automated release via release-please
- Create package documentation (README, CHANGELOG)

**Note**: The actual HTTP client implementation (abstraction layers, neverthrow/effect-ts wrappers) is **out of scope** for this proposal. This proposal focuses solely on establishing the package foundation and infrastructure.

## Impact

- **Affected specs**:
  - NEW: `http-client-package` (package structure and configuration)
  - MODIFIED: `codecov-config` (add http-client flag)
  - MODIFIED: `bundle-size-tracking` (add http-client to tracked packages)
  - MODIFIED: `package-release` (include http-client in release workflow)

- **Affected code**:
  - `packages/` - New http-client directory
  - `.github/workflows/ci.yml` - Coverage flag for http-client
  - `codecov.yaml` - Add http-client flag configuration
  - `nx.json` - Task dependencies for http-client
  - `vitest.workspace.ts` - Include http-client in workspace
  - `.release-please-config.json` - Add http-client package configuration
  - `.release-please-manifest.json` - Initialize http-client version

- **Dependencies**: None on other packages initially (may depend on workspace utilities in future)

- **Migration**: None required (new package)
