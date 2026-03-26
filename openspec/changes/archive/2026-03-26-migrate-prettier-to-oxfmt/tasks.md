## 1. Update prettier to v3.8

- [x] 1.1 Update `prettier` 2.8.8 → 3.8.x in root `package.json`
- [x] 1.2 Update `prettier-plugin-organize-imports` to latest v3-compatible version
- [x] 1.3 Update `prettier-plugin-packagejson` to latest version
- [x] 1.4 Run `pnpm install`
- [x] 1.5 Run `prettier --write .` to reformat entire codebase
- [x] 1.6 Verify: `prettier --check .` passes, `eslint` passes, all tests pass
- [x] 1.7 Commit: `style: reformat with prettier v3`

## 2. Migrate to oxfmt

- [x] 2.1 Install `oxfmt` as devDependency
- [x] 2.2 Run `oxfmt --migrate=prettier` to generate `.oxfmtrc.json`
- [x] 2.3 Edit `.oxfmtrc.json`: remove default values, add `sortImports` config (`internalPattern`, `newlinesBetween: false`, groups with `type`), add `ignorePatterns`, add `.nvmrc` override
- [x] 2.4 Delete `.prettierrc` and root `.prettierignore`
- [x] 2.5 Delete all per-project `.prettierignore` files (`apps/*/`, `packages/*/`)
- [x] 2.6 Remove `prettier`, `prettier-plugin-organize-imports`, `prettier-plugin-packagejson` from root `package.json` devDependencies
- [x] 2.7 Run `pnpm install`
- [x] 2.8 Run `oxfmt` to reformat entire codebase
- [x] 2.9 Verify: `oxfmt --check` passes
- [x] 2.10 Commit: `style: reformat with oxfmt`

## 3. Update tooling

- [x] 3.1 Remove `lint:prettier` and `lint:prettier:fix` scripts from all per-project `package.json` files
- [x] 3.2 Add `lint:oxfmt` (`oxfmt --check`) and `lint:oxfmt:fix` (`oxfmt`) scripts to root `package.json`
- [x] 3.3 Update `nx.json`: remove `lint:prettier` target defaults, remove `^lint:prettier` from `lint` dependsOn, add `lint:oxfmt` target config with appropriate inputs
- [x] 3.4 Update `lint-staged.config.ts`: replace `prettier --write --ignore-unknown` with `oxfmt`
- [x] 3.5 Update `eslint.config.ts`: add `@typescript-eslint/no-unused-vars` rule with `enableAutofixRemoval: { imports: true }`
- [x] 3.6 Commit: `chore: migrate tooling from prettier to oxfmt`

## 4. Git blame preservation

- [x] 4.1 Create or update `.git-blame-ignore-revs` with the two reformat commit hashes (prettier v3, oxfmt)
- [x] 4.2 Commit: `chore: add reformat commits to git-blame-ignore-revs`

## 5. Verification

- [x] 5.1 `oxfmt --check` passes on entire workspace
- [x] 5.2 `pnpm nx run-many -t lint:eslint` passes across all projects
- [x] 5.3 `pnpm nx run-many -t lint:eslint:config-check` passes (no ESLint/formatter conflicts)
- [x] 5.4 `pnpm nx run-many -t test:unit` passes
- [x] 5.5 Add unused import to a test file, run `eslint --fix`, confirm it's auto-removed
- [x] 5.6 Verify `@m0n0lab/*` imports are classified as internal (check sorted output on a file with mixed imports)
- [x] 5.7 Verify no `.prettierrc`, `.prettierignore`, or per-project formatter scripts remain
- [x] 5.8 Verify `lint-staged` runs `oxfmt` on commit (test with a small change)
