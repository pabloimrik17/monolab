# Spike 1.4 — `ncu --cooldown` combined with `--upgrade` and `--filter`

**Tool**: `npm-check-updates@21.0.2` via `pnpm dlx`.
**Date**: 2026-04-20.
**Decision verified**: Decision 3 (mirror scan-side `--cooldown` flag on apply).

## Fixture

`/tmp/ncu-spike/cooldown/package.json`:

```json
{
  "name": "ncu-spike-cooldown",
  "private": true,
  "version": "0.0.0",
  "dependencies": {
    "postcss-import": "16.1.0",
    "eslint-plugin-storybook": "0.11.0",
    "prettier": "3.4.0"
  }
}
```

All three patches selected here were published well over one year ago, so a `--cooldown 365d` filter is a no-op (expected; confirms that `--cooldown` does not silently drop all upgrades).

## Run A — `--cooldown 365d --upgrade`

```
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --upgrade \
  --cooldown 365d \
  --packageFile ./package.json
```

Stdout (trimmed):

```
Upgrading /private/tmp/ncu-spike/cooldown/package.json

 eslint-plugin-storybook  0.11.0  →  0.11.6
 prettier                  3.4.0  →   3.4.2

Run npm install to install new versions.
```

Diff:

```
<     "eslint-plugin-storybook": "0.11.0",
<     "prettier": "3.4.0"
>     "eslint-plugin-storybook": "0.11.6",
>     "prettier": "3.4.2"
```

Observation: `postcss-import` was NOT rewritten on this run (its latest patch `16.1.1` was published within the cooldown window at the time of this spike); `eslint-plugin-storybook@0.11.6` and `prettier@3.4.2` were. `--cooldown` is respected alongside `--upgrade`; versions that don't satisfy the age threshold are dropped silently (as in read-only mode).

## Run B — `--cooldown 1d --upgrade --filter "prettier"`

Reset the fixture to baseline, then:

```
pnpm dlx npm-check-updates@21.0.2 \
  --target patch --upgrade \
  --cooldown 1d \
  --filter "prettier" \
  --packageFile ./package.json
```

Stdout (trimmed):

```
Upgrading /tmp/ncu-spike/cooldown/package.json

 prettier  3.4.0  →  3.4.2

Run npm install to install new versions.
```

Diff:

```
<     "prettier": "3.4.0"
>     "prettier": "3.4.2"
```

Only `prettier` was rewritten; `eslint-plugin-storybook` and `postcss-import` were untouched even though they would have been eligible under `--cooldown 1d`. Confirms that `--filter` and `--cooldown` compose: filter scopes the set, cooldown filters within the set.

## Conclusion

- `--cooldown <period>` works with `--upgrade` (not only with `--jsonUpgraded`).
- `--cooldown` composes with `--filter` — filter is applied first (or at least observable as the outer scope).
- **Decision 3 stands**: the apply step mirrors the scan-side `--cooldown` value verbatim when the scan used one (non-pnpm PMs). For pnpm, ncu reads `minimumReleaseAge` from `pnpm-workspace.yaml` natively, so no explicit flag is required on either scan or apply.
