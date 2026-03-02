## Why

Prettier 2.8.8 is two major versions behind (current: 3.8.x). Rather than upgrading Prettier, we migrate to [oxfmt](https://oxc.rs/blog/2026-02-24-oxfmt-beta) — a Rust-powered, Prettier-compatible formatter that's 30x faster, has 100% JS/TS conformance, and ships built-in replacements for both prettier plugins we use (`prettier-plugin-packagejson`, `prettier-plugin-organize-imports`).

## What Changes

- **BREAKING** Replace `prettier` with `oxfmt` as the codebase formatter
- **BREAKING** Consolidate per-project formatter targets into a single root-level command. Remove `lint:prettier` / `lint:prettier:fix` scripts from all `package.json` files. Add single root `lint:oxcfmt` / `lint:oxcfmt:fix` Nx targets
- Replace `.prettierrc` + `.prettierignore` with single `.oxfmtrc.json` at root (auto-migrated via `oxfmt --migrate=prettier`, ignore patterns via `ignorePatterns`)
- Delete all per-project `.prettierignore` files (root config covers all patterns)
- Remove `prettier`, `prettier-plugin-organize-imports`, `prettier-plugin-packagejson` deps
- Keep `eslint-config-prettier` and per-project `lint:eslint:config-check` scripts (officially recommended by oxfmt migration guide to prevent ESLint style rules from conflicting with formatter)
- Enable `@typescript-eslint/no-unused-vars` autofix for imports (`enableAutofixRemoval.imports: true`) to replace the unused-import-removal behavior of `prettier-plugin-organize-imports`
- Update `lint-staged.config.ts` to use `oxfmt` instead of `prettier`
- Update `nx.json`: remove per-project `lint:prettier` target defaults, add root-level `lint:oxcfmt` target
- Add formatting commits to `.git-blame-ignore-revs`
- Config: only non-default values — `tabWidth: 4`, `singleAttributePerLine: true`, flat import sorting (`newlinesBetween: false`), `internalPattern: ["@m0n0lab/"]`, `ignorePatterns`
- Migration strategy: update prettier to v3.8 first → reformat → then migrate to oxfmt, to isolate formatting diffs
- Post-migration verification: `oxfmt --check` passes, `eslint` passes (including `config-check`), all tests pass, `eslint --fix` auto-removes unused imports, import sorting produces correct grouping for `@m0n0lab/*` internal packages

## Capabilities

### New Capabilities

- `code-formatting`: formatter config, Nx targets, import sorting, ignore patterns, editor integration

### Modified Capabilities

_(none — no existing formatter spec exists)_

## Impact

- **All projects**: remove per-project `lint:prettier`, `lint:prettier:fix` scripts and `.prettierignore` files. Keep `lint:eslint:config-check` scripts
- **Root**: single `lint:oxcfmt` / `lint:oxcfmt:fix` target, single `.oxfmtrc.json` config
- **Dependencies**: remove 3 packages (`prettier`, `prettier-plugin-organize-imports`, `prettier-plugin-packagejson`), keep `eslint-config-prettier`, add 1 (`oxfmt`)
- **nx.json**: remove `lint:prettier` target defaults, add root-level `lint:oxcfmt` with updated inputs
- **ESLint config**: add `enableAutofixRemoval.imports` to `no-unused-vars` rule
- **lint-staged**: update formatter command
- **CI**: faster formatting step (~30x), target name change, simpler config (root-only)
- **Editor**: switch format-on-save to oxfmt (VS Code, WebStorm, Cursor all supported)
- **Git history**: two reformat commits (prettier v3 upgrade, then oxfmt migration) added to blame-ignore
