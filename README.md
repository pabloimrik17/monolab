<!-- markdownlint-disable MD041 -->

![MonoLab](monolab-logo.png)
[![CI - Dev](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml/badge.svg?branch=develop)](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml)
[![CI - Main](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/pabloimrik17/monolab/actions/workflows/ci.yml)
[![codecov](https://codecov.io/gh/pabloimrik17/monolab/branch/develop/graph/badge.svg?token=F5RXGDOQ8S)](https://codecov.io/gh/pabloimrik17/monolab)
[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Fpabloimrik17%2Fmonolab%2Fdevelop)](https://dashboard.stryker-mutator.io/reports/github.com/pabloimrik17/monolab/develop)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Monorepo](https://img.shields.io/badge/Monorepo-Nx-blue)](https://nx.dev)
[![Nx Cloud](https://img.shields.io/badge/Nx%20Cloud-Enabled-blue?logo=nx)](https://nx.app/)
[![Node.js](https://img.shields.io/badge/Node.js-24.11.0-green?logo=node.js)](https://nodejs.org)
[![pnpm](https://img.shields.io/badge/pnpm-10.19.0-orange?logo=pnpm)](https://pnpm.io/)
![CodeRabbit Pull Request Reviews](https://img.shields.io/coderabbit/prs/github/pabloimrik17/monolab?utm_source=oss&utm_medium=github&utm_campaign=pabloimrik17%2Fmonolab&labelColor=171717&color=FF570A&link=https%3A%2F%2Fcoderabbit.ai&label=CodeRabbit+Reviews)
[![Maintained with](https://img.shields.io/badge/Maintained%20with-❤️-red)](https://github.com/pabloimrik17/monolab)

<!-- markdownlint-enable MD041 -->

## Published Packages

This monorepo publishes several packages to both npm and JSR registries:

### Utility Libraries

**[@m0n0lab/is-odd](https://www.npmjs.com/package/@m0n0lab/is-odd)** | **[@m0n0lab/is-odd (JSR)](https://jsr.io/@m0n0lab/is-odd)**

Check if a number is odd.

```bash
# npm
npm install @m0n0lab/is-odd

# JSR (Deno, Node.js, Bun)
npx jsr add @m0n0lab/is-odd
```

**[@m0n0lab/is-even](https://www.npmjs.com/package/@m0n0lab/is-even)** | **[@m0n0lab/is-even (JSR)](https://jsr.io/@m0n0lab/is-even)**

Check if a number is even.

```bash
# npm
npm install @m0n0lab/is-even

# JSR (Deno, Node.js, Bun)
npx jsr add @m0n0lab/is-even
```

### React Hooks

**[@m0n0lab/react-hooks](https://www.npmjs.com/package/@m0n0lab/react-hooks)** | **[@m0n0lab/react-hooks (JSR)](https://jsr.io/@m0n0lab/react-hooks)**

Collection of reusable React hooks.

```bash
# npm
npm install @m0n0lab/react-hooks

# JSR (Deno, Node.js, Bun)
npx jsr add @m0n0lab/react-hooks
```

**[@m0n0lab/react-clean](https://www.npmjs.com/package/@m0n0lab/react-clean)** | **[@m0n0lab/react-clean (JSR)](https://jsr.io/@m0n0lab/react-clean)**

Clean React components and patterns.

```bash
# npm
npm install @m0n0lab/react-clean

# JSR (Deno, Node.js, Bun)
npx jsr add @m0n0lab/react-clean
```

### Configuration Packages

**[@m0n0lab/ts-configs](https://www.npmjs.com/package/@m0n0lab/ts-configs)** | **[@m0n0lab/ts-configs (JSR)](https://jsr.io/@m0n0lab/ts-configs)**

Shared TypeScript configurations for web and Node.js projects.

```bash
# npm
npm install -D @m0n0lab/ts-configs

# JSR (Deno, Node.js, Bun)
npx jsr add -D @m0n0lab/ts-configs
```

## Development Setup

### Node.js Installation

This project uses Node.js version 24.11.0. To install and use this specific version:

<!-- markdownlint-disable MD013 MD029 -->

1. Make sure you have [nvm (Node Version Manager)](https://github.com/nvm-sh/nvm) installed
2. Clone the repository and navigate to the project directory
3. Run the following command to install and use the correct Node.js version:
 <!-- markdownlint-enable MD013 MD029 -->

```bash
nvm use
```

This will automatically read the `.nvmrc` file and switch to Node.js version 24.11.0.

### Package Manager Setup

<!-- markdownlint-disable MD013 MD029 -->

This project uses pnpm as the package manager. To activate pnpm version 10.19.0 using corepack:

1. Make sure you have corepack enabled:

```bash
corepack enable
```

2. Activate pnpm version 10.19.0:

```bash
corepack prepare pnpm@10.19.0 --activate
```

3. Verify the installation:
 <!-- markdownlint-enable MD013 MD029 -->

```bash
pnpm --version
```

The output should be `10.19.0`.

## Testing

This project uses Vitest for testing with separate test types organized by purpose.

### Test Types

**Unit Tests** (`*.test.ts`, `*.test.tsx`)

-   Fast, isolated tests for individual functions/components
-   Run with: `pnpm run test:unit` or `pnpm run test:unit:affected`
-   Watch mode: `pnpm run test:unit:watch`

**Integration Tests** (`*.integration.ts`)

-   Tests for module interactions and integration points
-   Run with: `pnpm run test:integration` or `pnpm run test:integration:affected`
-   Watch mode: `pnpm run test:integration:watch`

**Type Tests** (`*.test-d.ts`)

-   Compile-time TypeScript type validation using `expectTypeOf`
-   Prevents type regressions without runtime execution
-   Run with: `pnpm run test:types` or `pnpm run test:types:affected`
-   Watch mode: `pnpm run test:types:watch`

**Browser Tests** (`*.browser.test.ts`, `*.browser.test.tsx`) - React packages only

-   Real browser testing with Playwright (Chromium)
-   Tests actual DOM behavior, not jsdom simulation
-   Run with: `pnpm run test:browser` or `pnpm run test:browser:affected`
-   Watch mode: `pnpm run test:browser:watch`

### Interactive UI Mode

Launch Vitest UI for visual test debugging:

```bash
pnpm run test:ui
```

Access the UI at `http://localhost:51204/__vitest__/`

### Running Tests

**All tests across monorepo:**

```bash
pnpm run test:unit           # All unit tests
pnpm run test:integration    # All integration tests
pnpm run test:types          # All type tests
pnpm run test:browser        # All browser tests (React packages)
```

**Affected tests only (based on git changes):**

```bash
pnpm run test:unit:affected
pnpm run test:integration:affected
pnpm run test:types:affected
pnpm run test:browser:affected
```

**Per-package tests:**

```bash
pnpm --filter @monolab/is-odd run test:unit
pnpm --filter @monolab/react-hooks run test:browser
```

### Writing Tests

**Unit Test Example:**

```typescript
// src/utils/is-odd.test.ts
import { expect, test } from "vitest";
import { isOdd } from "./is-odd.js";

test("returns true for odd numbers", () => {
    expect(isOdd(3)).toBe(true);
});
```

**Type Test Example:**

```typescript
// src/utils/is-odd.test-d.ts
import { expectTypeOf } from "vitest";
import { isOdd } from "./is-odd.js";

expectTypeOf(isOdd).parameter(0).toBeNumber();
expectTypeOf(isOdd).returns.toBeBoolean();

// @ts-expect-error - should not accept string
isOdd("3");
```

**Browser Test Example (React):**

```typescript
// src/hooks/use-did-mount.browser.test.tsx
import { render } from "@testing-library/react";
import { expect, test } from "vitest";

test("hook executes in real browser", () => {
    const { getByTestId } = render(<TestComponent />);
    expect(getByTestId("status")).toBeDefined();
    // Verify actual browser environment
    expect(typeof window).toBe("object");
});
```

### Configuration

-   **Workspace config**: `vitest.workspace.ts` (shared settings)
-   **Package configs**: `packages/*/vitest.config.ts` (per-package overrides)
-   **Shared settings**: `clearMocks`, `restoreMocks`, `unstubEnvs`,
    `unstubGlobals`, `maxConcurrency: 10`

### CI Testing

Tests run automatically in CI via Nx Cloud distribution:

-   Pull Requests: Affected tests only (coverage thresholds disabled)
-   Main/Develop: All tests with full coverage enforcement
-   Distributed across 3 agents for optimal performance

## Quality & Testing

### Mutation Testing

<!-- markdownlint-disable MD013 -->

[![Mutation testing badge](https://img.shields.io/endpoint?style=flat&url=https%3A%2F%2Fbadge-api.stryker-mutator.io%2Fgithub.com%2Fpabloimrik17%2Fmonolab%2Fdevelop)](https://dashboard.stryker-mutator.io/reports/github.com/pabloimrik17/monolab/develop)

<!-- markdownlint-enable MD013 -->

This project uses [Stryker Mutator](https://stryker-mutator.io/) for mutation
testing to validate the quality of our test suites. Mutation testing introduces
deliberate bugs (mutations) into the code and verifies that tests fail
appropriately, ensuring tests actually catch bugs beyond just achieving code
coverage.

#### Available Commands

Run mutation testing on all packages:

```bash
pnpm exec nx run-many -t test:mutation
```

Run mutation testing on affected packages only:

```bash
pnpm exec nx affected -t test:mutation
```

Run mutation testing on a specific package:

```bash
pnpm exec nx run @monolab/is-odd:test:mutation
```

View HTML report for a package:

```bash
pnpm exec nx run @monolab/is-odd:test:mutation:report
```

#### Mutation Score Interpretation

Mutation scores indicate the percentage of mutations that were detected
(killed) by tests:

-   **High (80-100%)**: Excellent test quality, most edge cases covered
-   **Medium (60-79%)**: Good test quality, some improvements possible
-   **Low (0-59%)**: Weak test quality, significant gaps in test coverage

Each package has graduated thresholds based on complexity:

-   **Utilities** (is-odd, is-even): 90% high / 75% low / 75% break
-   **React packages** (react-hooks, react-clean): 80% high / 65% low / 60% break
-   **Config packages** (ts-configs): 70% high / 50% low / 50% break

#### CI Behavior

Mutation testing runs automatically in CI with the following behavior:

<!-- markdownlint-disable MD013 -->

-   **Execution**: Only on push to `main` or `develop` branches (skipped on PRs)
-   **Incremental Mode**: Reuses results from previous runs to minimize execution
    time
-   **Caching**: Incremental cache is restored/saved with multi-level fallback
    strategy
-   **Dashboard**: Results are uploaded to
    [Stryker Dashboard](https://dashboard.stryker-mutator.io/reports/github.com/pabloimrik17/monolab/develop)
    for historical tracking
-   **Artifacts**: Mutation reports are uploaded as CI artifacts for 30 days

<!-- markdownlint-enable MD013 -->

#### Local Development

First run initializes the incremental cache and may take 10-30 minutes per
package. Subsequent runs reuse the cache and only test changed code,
significantly reducing execution time.

Reports are generated at `packages/*/reports/mutation/index.html` and can be
viewed in your browser.

## Contributing

### Commit Message Convention

This project uses [Conventional Commits](https://www.conventionalcommits.org/)
to automatically generate changelogs and determine version bumps. All commits
must follow this format:

```text
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

#### Commit Types

-   **feat**: A new feature (triggers MINOR version bump)
-   **fix**: A bug fix (triggers PATCH version bump)
-   **docs**: Documentation only changes
-   **style**: Code style changes (formatting, missing semicolons, etc.)
-   **refactor**: Code changes that neither fix a bug nor add a feature
-   **perf**: Performance improvements
-   **test**: Adding or updating tests
-   **build**: Changes to build system or dependencies
-   **ci**: Changes to CI configuration files and scripts
-   **chore**: Other changes that don't modify src or test files

#### Breaking Changes

To trigger a MAJOR version bump, add `BREAKING CHANGE:` in the commit footer
or append `!` after the type/scope:

```text
feat(api)!: remove deprecated endpoint

BREAKING CHANGE: The /v1/old-endpoint has been removed.
Use /v2/new-endpoint instead.
```

#### Scope

The scope should be the package name without the `@m0n0lab/` prefix:

-   `is-odd`
-   `is-even`
-   `react-hooks`
-   `react-clean`
-   `ts-configs`

#### Examples

```bash
# Feature addition (minor version bump)
feat(is-odd): add support for BigInt numbers

# Bug fix (patch version bump)
fix(react-hooks): prevent memory leak in useDidMount

# Breaking change (major version bump)
feat(ts-configs)!: require Node.js 24.11.0 or higher

BREAKING CHANGE: Dropped support for Node.js versions below 24.11.0

# Documentation update (no version bump)
docs(react-clean): improve usage examples in README

# Multiple packages
feat(is-odd,is-even): add type narrowing
```

### Release Process

This project uses [release-please](https://github.com/googleapis/release-please)
to automate versioning and publishing.

#### How It Works

1. **Develop & Commit**: Make changes and commit using conventional commits
2. **Automatic PR Creation**: release-please analyzes commits and
   creates/updates a "Release PR"
3. **Review Release PR**: The PR shows version bumps and changelog entries
   for affected packages
4. **Merge to Publish**: Merging the Release PR triggers automatic publishing
   to npm and JSR

#### Release PR

When commits are pushed to `main`, release-please automatically:

-   Calculates version bumps based on conventional commits
-   Updates `package.json` and `jsr.json` versions
-   Generates/updates `CHANGELOG.md` for each package
-   Updates `.release-please-manifest.json`
-   Creates or updates a single Release PR with all changes

The Release PR title follows the pattern: `chore(main): release packages`

#### Publishing Workflow

When the Release PR is merged:

1. **JSR Publishing**: Packages are published to JSR first, in dependency order
    - Uses `deno publish` with Deno workspaces for automatic dependency resolution
    - Working directory stays clean (no build artifacts yet)
    - OIDC Trusted Publisher authentication
2. **npm Publishing**: Packages are built and published to npm
    - Build generates `dist/` artifacts
    - Uses `pnpm publish` which automatically transforms `workspace:*` → semver ranges
    - Provenance attestation via OIDC authentication
3. **GitHub Releases**: release-please creates GitHub releases with changelogs
   and tags

**Important**:

-   Both npm and JSR use OIDC Trusted Publishers (no secrets/tokens needed)
-   JSR runs first to keep working directory clean (no `--allow-dirty` flag needed)
-   pnpm automatically transforms workspace protocol dependencies to proper semver
-   Both tools run full validation suites (no disabled checks)

#### Workspace Protocol Dependencies

**For Internal Dependencies:**

Use the `workspace:*` protocol in `package.json` for dependencies on other
monorepo packages:

```json
{
    "dependencies": {
        "@m0n0lab/is-odd": "workspace:*",
        "@m0n0lab/react-hooks": "workspace:*"
    }
}
```

**Why this works:**

-   **Development**: pnpm links packages locally for fast iteration
-   **Publishing to npm**: pnpm automatically transforms `workspace:*` →
    `^X.Y.Z` (published version)
-   **Publishing to JSR**: Deno workspaces automatically resolve to JSR
    registry URLs
-   **No manual updates**: Dependency versions stay in sync automatically

**Important**: Never manually update internal dependency versions - the
workspace protocol and publishing tools handle this automatically.

#### Dependency Order

JSR packages are published in the correct order to respect dependencies:

1. `ts-types` (no internal dependencies)
2. `is-odd` (no internal dependencies)
3. `react-hooks` (no internal dependencies)
4. `ts-configs` (no internal dependencies)
5. `is-even` (depends on `is-odd`)
6. `react-clean` (depends on `react-hooks` and `ts-types`)

This ordering is calculated dynamically using Nx's project graph.

### Adding a New Package

To add a new package to the automated release system:

#### 1. Create Package Structure

```bash
# Create package directory
mkdir -p packages/my-package

# Initialize package.json
cd packages/my-package
```

#### 2. Configure package.json

```json
{
    "name": "@m0n0lab/my-package",
    "version": "0.0.0",
    "type": "module",
    "repository": {
        "type": "git",
        "url": "https://github.com/pabloimrik17/monolab.git",
        "directory": "packages/my-package"
    },
    "engines": {
        "node": "24.11.0"
    },
    "publishConfig": {
        "access": "public",
        "registry": "https://registry.npmjs.org/"
    }
}
```

**Important**: Set initial version to `0.0.0` (release-please will bump it
on first release).

#### 3. Create deno.json

```json
{
    "name": "@m0n0lab/my-package",
    "version": "0.0.0",
    "license": "MIT",
    "exports": "./src/index.ts"
}
```

**Note**: For packages that use DOM APIs (React, browser utilities), add compilerOptions:

```json
{
    "name": "@m0n0lab/my-package",
    "version": "0.0.0",
    "license": "MIT",
    "exports": "./src/index.ts",
    "compilerOptions": {
        "lib": ["ES2023", "DOM"]
    }
}
```

#### 4. Update release-please-config.json

Add your package to the `packages` section:

```json
{
    "packages": {
        "packages/my-package": {
            "extra-files": ["deno.json"]
        }
    }
}
```

This ensures both `package.json` and `deno.json` versions stay
synchronized.

#### 5. Update .release-please-manifest.json

Add the initial version:

```json
{
    "packages/my-package": "0.0.0"
}
```

#### 6. Configure Nx Project

Create or update `packages/my-package/project.json`:

```json
{
    "name": "@m0n0lab/my-package",
    "sourceRoot": "packages/my-package/src",
    "projectType": "library",
    "tags": ["type:library"]
}
```

#### 7. First Release

1. Commit your new package with a conventional commit:

    ```bash
    git add .
    git commit -m "feat(my-package): add new package"
    git push origin develop
    ```

2. Merge to `main` branch

3. Wait for release-please to create a Release PR

4. Review and merge the Release PR to publish

### Manual Recovery Procedures

If publishing fails, follow these recovery steps:

#### Failed npm Publish

If npm publish fails but JSR succeeds:

```bash
# 1. Verify the package version that failed
cat packages/<package>/package.json

# 2. Build the package
pnpm exec nx run @m0n0lab/<package>:build

# 3. Manually publish to npm using pnpm (transforms workspace:*)
cd packages/<package>
pnpm publish --access public
```

**Note**: Use `pnpm publish` (not `npm publish`) to ensure workspace:\*
dependencies are transformed correctly.

#### Failed JSR Publish

If JSR publish fails but npm succeeds:

```bash
# 1. Verify the package version that failed
cat packages/<package>/deno.json

# 2. Manually publish to JSR using Deno
cd packages/<package>
deno publish
```

**Note**: Ensure you're in a clean git state. Deno workspaces automatically
resolve internal dependencies.

#### Version Mismatch Recovery

If `package.json` and `deno.json` versions get out of sync:

```bash
# 1. Check current versions
cat packages/<package>/package.json | grep version
cat packages/<package>/deno.json | grep version

# 2. Manually align versions (choose the higher version)
# Edit both files to match

# 3. Commit the fix
git add packages/<package>/{package,deno}.json
git commit -m "fix(<package>): align versions"
git push

# 4. Wait for next release cycle to normalize
```

#### Complete Publish Failure

If both npm and JSR fail:

1. **Check workflow logs**: Review GitHub Actions logs for the specific
   error
2. **Verify authentication**: Ensure OIDC Trusted Publishers are configured
   correctly in npm and JSR
3. **Check package validity**: Run local builds and tests
4. **Manual publish**: Follow the steps above for both registries
5. **Update manifest**: Manually update `.release-please-manifest.json` to
   reflect published versions

#### Rollback a Release

If you need to unpublish a bad release:

**npm** (only within 72 hours):

```bash
npm unpublish @m0n0lab/<package>@<version>
```

**JSR** (contact JSR support or publish a patch version):

```bash
# JSR doesn't support unpublishing, so publish a fixed version
git revert <bad-commit>
git commit -m "fix(<package>): revert breaking change"
# Follow normal release process
```

**Important**: Avoid unpublishing if possible. Instead, publish a new
patch/minor version with the fix.
