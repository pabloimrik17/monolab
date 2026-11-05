# Spec Delta

## REMOVED Requirements

### Requirement: Test Project Organization

**Reason**: It lists a `browser` Vitest project that does not exist, writes coverage to `coverage/unit/` and `coverage/integration/`, which no config does, and sets per-type thresholds that no config declares.
**Migration**: `test-policy` defines the kinds and their Vitest projects ("Each kind has one name everywhere"), one coverage figure per project ("Coverage is one figure per project") and the thresholds ("Coverage thresholds are enforced on the aggregate run", "Thresholds follow a target and only rise").

### Requirement: Test Command Naming Convention

**Reason**: It requires `test:browser` scripts and omits the aggregate and the per-kind `:coverage` and `:changed` variants.
**Migration**: `test-policy` "The aggregate runs every kind and filters mirror it".

### Requirement: UI Mode Support

**Reason**: The capability is being replaced as a whole. `test:ui` stays as a script variant, and its UI behaviour is Vitest's own, not a project requirement.
**Migration**: `test:ui` keeps working where a project defines it. The root `vitest.config.ts` lists every app, package and plugin config.

### Requirement: Type Testing

**Reason**: It scopes type tests to examples (`isOdd`, `useDidMount`) instead of to the projects that need them.
**Migration**: `test-policy` "Type tests guard the public types of libraries".

### Requirement: Browser Testing for React Packages

**Reason**: The browser is a test environment, not a kind of test; `*.browser.test.*` files and `test:browser` scripts are removed.
**Migration**: `test-policy` "The browser is an environment, not a kind". React library tests keep running in headless Chromium through their Vitest config.

### Requirement: Concurrent Test Execution

**Reason**: `maxConcurrency: 10` is a shared Vitest default in `@m0n0lab/vitest-config`, not a behaviour the test policy owns.
**Migration**: None. `@m0n0lab/vitest-config` keeps the setting.

### Requirement: CI Test Sharding

**Reason**: CI never sharded tests. Parallelism comes from the CI job layout and Nx.
**Migration**: `ci-job-layout` (change `ci-nx-cache`).

### Requirement: Workspace Configuration Inheritance

**Reason**: `vitest.workspace.ts` does not exist; each `vitest.config.ts` merges `sharedConfig` from `@m0n0lab/vitest-config`.
**Migration**: None. The mock-cleanup flags stay in `@m0n0lab/vitest-config`.

### Requirement: File Naming Conventions

**Reason**: It includes the removed `*.browser.test.*` suffix and lacks `*.integration-platform.*` and `*.legacy.test.*`.
**Migration**: `test-policy` "Each kind has one name everywhere" and "Legacy tests are marked by name".

### Requirement: Vitest Configuration Migration

**Reason**: Configs use `defineConfig` with `mergeConfig(sharedConfig, ...)`, not `defineProject`; the requirement describes a migration that never happened.
**Migration**: None.
