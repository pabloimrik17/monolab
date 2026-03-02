## 1. Update prettier to v3.8

- [ ] 1.1 Update `prettier` 2.8.8 → 3.8.x in root `package.json`
- [ ] 1.2 Update `prettier-plugin-organize-imports` to latest v3-compatible version
- [ ] 1.3 Update `prettier-plugin-packagejson` to latest version
- [ ] 1.4 Run `pnpm install`
- [ ] 1.5 Run `prettier --write .` to reformat entire codebase
- [ ] 1.6 Verify: `prettier --check .` passes, `eslint` passes, all tests pass
- [ ] 1.7 Commit: `style: reformat with prettier v3`

## 2. Migrate to oxfmt

- [ ] 2.1 Install `oxfmt` as devDependency
- [ ] 2.2 Run `oxfmt --migrate=prettier` to generate `.oxfmtrc.json`
- [ ] 2.3 Edit `.oxfmtrc.json`: remove default values, add `sortImports` config (`internalPattern`, `newlinesBetween: false`, groups with `type`), add `ignorePatterns`, add `.nvmrc` override
- [ ] 2.4 Delete `.prettierrc` and root `.prettierignore`
- [ ] 2.5 Delete all per-project `.prettierignore` files (`apps/*/`, `packages/*/`)
- [ ] 2.6 Remove `prettier`, `prettier-plugin-organize-imports`, `prettier-plugin-packagejson` from root `package.json` devDependencies
- [ ] 2.7 Run `pnpm install`
- [ ] 2.8 Run `oxfmt` to reformat entire codebase
- [ ] 2.9 Verify: `oxfmt --check` passes
- [ ] 2.10 Commit: `style: reformat with oxfmt`

## 3. Update tooling

- [ ] 3.1 Remove `lint:prettier` and `lint:prettier:fix` scripts from all per-project `package.json` files
- [ ] 3.2 Add `lint:oxfmt` (`oxfmt --check`) and `lint:oxfmt:fix` (`oxfmt`) scripts to root `package.json`
- [ ] 3.3 Update `nx.json`: remove `lint:prettier` target defaults, remove `^lint:prettier` from `lint` dependsOn, add `lint:oxfmt` target config with appropriate inputs
- [ ] 3.4 Update `lint-staged.config.ts`: replace `prettier --write --ignore-unknown` with `oxfmt`
- [ ] 3.5 Update `eslint.config.ts`: add `@typescript-eslint/no-unused-vars` rule with `enableAutofixRemoval: { imports: true }`
- [ ] 3.6 Commit: `chore: migrate tooling from prettier to oxfmt`

## 4. Git blame preservation

- [ ] 4.1 Create or update `.git-blame-ignore-revs` with the two reformat commit hashes (prettier v3, oxfmt)
- [ ] 4.2 Commit: `chore: add reformat commits to git-blame-ignore-revs`

## 5. Verification

- [ ] 5.1 `oxfmt --check` passes on entire workspace
- [ ] 5.2 `pnpm nx run-many -t lint:eslint` passes across all projects
- [ ] 5.3 `pnpm nx run-many -t lint:eslint:config-check` passes (no ESLint/formatter conflicts)
- [ ] 5.4 `pnpm nx run-many -t test:unit` passes
- [ ] 5.5 Add unused import to a test file, run `eslint --fix`, confirm it's auto-removed
- [ ] 5.6 Verify `@m0n0lab/*` imports are classified as internal (check sorted output on a file with mixed imports)
- [ ] 5.7 Verify no `.prettierrc`, `.prettierignore`, or per-project formatter scripts remain
- [ ] 5.8 Verify `lint-staged` runs `oxfmt` on commit (test with a small change)
