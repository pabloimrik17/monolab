# Spike 1.1 — `ncu --filter` literal semantics

**Tool**: `npm-check-updates@21.0.2` via `pnpm dlx`.
**Date**: 2026-04-20.
**Decision verified**: Decision 2 (pass accepted names as a space-separated literal list).

## Fixture

`/tmp/ncu-spike/filter/package.json`:

```json
{
  "name": "ncu-spike-filter",
  "private": true,
  "version": "0.0.0",
  "dependencies": {
    "postcss-import": "16.1.0",
    "@types/node": "20.10.0",
    "eslint-plugin-storybook": "0.11.0"
  }
}
```

Names chosen to exercise regex-significant characters: `-` (hyphen, literal in ERE but metacharacter inside `[]`) and `@scope/` form.

## Baseline scan

```
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --jsonUpgraded \
  --packageFile ./package.json
```

Returns three candidates:

```json
{
  "postcss-import": "16.1.1",
  "@types/node": "20.10.8",
  "eslint-plugin-storybook": "0.11.6"
}
```

## Filter run (literal space-separated list)

```
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --upgrade \
  --packageFile ./package.json \
  --filter "postcss-import eslint-plugin-storybook"
```

Stdout (trimmed):

```
Upgrading /private/tmp/ncu-spike/filter/package.json

 eslint-plugin-storybook  0.11.0  →  0.11.6
 postcss-import           16.1.0  →  16.1.1

Run npm install to install new versions.
```

## Diff before/after

```
<     "postcss-import": "16.1.0",
>     "postcss-import": "16.1.1",
<     "eslint-plugin-storybook": "0.11.0"
>     "eslint-plugin-storybook": "0.11.6"
```

`@types/node` was NOT rewritten, confirming that the space-separated list is treated as a literal-name set (not regex/glob).

## Conclusion

- **Literal semantics confirmed** for `--filter "a b c"` in ncu 21.0.2 when all tokens are bare package names.
- Dashes (`-`) are preserved literally; scoped form (`@types/...`) is filtered-out correctly when not listed.
- **No fallback needed.** Decision 2 stands: pass the ACCEPTED names verbatim, space-separated, double-quoted to survive shell word-splitting.

Edge case reminders for the command (not tested here because no package in ACCEPTED will carry them in practice):

- If a name ever contains a literal space, the list becomes ambiguous. ncu package names cannot contain spaces (npm restriction) so this is non-issue.
- If a name contains `*` or `?`, ncu's docs say filter can be treated as a glob. Again non-issue because npm package names cannot contain glob metacharacters.
