# Spike 1.3 — `ncu --upgrade` prefix preservation

**Tool**: `npm-check-updates@21.0.2` via `pnpm dlx`.
**Date**: 2026-04-20.
**Decision verified**: the scan-side assumption that ncu preserves `^` / `~` / exact is equally true at apply time, so the command can rely on ncu (no re-writing the prefix manually).

## Fixture

`/tmp/ncu-spike/prefix/package.json`:

```json
{
  "name": "ncu-spike-prefix",
  "private": true,
  "version": "0.0.0",
  "dependencies": {
    "postcss-import": "^16.1.0",
    "eslint-plugin-storybook": "~0.11.0",
    "prettier": "3.4.0"
  }
}
```

Three distinct prefix styles: caret, tilde, exact.

## Run

```
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --upgrade \
  --packageFile ./package.json
```

Stdout (trimmed):

```
Upgrading /private/tmp/ncu-spike/prefix/package.json

 eslint-plugin-storybook  ~0.11.0  →  ~0.11.6
 postcss-import           ^16.1.0  →  ^16.1.1
 prettier                   3.4.0  →    3.4.2

Run npm install to install new versions.
```

## Diff before/after

```
<     "postcss-import": "^16.1.0",
<     "eslint-plugin-storybook": "~0.11.0",
<     "prettier": "3.4.0"
---
>     "postcss-import": "^16.1.1",
>     "eslint-plugin-storybook": "~0.11.6",
>     "prettier": "3.4.2"
```

All three prefix styles preserved. Indentation unchanged; trailing newline unchanged.

## Conclusion

ncu 21.0.2 `--upgrade` is safe to delegate to for prefix preservation. The command does NOT need a second pass to re-apply prefixes — `apply-all` and `pick-subset` can rely on ncu alone for `package.json` manifests.
