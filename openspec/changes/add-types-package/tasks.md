# Implementation Tasks

## 1. Package Structure Setup

- [ ] 1.1 Create `packages/types/` directory
- [ ] 1.2 Create `packages/types/src/` source directory
- [ ] 1.3 Create `packages/types/src/index.ts` entry point
- [ ] 1.4 Create minimal Nx `project.json` without plugins

## 2. Package Configuration

- [ ] 2.1 Create `package.json` with name `@monolab/types`
- [ ] 2.2 Set version to `0.1.0` (initial)
- [ ] 2.3 Configure `type: "module"` for ESM
- [ ] 2.4 Setup `exports` field pointing to `./dist/index.js` and types
- [ ] 2.5 Add `files` array including dist, README, CHANGELOG, LICENSE
- [ ] 2.6 Configure `engines` for Node 22.21.0 and pnpm 10.19.0
- [ ] 2.7 Add `publishConfig` for public access
- [ ] 2.8 Set `sideEffects: false` for tree-shaking

## 3. JSR Publishing Configuration

- [ ] 3.1 Create `jsr.json` with name `@monolab/types`
- [ ] 3.2 Set version to `0.1.0` (matching package.json)
- [ ] 3.3 Set `license: "MIT"`
- [ ] 3.4 Configure `exports` field pointing to `./src/index.ts` (source file for JSR)
- [ ] 3.5 Add `imports` field if package has JSR dependencies (leave empty initially)

## 4. TypeScript Configuration

- [ ] 4.1 Create `tsconfig.json` extending `../ts-configs/tsconfig.node.lib.json`
- [ ] 4.2 Set `outDir: "./dist"` and `rootDir: "./src"`
- [ ] 4.3 Configure `include: ["src/**/*"]`
- [ ] 4.4 Ensure composite build support with declaration maps

## 5. Build Scripts

- [ ] 5.1 Add `build` script: `tsc -b` (composite build)
- [ ] 5.2 Add `typecheck` script: `tsc --noEmit`
- [ ] 5.3 Add standard lint scripts (eslint, knip)
- [ ] 5.4 Add standard test scripts (vitest)

## 6. Documentation

- [ ] 6.1 Create `README.md` with package description
- [ ] 6.2 Document installation and usage examples
- [ ] 6.3 Add contributing guidelines reference
- [ ] 6.4 Create placeholder `CHANGELOG.md`

## 7. Supporting Files

- [ ] 7.1 Create `.prettierignore` (ignore dist/)
- [ ] 7.2 Create `vitest.config.ts` for testing setup
- [ ] 7.3 Add `.eslintcache` to `.gitignore` if needed

## 8. Validation

- [ ] 8.1 Run `pnpm install` to update workspace
- [ ] 8.2 Run `pnpm --filter @monolab/types build` to verify compilation
- [ ] 8.3 Verify `dist/` output contains `.js` and `.d.ts` files
- [ ] 8.4 Run `pnpm --filter @monolab/types typecheck` successfully
- [ ] 8.5 Verify package appears in `pnpm list` output
