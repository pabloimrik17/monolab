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
