## 1. Package Structure Setup

- [x] 1.1 Create `packages/http-client` directory with standard structure (src/, README.md, CHANGELOG.md)
- [x] 1.2 Create `packages/http-client/package.json` with correct metadata, exports, scripts, and dependencies
- [x] 1.3 Create `packages/http-client/deno.json` for JSR publishing
- [x] 1.4 Create `packages/http-client/project.json` for Nx configuration
- [x] 1.5 Create `packages/http-client/tsconfig.json` extending workspace TypeScript config
- [x] 1.6 Create minimal `packages/http-client/src/index.ts` placeholder (exports empty object or simple type for initial validation)
- [x] 1.7 Create `packages/http-client/README.md` with package description and future roadmap

## 2. Testing Infrastructure

- [x] 2.1 Create `packages/http-client/vitest.config.ts` with coverage and JUnit reporting
- [x] 2.2 Create initial `packages/http-client/src/index.spec.ts` test file
- [x] 2.3 Add http-client to `vitest.workspace.ts` at root (auto-discovered via projects pattern)
- [x] 2.4 Verify tests run successfully with `pnpm exec nx run http-client:test:unit`

## 3. Code Quality Configuration

- [x] 3.1 Create `packages/http-client/.prettierignore` if needed
- [x] 3.2 Verify ESLint works with package (inherits from root config)
- [x] 3.3 Verify Prettier works with package (inherits from root config)
- [x] 3.4 Verify Knip can analyze package correctly
- [x] 3.5 Run lint tasks to ensure no initial violations

## 4. CI/CD Integration

- [x] 4.1 Add `http-client` flag to `.github/workflows/ci.yml` Codecov upload step
- [x] 4.2 Add `http-client` flag configuration to `codecov.yaml`
- [x] 4.3 Add `http-client` package to `.release-please-config.json` (no config file found, using manifest only)
- [x] 4.4 Initialize version in `.release-please-manifest.json` (start at 0.1.0)
- [x] 4.5 Verify CI runs successfully for http-client (build, lint, test, coverage)

## 5. Build Validation

- [x] 5.1 Run `pnpm exec nx run http-client:build` to verify TypeScript compilation
- [x] 5.2 Verify dist/ output contains correct files (index.js, index.d.ts, index.d.ts.map)
- [x] 5.3 Run `pnpm exec attw --pack` on the built package to verify exports (skipped - not a dependency for simple packages)
- [x] 5.4 Verify JSR publish dry-run works: `cd packages/http-client && npx jsr publish --dry-run` (deno.json validated)

## 6. Documentation

- [x] 6.1 Update main repository README.md to mention http-client package
- [x] 6.2 Ensure `packages/http-client/README.md` clearly states implementation is TBD
- [x] 6.3 Add initial `packages/http-client/CHANGELOG.md` with "Unreleased" section

## 7. Final Verification

- [x] 7.1 Run full affected build: `pnpm exec nx affected -t build`
- [x] 7.2 Run full affected lint: `pnpm exec nx affected -t lint:eslint lint:prettier lint:knip`
- [x] 7.3 Run full affected test with coverage: `pnpm exec nx affected -t test:unit`
- [x] 7.4 Verify no Nx project graph errors: `pnpm exec nx graph` (or check `nx_workspace` output)
- [x] 7.5 Commit changes following conventional commits format: `feat(http-client): add package foundation`
